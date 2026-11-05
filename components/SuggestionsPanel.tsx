'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  formatSuggestion,
  suggestionEntries,
  type AiSuggestions,
  type SuggestionKey,
  type SuggestionValue,
} from '@/lib/ai';

const CONFIDENCE_TONE = { High: 'success', Medium: 'warn', Low: 'danger' } as const;

export default function SuggestionsPanel({
  result,
  current,
  applied,
  onApply,
  onApplyAll,
  onDismiss,
}: {
  result: AiSuggestions;
  current: Partial<Record<SuggestionKey, unknown>>;
  applied: Set<SuggestionKey>;
  onApply: (key: SuggestionKey, value: SuggestionValue) => void;
  onApplyAll: () => void;
  onDismiss?: () => void;
}) {
  const entries = suggestionEntries(result);
  const remaining = entries.filter((e) => !applied.has(e.key)).length;

  return (
    <section
      aria-label="AI suggestions"
      className="rounded-2xl border border-accent/25 bg-accent-soft/50 p-4 animate-rise sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Icon name="sparkle" size={16} className="text-accent" />
        <h2 className="flex-1 text-sm font-semibold">AI suggestions</h2>
        {result.confidence && (
          <Badge tone={CONFIDENCE_TONE[result.confidence]}>{result.confidence} confidence</Badge>
        )}
      </div>
      <p className="mb-3 text-xs text-muted">
        Review before applying. Applied values are flagged as AI-suggested until a staff member
        verifies them.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">The analysis returned no usable fields.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map(({ key, label, value }) => {
            const isApplied = applied.has(key);
            const now = current[key];
            const differs = now != null && now !== '' && now !== value;
            return (
              <li
                key={key}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-faint">
                    {label}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-snug text-ink">
                    {formatSuggestion(key, value)}
                  </p>
                  {differs && !isApplied && (
                    <p className="mt-1 text-xs text-faint">
                      Current: {formatSuggestion(key, now as SuggestionValue)}
                    </p>
                  )}
                </div>
                <Button
                  variant={isApplied ? 'ghost' : 'secondary'}
                  size="sm"
                  disabled={isApplied}
                  aria-label={isApplied ? `${label} applied` : `Apply ${label}`}
                  onClick={() => onApply(key, value)}
                >
                  {isApplied ? <Icon name="check" size={14} /> : 'Apply'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        {remaining > 0 && (
          <Button variant="accent" size="sm" onClick={onApplyAll}>
            Apply all ({remaining})
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </section>
  );
}
