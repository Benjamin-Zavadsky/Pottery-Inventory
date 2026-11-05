'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { CULTURE_BY_ID } from '@/lib/constants';
import {
  fetchPiece,
  fetchPrivate,
  fetchRelated,
  logMove,
  savePrivate,
  updatePiece,
} from '@/lib/queries';
import { photoPairs, removePhotos, splitPairs, type StoredPhoto } from '@/lib/photos';
import { requestAnalysis, saveAnalysis } from '@/lib/aiClient';
import {
  suggestionEntries,
  type AiResult,
  type SuggestionKey,
  type SuggestionValue,
} from '@/lib/ai';
import {
  EMPTY_FORM,
  EMPTY_PRIVATE,
  applySuggestion,
  formFromItem,
  formToRow,
  hasPrivateValues,
  privateFromRow,
  privateToRow,
  validateForm,
  type FormKey,
  type PieceFormValues,
  type PrivateFormValues,
} from '@/lib/pieceForm';
import { changedFields } from '@/lib/diff';
import { errorMessage } from '@/lib/errors';
import { formatPeriod } from '@/lib/period';
import type { PieceSummary, PotteryItem, PotteryPrivate } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PhotoManager from '@/components/PhotoManager';
import PieceCard from '@/components/PieceCard';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import {
  FormSection,
  IdentificationFields,
  LocationFields,
  NarrativeFields,
  PhysicalFields,
  PrivateFields,
} from '@/components/PieceFields';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import Gallery from './Gallery';
import History from './History';
import PieceDetails from './PieceDetails';

type Analysis = { result: AiResult; id?: string; urls: string[]; context?: string };

export default function ItemView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser(supabase);
  const toast = useToast();

  const [item, setItem] = useState<PotteryItem | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [privateRow, setPrivateRow] = useState<PotteryPrivate | null>(null);
  const [related, setRelated] = useState<PieceSummary[]>([]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PieceFormValues>(EMPTY_FORM);
  const [aiFields, setAiFields] = useState<string[]>([]);
  const [pairs, setPairs] = useState<StoredPhoto[]>([]);
  const [privateForm, setPrivateForm] = useState<PrivateFormValues>(EMPTY_PRIVATE);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [applied, setApplied] = useState<Set<SuggestionKey>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [userContext, setUserContext] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchPiece(supabase, id)
      .then((piece) => {
        if (cancelled) return;
        setItem(piece);
        setState(piece ? 'ready' : 'missing');
        if (piece) fetchRelated(supabase, piece).then(setRelated, () => setRelated([]));
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  const itemId = item?.id;
  useEffect(() => {
    if (!user || !itemId) return;
    fetchPrivate(supabase, itemId).then(setPrivateRow, () => setPrivateRow(null));
    supabase
      .from('ai_analyses')
      .select('*')
      .eq('pottery_id', itemId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const row = data?.[0];
        if (row)
          setAnalysis({
            id: row.id,
            urls: row.photo_urls,
            result: { ...row.result, model: row.model },
          });
      });
  }, [user, itemId, supabase]);

  const startEdit = useCallback(() => {
    if (!item) return;
    setForm(formFromItem(item));
    setAiFields(item.ai_fields ?? []);
    setPairs(photoPairs(item));
    setPrivateForm(privateFromRow(privateRow));
    setEditing(true);
  }, [item, privateRow]);

  function onField<K extends FormKey>(key: K, value: PieceFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setAiFields((a) => a.filter((k) => k !== key));
  }

  function apply(keys: { key: SuggestionKey; value: SuggestionValue }[]) {
    if (!editing) startEdit();
    setForm((f) => keys.reduce((acc, { key, value }) => applySuggestion(acc, key, value), f));
    setAiFields((a) => [...new Set([...a, ...keys.map((k) => k.key)])]);
    setApplied((prev) => new Set([...prev, ...keys.map((k) => k.key)]));
  }

  async function recordAnalysis(status: 'applied' | 'dismissed') {
    if (!analysis || !item) return;
    try {
      if (analysis.id) {
        const { error } = await supabase
          .from('ai_analyses')
          .update({ status })
          .eq('id', analysis.id);
        if (error) throw error;
      } else {
        await saveAnalysis(
          supabase,
          item.id,
          analysis.urls,
          analysis.result,
          status,
          analysis.context,
        );
      }
    } catch (err) {
      toast.error(`Could not record the AI analysis: ${errorMessage(err)}`);
    }
  }

  async function analyze() {
    if (!item) return;
    const urls = editing ? pairs.map((p) => p.photo) : item.photos;
    if (!urls.length) {
      toast.error('Add a photo before running the analysis');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await requestAnalysis(supabase, urls, userContext);
      setAnalysis({ result, urls, context: userContext });
      setApplied(new Set());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(`Analysis failed: ${errorMessage(err)}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function cancelEdit() {
    if (!item) return;
    const added = pairs.filter((p) => !item.photos.includes(p.photo));
    if (added.length) {
      removePhotos(
        supabase,
        added.flatMap((p) => [p.photo, p.thumb]),
      ).catch(() => {});
    }
    setEditing(false);
  }

  async function save() {
    if (!item) return;
    const invalid = validateForm(form);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    if (uploading) {
      toast.info('Wait for photo uploads to finish');
      return;
    }
    setSaving(true);
    try {
      const row = formToRow(form);
      const { photos, thumbs } = splitPairs(pairs);
      const updated = await updatePiece(
        supabase,
        item,
        changedFields(item, { ...row, photos, thumbs, ai_fields: aiFields }),
      );
      if (row.case_id && row.case_id !== item.case_id) {
        await logMove(supabase, item.id, item.case_id, row.case_id);
      }
      const priv = privateToRow(item.id, privateForm);
      const before = privateRow ?? privateToRow(item.id, EMPTY_PRIVATE);
      if (
        (privateRow || hasPrivateValues(privateForm)) &&
        JSON.stringify(priv) !== JSON.stringify(before)
      ) {
        await savePrivate(supabase, priv);
        setPrivateRow(priv);
      }
      if (analysis && applied.size) await recordAnalysis('applied');
      const kept = new Set([...photos, ...thumbs]);
      const removed = photoPairs(item)
        .flatMap((p) => [p.photo, p.thumb])
        .filter((u) => !kept.has(u));
      if (removed.length) {
        await removePhotos(supabase, removed).catch(() =>
          toast.error('Saved, but some removed photos could not be deleted from storage'),
        );
      }
      setItem(updated);
      setEditing(false);
      if (applied.size) {
        setAnalysis(null);
        setApplied(new Set());
      }
      toast.success('Changes saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: PotteryItem['status']) {
    if (!item) return;
    if (
      status === 'Archived' &&
      !confirm('Archive this piece? It will be hidden from the public catalog.')
    )
      return;
    try {
      setItem(await updatePiece(supabase, item, { status }));
      toast.success(status === 'Archived' ? 'Piece archived' : 'Piece restored');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function verifyAll() {
    if (!item) return;
    try {
      setItem(await updatePiece(supabase, item, { ai_fields: [] }));
      toast.success('All AI-suggested fields marked as verified');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function deletePermanently() {
    if (!item || !confirm(`Permanently delete ${item.sku}? This cannot be undone.`)) return;
    try {
      const { data, error } = await supabase.from('pottery').delete().eq('id', item.id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Delete was not permitted');
      await removePhotos(supabase, [...item.photos, ...(item.thumbs ?? [])]).catch(() => {});
      toast.success(`${item.sku} deleted`);
      router.push('/');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (state !== 'ready' || !item) {
    return (
      <>
        <AppHeader user={user} back="/" title="Collection" />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          {state === 'loading' ? (
            <div className="grid gap-8 lg:grid-cols-2" role="status" aria-label="Loading piece">
              <Skeleton className="aspect-[4/5]" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-40" />
              </div>
            </div>
          ) : (
            <EmptyState
              icon="alert"
              title={state === 'missing' ? 'Piece not found' : 'Could not load this piece'}
              body={
                state === 'missing'
                  ? 'It may have been removed, or the link is incorrect.'
                  : 'Check your connection and try again.'
              }
              action={
                <Link href="/" className="text-sm text-accent underline underline-offset-2">
                  Back to the collection
                </Link>
              }
            />
          )}
        </main>
      </>
    );
  }

  const staff = !!user;
  const culture = item.culture_id ? CULTURE_BY_ID[item.culture_id] : undefined;
  const period = formatPeriod(item.period_start_year, item.period_end_year) || item.age;
  const pendingAi = (item.ai_fields ?? []).length;

  const headerActions = staff ? (
    editing ? (
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={cancelEdit}>
          Cancel
        </Button>
        <Button size="sm" loading={saving} disabled={uploading} onClick={save}>
          Save
        </Button>
      </div>
    ) : (
      <Button size="sm" onClick={startEdit}>
        <Icon name="edit" size={14} />
        Edit
      </Button>
    )
  ) : null;

  return (
    <>
      <AppHeader
        user={user}
        back="/"
        title={<span className="font-mono">{item.sku}</span>}
        actions={headerActions}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-nav pt-6 sm:px-6 sm:pb-16">
        {analysis && (
          <div className="mb-6">
            <SuggestionsPanel
              result={analysis.result}
              current={editing ? form : formFromItem(item)}
              applied={applied}
              onApply={(key, value) => apply([{ key, value }])}
              onApplyAll={() =>
                apply(suggestionEntries(analysis.result).filter((e) => !applied.has(e.key)))
              }
              onDismiss={() => {
                if (!applied.size) recordAnalysis('dismissed');
                setAnalysis(null);
                setApplied(new Set());
              }}
            />
          </div>
        )}

        {editing ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <FormSection title="Photos">
              <PhotoManager
                pairs={pairs}
                setPairs={setPairs}
                folder={item.sku}
                supabase={supabase}
                onBusyChange={setUploading}
              />
            </FormSection>
            <FormSection title="AI analysis">
              <label htmlFor="ai-context" className="sr-only">
                Context for the AI
              </label>
              <textarea
                id="ai-context"
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                rows={3}
                placeholder="Optional: your observations or known history — Claude will factor them in"
                className={`${inputClass} resize-y`}
              />
              <Button
                variant="secondary"
                className="mt-3 w-full"
                loading={analyzing}
                disabled={uploading}
                onClick={analyze}
              >
                <Icon name="sparkle" size={16} />
                Re-analyze with AI
              </Button>
            </FormSection>
            <FormSection title="Identification">
              <IdentificationFields form={form} onField={onField} aiFields={aiFields} />
            </FormSection>
            <FormSection title="Physical">
              <PhysicalFields form={form} onField={onField} aiFields={aiFields} />
            </FormSection>
            <FormSection title="Location & acquisition">
              <LocationFields form={form} onField={onField} aiFields={aiFields} />
            </FormSection>
            <FormSection title="Description & research">
              <NarrativeFields form={form} onField={onField} aiFields={aiFields} />
            </FormSection>
            <FormSection title="Private">
              <PrivateFields
                value={privateForm}
                onChange={(key, value) => setPrivateForm((p) => ({ ...p, [key]: value }))}
              />
            </FormSection>
            <div
              className="sticky z-10 flex gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur"
              style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
            >
              <Button variant="ghost" className="flex-1" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button type="submit" className="flex-[2]" loading={saving} disabled={uploading}>
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <article className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Gallery photos={photoPairs(item)} alt={item.name} />
            </div>
            <div className="flex flex-col gap-6">
              <header className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {item.status !== 'Active' && <Badge tone="warn">{item.status}</Badge>}
                  {pendingAi > 0 && (
                    <Badge tone="accent">Some details AI-suggested · pending review</Badge>
                  )}
                </div>
                <h1 className="font-display text-3xl leading-tight sm:text-4xl">{item.name}</h1>
                <p className="text-sm text-muted">
                  {[culture?.culture, period].filter(Boolean).join(' · ')}
                  <span className="ml-2 font-mono text-xs text-faint">{item.sku}</span>
                </p>
              </header>

              <div className="flex flex-wrap gap-2 print:hidden">
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Icon name="print" size={14} />
                  Print
                </Button>
                {staff && (
                  <>
                    <Button variant="secondary" size="sm" loading={analyzing} onClick={analyze}>
                      <Icon name="sparkle" size={14} />
                      Analyze with AI
                    </Button>
                    {pendingAi > 0 && (
                      <Button variant="secondary" size="sm" onClick={verifyAll}>
                        <Icon name="check" size={14} />
                        Verify AI fields
                      </Button>
                    )}
                    {item.status === 'Active' ? (
                      <Button variant="ghost" size="sm" onClick={() => setStatus('Archived')}>
                        <Icon name="archive" size={14} />
                        Archive
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setStatus('Active')}>
                          Restore
                        </Button>
                        <Button variant="danger" size="sm" onClick={deletePermanently}>
                          <Icon name="trash" size={14} />
                          Delete permanently
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>

              <PieceDetails item={item} privateRow={staff ? privateRow : null} />
              {staff && user && (
                <History supabase={supabase} recordId={item.id} currentUserId={user.id} />
              )}
            </div>
          </article>
        )}

        {!editing && related.length > 0 && (
          <section
            aria-label="Related pieces"
            className="mt-12 border-t border-line pt-8 print:hidden"
          >
            <h2 className="mb-4 font-display text-xl">
              More from {culture?.culture ?? item.region ?? 'this region'}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
              {related.map((r) => (
                <PieceCard key={r.id} item={r} />
              ))}
            </div>
          </section>
        )}
      </main>
      <BottomNav staff={staff} />
    </>
  );
}
