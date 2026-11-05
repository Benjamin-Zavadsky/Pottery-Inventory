import { CASES, CULTURE_BY_ID } from '@/lib/constants';
import { formatPeriod } from '@/lib/period';
import { formatDateOnly } from '@/lib/dates';
import { regionFor } from '@/lib/taxonomy';
import type { PotteryItem, PotteryPrivate } from '@/lib/types';
import { Badge, RegionChip } from '@/components/ui/Badge';

const money = (n: number | null) =>
  n == null ? null : n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export default function PieceDetails({
  item,
  privateRow,
}: {
  item: PotteryItem;
  privateRow: PotteryPrivate | null;
}) {
  const ai = new Set(item.ai_fields ?? []);
  const region = regionFor(item);
  const culture = item.culture_id ? CULTURE_BY_ID[item.culture_id] : undefined;
  const period = formatPeriod(item.period_start_year, item.period_end_year);

  const row = (label: string, value: string | null | undefined, key?: string) =>
    value ? (
      <div key={label} className="flex flex-col gap-0.5">
        <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
          {label}
          {key && ai.has(key) && (
            <span title="AI-suggested, not yet verified" className="text-accent">
              ✦
            </span>
          )}
        </dt>
        <dd className="text-sm text-ink">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Attribution" className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          Attribution
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {row('Culture', culture?.culture ?? item.tribe_culture, 'culture_id')}
          {region && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-faint">
                Region
              </dt>
              <dd>
                <RegionChip region={region} />
              </dd>
            </div>
          )}
          {row('Period', period || item.age, period ? 'period_start_year' : 'age')}
          {period && item.age && item.age !== period && row('Dating note', item.age, 'age')}
          {row('Place of origin', item.place_of_origin, 'place_of_origin')}
          {culture && row('Tradition detail', item.tribe_culture, 'tribe_culture')}
        </dl>
      </section>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-1">
        {row('Use / function', item.use_function, 'use_function')}
        {row('Color', item.color, 'color')}
        {row('Dimensions', item.dimensions, 'dimensions')}
        {row('Condition', item.condition, 'condition')}
        {row('Rarity', item.rarity, 'rarity')}
        {row('Originality', item.originality, 'originality')}
        {row('Display case', CASES.find((c) => c.id === item.case_id)?.name)}
        {row('Date acquired', item.date_acquired && formatDateOnly(item.date_acquired))}
        {row('Acquired from', item.location_acquired)}
        {row('Comparable museums', item.museums_comparable)}
      </dl>

      {item.provenance && <TextBlock title="Provenance" text={item.provenance} />}
      {item.description && (
        <TextBlock title="Description" text={item.description} ai={ai.has('description')} />
      )}
      {item.research_notes && <TextBlock title="Research notes" text={item.research_notes} />}

      {privateRow && (
        <section
          aria-label="Staff-only details"
          className="rounded-2xl border border-dashed border-line-strong bg-sunken/60 p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              Staff only
            </h2>
            <Badge>Private</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {row('Seller / donor', privateRow.seller_donator)}
            {row('Acquisition cost', money(privateRow.acquisition_cost))}
            {row('Appraised value', money(privateRow.appraised_value))}
            {row(
              'Appraisal date',
              privateRow.appraisal_date && formatDateOnly(privateRow.appraisal_date),
            )}
            {row('Appraiser', privateRow.appraiser_name)}
          </dl>
        </section>
      )}
    </div>
  );
}

function TextBlock({ title, text, ai }: { title: string; text: string; ai?: boolean }) {
  return (
    <section className="border-t border-line pt-5">
      <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        {title}
        {ai && <Badge tone="accent">AI-suggested</Badge>}
      </h2>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">{text}</p>
    </section>
  );
}
