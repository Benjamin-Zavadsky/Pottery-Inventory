'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { updatePiece } from '@/lib/queries';
import { photoPairs } from '@/lib/photos';
import {
  SUGGESTION_FIELDS,
  formatSuggestion,
  suggestionEntries,
  type AiResult,
  type SuggestionKey,
  type SuggestionValue,
} from '@/lib/ai';
import { applySuggestion, formFromItem, formToRow } from '@/lib/pieceForm';
import { changedFields } from '@/lib/diff';
import { errorMessage } from '@/lib/errors';
import type { PotteryItem } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PieceImage } from '@/components/ui/PieceImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type QueueItem = { piece: PotteryItem; analysisId?: string; result?: AiResult };

const LABELS = Object.fromEntries(SUGGESTION_FIELDS.map((f) => [f.key, f.label])) as Record<
  string,
  string
>;

export default function ReviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser(supabase);
  const toast = useToast();
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ReturnType<typeof formFromItem> | null>(null);
  const [applied, setApplied] = useState<Set<SuggestionKey>>(new Set());
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: analyses }, { data: flagged }] = await Promise.all([
        supabase
          .from('ai_analyses')
          .select('id, result, model, pottery:pottery_id(*)')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(200),
        supabase
          .from('pottery')
          .select('*')
          .neq('ai_fields', '{}')
          .eq('status', 'Active')
          .order('sku', { ascending: true })
          .limit(200),
      ]);
      const items: QueueItem[] = [];
      const seen = new Set<string>();
      for (const a of (analyses ?? []) as unknown as {
        id: string;
        result: AiResult;
        model: string;
        pottery: PotteryItem | null;
      }[]) {
        if (!a.pottery || seen.has(a.pottery.id)) continue;
        seen.add(a.pottery.id);
        items.push({ piece: a.pottery, analysisId: a.id, result: { ...a.result, model: a.model } });
      }
      for (const piece of (flagged ?? []) as PotteryItem[]) {
        if (!seen.has(piece.id)) items.push({ piece });
      }
      setQueue(items);
    }
    load().catch(() => setQueue([]));
  }, [supabase]);

  const current = queue?.[index];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset staged edits per piece
    setForm(current ? formFromItem(current.piece) : null);
    setApplied(new Set());
    setVerified(new Set());
  }, [current]);

  const go = useCallback(
    (delta: number) => {
      if (!queue) return;
      setIndex((i) => Math.min(Math.max(i + delta, 0), queue.length - 1));
    },
    [queue],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  function apply(entries: { key: SuggestionKey; value: SuggestionValue }[]) {
    setForm(
      (f) => f && entries.reduce((acc, { key, value }) => applySuggestion(acc, key, value), f),
    );
    setApplied((prev) => new Set([...prev, ...entries.map((e) => e.key)]));
  }

  async function saveAndNext(dismiss = false) {
    if (!current || !form || !queue) return;
    setSaving(true);
    try {
      const { piece } = current;
      // Keys the UI can't show can never be verified — drop them so the piece
      // can leave the queue.
      const aiFields = [...new Set([...(piece.ai_fields ?? []), ...applied])].filter(
        (k) => LABELS[k] && !verified.has(k),
      );
      const updated = await updatePiece(
        supabase,
        piece,
        changedFields(piece, { ...formToRow(form), ai_fields: aiFields }),
      );
      if (current.analysisId && (applied.size || dismiss)) {
        const { error } = await supabase
          .from('ai_analyses')
          .update({ status: applied.size ? 'applied' : 'dismissed' })
          .eq('id', current.analysisId);
        if (error) throw error;
      }
      const done =
        updated.ai_fields.length === 0 && (!current.analysisId || applied.size || dismiss);
      const next = queue.map((q, i) => (i === index ? { piece: updated } : q));
      if (done) {
        next.splice(index, 1);
        setIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
      } else {
        setIndex((i) => Math.min(i + 1, next.length - 1));
      }
      setQueue(next);
      toast.success(`${piece.sku} saved`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const flagged = current
    ? [...new Set([...(current.piece.ai_fields ?? []), ...applied])].filter((k) => LABELS[k])
    : [];

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-nav pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Review queue</h1>
            <p className="mt-1 text-sm text-muted">
              Pending AI suggestions and unverified AI fields. Use ← → to move between pieces.
            </p>
          </div>
          {queue && queue.length > 0 && (
            <p className="shrink-0 text-sm tabular-nums text-muted">
              {index + 1} / {queue.length}
            </p>
          )}
        </div>

        {!queue ? (
          <Skeleton className="h-96" />
        ) : !current || !form ? (
          <EmptyState
            icon="check"
            title="All caught up"
            body="Nothing is waiting for review."
            action={
              <Link href="/add" className="text-sm text-accent underline underline-offset-2">
                Add a piece
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-5 animate-fade-in" key={current.piece.id}>
            <div className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
              <PieceImage
                src={photoPairs(current.piece)[0]?.thumb}
                fallbackSrc={current.piece.photos?.[0]}
                alt={current.piece.name}
                eager
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-faint">{current.piece.sku}</p>
                <h2 className="font-display text-xl leading-tight">{form.name}</h2>
                <Link
                  href={`/item/${current.piece.sku}`}
                  className="mt-1 inline-block text-xs text-accent underline underline-offset-2"
                >
                  Open full record
                </Link>
              </div>
            </div>

            {current.result && (
              <SuggestionsPanel
                result={current.result}
                current={formFromItem(current.piece)}
                applied={applied}
                onApply={(key, value) => apply([{ key, value }])}
                onApplyAll={() =>
                  apply(
                    suggestionEntries(current.result as AiResult).filter(
                      (e) => !applied.has(e.key),
                    ),
                  )
                }
              />
            )}

            {flagged.length > 0 && (
              <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                <h2 className="mb-1 text-sm font-semibold">AI-suggested fields to verify</h2>
                <p className="mb-3 text-xs text-muted">
                  Tick each value you’ve checked against the piece. Edit anything wrong from the
                  full record.
                </p>
                <ul className="divide-y divide-line">
                  {flagged.map((key) => (
                    <li key={key} className="flex items-start gap-3 py-2.5">
                      <input
                        id={`verify-${key}`}
                        type="checkbox"
                        checked={verified.has(key)}
                        onChange={(e) =>
                          setVerified((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(key);
                            else next.delete(key);
                            return next;
                          })
                        }
                        className="mt-1 h-4 w-4 accent-accent"
                      />
                      <label htmlFor={`verify-${key}`} className="min-w-0 flex-1">
                        <span className="block text-[10px] uppercase tracking-wider text-faint">
                          {LABELS[key]}
                        </span>
                        <span className="block whitespace-pre-wrap text-sm">
                          {formatSuggestion(
                            key as SuggestionKey,
                            form[key as keyof typeof form] as SuggestionValue,
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setVerified(new Set(flagged))}
                >
                  <Icon name="check" size={14} />
                  Verify all
                </Button>
              </section>
            )}

            <div
              className="sticky z-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur"
              style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
            >
              <Button variant="ghost" disabled={index === 0} onClick={() => go(-1)}>
                Previous
              </Button>
              <Button variant="ghost" disabled={index >= queue.length - 1} onClick={() => go(1)}>
                Skip
              </Button>
              {current.analysisId && !applied.size && (
                <Button variant="secondary" loading={saving} onClick={() => saveAndNext(true)}>
                  Dismiss AI
                </Button>
              )}
              <Button className="flex-1" loading={saving} onClick={() => saveAndNext()}>
                Save & next
              </Button>
            </div>
          </div>
        )}
      </main>
      <BottomNav staff />
    </>
  );
}
