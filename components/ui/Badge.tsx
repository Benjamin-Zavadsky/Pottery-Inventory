import { REGION_COLORS, type Region } from '@/lib/constants';

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft',
  accent: 'bg-accent-soft text-accent-strong',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function RegionChip({ region, label }: { region: Region; label?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: REGION_COLORS[region] }}
      />
      <span className="truncate">{label ?? region}</span>
    </span>
  );
}
