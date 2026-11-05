import Link from 'next/link';
import { RegionChip, Badge } from '@/components/ui/Badge';
import { PieceImage } from '@/components/ui/PieceImage';
import { Icon } from '@/components/ui/Icon';
import { coverThumb } from '@/lib/photos';
import { cultureFor, regionFor } from '@/lib/taxonomy';
import { formatPeriod } from '@/lib/period';
import type { PieceSummary } from '@/lib/types';

export default function PieceCard({
  item,
  showReview,
  selectable,
  selected,
  onToggle,
}: {
  item: PieceSummary;
  showReview?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const region = regionFor(item);
  const culture = cultureFor(item);
  const period = formatPeriod(item.period_start_year, item.period_end_year) || item.age;

  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-sunken">
        <PieceImage
          src={coverThumb(item)}
          fallbackSrc={item.photos?.[0]}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {showReview && item.ai_fields?.length > 0 && (
          <Badge tone="warn" className="absolute left-2 top-2 shadow-sm">
            Needs review
          </Badge>
        )}
        {selectable && (
          <span
            aria-hidden="true"
            className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? 'border-accent bg-accent text-white' : 'border-white bg-black/20'}`}
          >
            {selected && <Icon name="check" size={14} strokeWidth={3} />}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <h2 className="line-clamp-2 min-h-[2.5em] font-display text-[15px] leading-tight sm:text-base">
          {item.name}
        </h2>
        <div className="flex items-center justify-between gap-2">
          {region ? (
            <RegionChip region={region} label={culture?.culture ?? region} />
          ) : (
            <span className="text-[11px] text-faint">Unclassified</span>
          )}
          <span className="shrink-0 font-mono text-[10px] text-faint">{item.sku}</span>
        </div>
        {period && <p className="truncate text-[11px] text-muted">{period}</p>}
      </div>
    </>
  );

  const className = `group flex flex-col overflow-hidden rounded-2xl border bg-surface text-left transition-all animate-rise hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'}`;

  if (selectable) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Select ${item.name}`}
        onClick={() => onToggle?.(item.id)}
        className={className}
      >
        {body}
      </button>
    );
  }
  return (
    <Link href={`/item/${item.sku}`} className={className}>
      {body}
    </Link>
  );
}
