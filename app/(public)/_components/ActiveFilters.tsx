import { CASES, CULTURE_BY_ID } from '@/lib/constants';
import { formatYear } from '@/lib/period';
import type { CatalogParams } from '@/lib/catalogParams';
import { Icon } from '@/components/ui/Icon';

export default function ActiveFilters({
  params,
  onChange,
  onClear,
}: {
  params: CatalogParams;
  onChange: (patch: Partial<CatalogParams>) => void;
  onClear: () => void;
}) {
  const chips: { label: string; patch: Partial<CatalogParams> }[] = [];
  if (params.region) chips.push({ label: params.region, patch: { region: '', culture: '' } });
  if (params.culture)
    chips.push({ label: CULTURE_BY_ID[params.culture].culture, patch: { culture: '' } });
  if (params.from != null || params.to != null) {
    const label =
      params.from != null && params.to != null
        ? `${formatYear(params.from)} – ${formatYear(params.to)}`
        : params.from != null
          ? `After ${formatYear(params.from)}`
          : `Before ${formatYear(params.to as number)}`;
    chips.push({ label, patch: { from: null, to: null } });
  }
  if (params.condition) chips.push({ label: params.condition, patch: { condition: '' } });
  if (params.rarity) chips.push({ label: params.rarity, patch: { rarity: '' } });
  if (params.originality) chips.push({ label: params.originality, patch: { originality: '' } });
  if (params.caseId)
    chips.push({
      label:
        params.caseId === 'none'
          ? 'Unassigned'
          : (CASES.find((c) => c.id === params.caseId)?.name ?? params.caseId),
      patch: { caseId: '' },
    });
  if (params.review) chips.push({ label: 'Needs review', patch: { review: false } });
  if (params.archived) chips.push({ label: 'Archived', patch: { archived: false } });

  if (!chips.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          aria-label={`Remove filter ${chip.label}`}
          onClick={() => onChange(chip.patch)}
          className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs text-white"
        >
          {chip.label}
          <Icon name="close" size={12} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="px-2 py-1.5 text-xs text-muted underline underline-offset-2 hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}
