'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { CASES, CULTURE_BY_ID } from '@/lib/constants';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import { logMove, savePrivate } from '@/lib/queries';
import { removePhotos, splitPairs, type StoredPhoto } from '@/lib/photos';
import { requestAnalysis, saveAnalysis, trackInBackground } from '@/lib/aiClient';
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
  formToRow,
  hasPrivateValues,
  privateToRow,
  validateForm,
  type FormKey,
  type PieceFormValues,
  type PrivateFormValues,
} from '@/lib/pieceForm';
import { errorMessage } from '@/lib/errors';
import { formatPeriod } from '@/lib/period';
import type { PotteryItem } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PhotoManager from '@/components/PhotoManager';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import {
  FormSection,
  IdentificationFields,
  LocationFields,
  NarrativeFields,
  PhysicalFields,
  PrivateFields,
} from '@/components/PieceFields';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';
import { Icon, Spinner } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

const DRAFT_KEY = 'pottery-intake-draft-v1';
const STEPS = ['Photos', 'Details', 'Location', 'Review'] as const;

type Analysis = { result: AiResult; urls: string[] };
type Draft = {
  folder: string;
  step: number;
  pairs: StoredPhoto[];
  form: PieceFormValues;
  privateForm: PrivateFormValues;
  aiFields: string[];
  context: string;
  analysis: Analysis | null;
  applied: SuggestionKey[];
};

function newDraft(
  form: Partial<PieceFormValues> = {},
  priv: Partial<PrivateFormValues> = {},
): Draft {
  return {
    folder: `intake/${crypto.randomUUID()}`,
    step: 0,
    pairs: [],
    form: { ...EMPTY_FORM, ...form },
    privateForm: { ...EMPTY_PRIVATE, ...priv },
    aiFields: [],
    context: '',
    analysis: null,
    applied: [],
  };
}

function isEmptyDraft(d: Draft) {
  return !d.pairs.length && !d.form.name && !d.analysis;
}

export default function AddPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser(supabase);
  const router = useRouter();
  const toast = useToast();

  const [initial] = useState<Draft>(() => loadDraft<Draft>(DRAFT_KEY) ?? newDraft());
  const [folder, setFolder] = useState(initial.folder);
  const [step, setStep] = useState(initial.step);
  const [pairs, setPairs] = useState<StoredPhoto[]>(initial.pairs);
  const [form, setForm] = useState<PieceFormValues>(initial.form);
  const [privateForm, setPrivateForm] = useState<PrivateFormValues>(initial.privateForm);
  const [aiFields, setAiFields] = useState<string[]>(initial.aiFields);
  const [context, setContext] = useState(initial.context);
  const [analysis, setAnalysis] = useState<Analysis | null>(initial.analysis);
  const [applied, setApplied] = useState<Set<SuggestionKey>>(new Set(initial.applied));
  const [aiState, setAiState] = useState<'idle' | 'running' | 'error'>('idle');
  const [aiError, setAiError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const aiTask = useRef<Promise<AiResult> | null>(null);
  const announced = useRef(false);

  useEffect(() => {
    if (!announced.current && !isEmptyDraft(initial)) toast.info('Restored your unsaved piece');
    announced.current = true;
  }, [initial, toast]);

  useEffect(() => {
    saveDraft(DRAFT_KEY, {
      folder,
      step,
      pairs,
      form,
      privateForm,
      aiFields,
      context,
      analysis,
      applied: [...applied],
    } satisfies Draft);
  }, [folder, step, pairs, form, privateForm, aiFields, context, analysis, applied]);

  function onField<K extends FormKey>(key: K, value: PieceFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setAiFields((a) => a.filter((k) => k !== key));
  }

  function apply(entries: { key: SuggestionKey; value: SuggestionValue }[]) {
    setForm((f) => entries.reduce((acc, { key, value }) => applySuggestion(acc, key, value), f));
    setAiFields((a) => [...new Set([...a, ...entries.map((e) => e.key)])]);
    setApplied((prev) => new Set([...prev, ...entries.map((e) => e.key)]));
  }

  function startAnalysis() {
    const urls = pairs.map((p) => p.photo);
    const task = requestAnalysis(supabase, urls, context);
    aiTask.current = task;
    setAiState('running');
    setAnalysis(null);
    setApplied(new Set());
    task.then(
      (result) => {
        if (aiTask.current !== task) return;
        aiTask.current = null;
        setAnalysis({ result, urls });
        setAiState('idle');
      },
      (err) => {
        if (aiTask.current !== task) return;
        aiTask.current = null;
        setAiError(errorMessage(err));
        setAiState('error');
      },
    );
  }

  function goTo(next: number) {
    if (step === 0 && next > 0 && pairs.length && !analysis && aiState === 'idle') {
      startAnalysis();
    }
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function reset(carry: Draft) {
    aiTask.current = null;
    setFolder(carry.folder);
    setStep(0);
    setPairs([]);
    setForm(carry.form);
    setPrivateForm(carry.privateForm);
    setAiFields([]);
    setContext('');
    setAnalysis(null);
    setApplied(new Set());
    setAiState('idle');
    window.scrollTo({ top: 0 });
  }

  async function discard() {
    if (!confirm('Discard this piece and its uploaded photos?')) return;
    removePhotos(
      supabase,
      pairs.flatMap((p) => [p.photo, p.thumb]),
    ).catch(() => {});
    clearDraft(DRAFT_KEY);
    reset(newDraft());
  }

  async function save(addNext: boolean) {
    const invalid = validateForm(form);
    if (invalid) {
      toast.error(invalid);
      setStep(1);
      return;
    }
    if (uploading) {
      toast.info('Wait for photo uploads to finish');
      return;
    }
    setSaving(true);
    let piece: PotteryItem;
    const { photos, thumbs } = splitPairs(pairs);
    try {
      const { data, error } = await supabase
        .from('pottery')
        .insert({ ...formToRow(form), photos, thumbs, ai_fields: aiFields, status: 'Active' })
        .select()
        .single();
      if (error) throw error;
      piece = data as PotteryItem;
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
      return;
    }

    // The piece now exists — follow-up failures are reported but never block,
    // so a retry can't create a duplicate.
    const problems: string[] = [];
    const attempt = async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err) {
        problems.push(`${label}: ${errorMessage(err)}`);
      }
    };
    if (hasPrivateValues(privateForm)) {
      await attempt('private fields', () =>
        savePrivate(supabase, privateToRow(piece.id, privateForm)),
      );
    }
    if (piece.case_id) {
      await attempt('case history', () =>
        logMove(supabase, piece.id, null, piece.case_id as string),
      );
    }
    if (analysis) {
      await attempt('AI record', () =>
        saveAnalysis(
          supabase,
          piece.id,
          analysis.urls,
          analysis.result,
          applied.size ? 'applied' : 'pending',
          context,
        ),
      );
    } else if (aiTask.current) {
      void trackInBackground(
        aiTask.current.then((result) =>
          saveAnalysis(supabase, piece.id, photos, result, 'pending', context),
        ),
      );
    }

    clearDraft(DRAFT_KEY);
    setSaving(false);
    if (problems.length) toast.error(`Saved ${piece.sku}, but: ${problems.join('; ')}`);
    else
      toast.success(
        `Saved ${piece.sku}${aiTask.current && !analysis ? ' — AI results will appear in Review' : ''}`,
      );

    if (addNext) {
      reset(
        newDraft(
          {
            case_id: form.case_id,
            date_acquired: form.date_acquired,
            location_acquired: form.location_acquired,
          },
          { seller_donator: privateForm.seller_donator },
        ),
      );
    } else {
      router.push(`/item/${piece.sku}`);
    }
  }

  const canContinue = step !== 0 || (pairs.length > 0 && !uploading);

  return (
    <>
      <AppHeader
        user={user}
        back="/"
        title="Add a piece"
        actions={
          <Button variant="ghost" size="sm" onClick={discard}>
            Discard
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-nav pt-4 sm:px-6 sm:pb-16 sm:pt-8">
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === step ? 'step' : undefined}
                className="flex w-full flex-col gap-1.5 text-left"
              >
                <span
                  className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-line'}`}
                />
                <span
                  className={`text-[11px] font-medium ${i === step ? 'text-ink' : 'text-faint'}`}
                >
                  {i + 1}. {label}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-5 animate-fade-in" key={step}>
          {step === 0 && (
            <>
              <FormSection title="Photograph the piece">
                <p className="-mt-2 mb-4 text-sm text-muted">
                  Front, back, sides, base and any marks or damage. 5+ angles give the AI the most
                  to work with.
                </p>
                <PhotoManager
                  pairs={pairs}
                  setPairs={setPairs}
                  folder={folder}
                  supabase={supabase}
                  onBusyChange={setUploading}
                  onRemove={(p) => removePhotos(supabase, [p.photo, p.thumb]).catch(() => {})}
                />
              </FormSection>
              <FormSection title="Anything you already know?">
                <label htmlFor="intake-context" className="sr-only">
                  Context for the AI
                </label>
                <textarea
                  id="intake-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                  placeholder="Optional — where it came from, prior attributions, markings… The AI will factor this in."
                  className={`${inputClass} resize-y`}
                />
              </FormSection>
            </>
          )}

          {step === 1 && (
            <>
              <AiStatus
                state={aiState}
                error={aiError}
                photoCount={pairs.length}
                hasAnalysis={!!analysis}
                onRun={startAnalysis}
              />
              {analysis && (
                <SuggestionsPanel
                  result={analysis.result}
                  current={form}
                  applied={applied}
                  onApply={(key, value) => apply([{ key, value }])}
                  onApplyAll={() =>
                    apply(suggestionEntries(analysis.result).filter((e) => !applied.has(e.key)))
                  }
                />
              )}
              <FormSection title="Identification">
                <IdentificationFields form={form} onField={onField} aiFields={aiFields} />
              </FormSection>
              <FormSection title="Physical">
                <PhysicalFields form={form} onField={onField} aiFields={aiFields} />
              </FormSection>
              <FormSection title="Description & research">
                <NarrativeFields form={form} onField={onField} aiFields={aiFields} />
              </FormSection>
            </>
          )}

          {step === 2 && (
            <>
              <FormSection title="Location & acquisition">
                <LocationFields form={form} onField={onField} aiFields={aiFields} />
              </FormSection>
              <FormSection title="Private">
                <PrivateFields
                  value={privateForm}
                  onChange={(key, value) => setPrivateForm((p) => ({ ...p, [key]: value }))}
                />
              </FormSection>
            </>
          )}

          {step === 3 && (
            <ReviewSummary
              form={form}
              pairs={pairs}
              aiPending={aiState === 'running'}
              aiFieldCount={aiFields.length}
              onEdit={goTo}
            />
          )}
        </div>

        <div
          className="sticky z-10 mt-6 flex gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur"
          style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
        >
          {step > 0 && (
            <Button variant="ghost" onClick={() => goTo(step - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" disabled={!canContinue} onClick={() => goTo(step + 1)}>
              {step === 0 && uploading ? 'Uploading…' : 'Continue'}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                loading={saving}
                onClick={() => save(false)}
              >
                Save
              </Button>
              <Button
                variant="accent"
                className="flex-[1.4]"
                loading={saving}
                onClick={() => save(true)}
              >
                Save & add next
              </Button>
            </>
          )}
        </div>
        {step === STEPS.length - 1 && (
          <p className="mt-2 text-center text-xs text-faint">
            “Save & add next” keeps the case, acquisition date, source and seller for the next
            piece.
          </p>
        )}
      </main>
      <BottomNav staff />
    </>
  );
}

function AiStatus({
  state,
  error,
  photoCount,
  hasAnalysis,
  onRun,
}: {
  state: 'idle' | 'running' | 'error';
  error: string;
  photoCount: number;
  hasAnalysis: boolean;
  onRun: () => void;
}) {
  if (state === 'running') {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent-soft/50 p-4 text-sm"
      >
        <Spinner className="text-accent" />
        <span>
          Analyzing {photoCount} {photoCount === 1 ? 'photo' : 'photos'}… keep going — suggestions
          will appear here, or in Review if you save first.
        </span>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft p-4 text-sm text-danger"
      >
        <Icon name="alert" />
        <span className="flex-1">AI analysis failed: {error}</span>
        <Button size="sm" variant="secondary" onClick={onRun}>
          Try again
        </Button>
      </div>
    );
  }
  if (!hasAnalysis && photoCount > 0) {
    return (
      <Button variant="secondary" onClick={onRun}>
        <Icon name="sparkle" size={16} />
        Analyze {photoCount} {photoCount === 1 ? 'photo' : 'photos'} with AI
      </Button>
    );
  }
  return null;
}

function ReviewSummary({
  form,
  pairs,
  aiPending,
  aiFieldCount,
  onEdit,
}: {
  form: PieceFormValues;
  pairs: StoredPhoto[];
  aiPending: boolean;
  aiFieldCount: number;
  onEdit: (step: number) => void;
}) {
  const rows: [string, string, number][] = [
    ['Name', form.name, 1],
    ['Culture', CULTURE_BY_ID[form.culture_id]?.culture ?? '', 1],
    ['Period', formatPeriod(form.period_start_year, form.period_end_year) || form.age, 1],
    ['Origin', form.place_of_origin, 1],
    ['Condition', form.condition, 1],
    ['Case', CASES.find((c) => c.id === form.case_id)?.name ?? '', 2],
    ['Provenance', form.provenance, 2],
  ];
  return (
    <FormSection title="Review">
      <div className="-mx-1 mb-4 overflow-x-auto px-1">
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {pairs.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.photo}
              src={p.thumb}
              alt={`Photo ${i + 1}`}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ))}
        </div>
      </div>
      <dl className="divide-y divide-line">
        {rows.map(([label, value, target]) => (
          <div key={label} className="flex items-center gap-3 py-2.5">
            <dt className="w-24 shrink-0 text-xs uppercase tracking-wider text-faint">{label}</dt>
            <dd className={`min-w-0 flex-1 truncate text-sm ${value ? 'text-ink' : 'text-faint'}`}>
              {value || 'Not set'}
            </dd>
            <button
              type="button"
              aria-label={`Edit ${label}`}
              onClick={() => onEdit(target)}
              className="text-xs text-accent underline underline-offset-2"
            >
              Edit
            </button>
          </div>
        ))}
      </dl>
      {(aiPending || aiFieldCount > 0) && (
        <p className="mt-4 rounded-xl bg-accent-soft/60 p-3 text-xs text-accent-strong">
          {aiPending
            ? 'The AI is still running. You can save now — its suggestions will wait in Review.'
            : `${aiFieldCount} AI-suggested ${aiFieldCount === 1 ? 'field' : 'fields'} will be flagged for verification.`}
        </p>
      )}
    </FormSection>
  );
}
