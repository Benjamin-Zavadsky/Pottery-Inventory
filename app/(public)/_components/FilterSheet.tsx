'use client';

import {
  CASES,
  CONDITIONS,
  CULTURES,
  ERA_PRESETS,
  ORIGINALITIES,
  RARITIES,
  REGIONS,
  type Region,
} from '@/lib/constants';
import type { CatalogParams } from '@/lib/catalogParams';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { YearInput } from '@/components/PieceFields';

export default function FilterSheet({
  open,
  onClose,
  params,
  onChange,
  onClear,
  staff,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  params: CatalogParams;
  onChange: (patch: Partial<CatalogParams>) => void;
  onClear: () => void;
  staff: boolean;
  resultCount: number | null;
}) {
  const cultures = CULTURES.filter((c) => !params.region || c.region === params.region);

  const select = (
    id: string,
    label: string,
    value: string,
    options: readonly { value: string; label: string }[],
    onSelect: (v: string) => void,
  ) => (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        className={inputClass}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
  const opts = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter the collection"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClear}>
            Clear all
          </Button>
          <Button className="flex-1" onClick={onClose}>
            {resultCount == null
              ? 'Done'
              : `Show ${resultCount} ${resultCount === 1 ? 'piece' : 'pieces'}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {select('filter-region', 'Region', params.region, opts(REGIONS), (v) =>
            onChange({ region: v as Region | '', culture: '' }),
          )}
          {select(
            'filter-culture',
            'Culture',
            params.culture,
            cultures.map((c) => ({ value: c.id, label: c.culture })),
            (v) => onChange({ culture: v }),
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            Era
          </legend>
          <div className="mb-3 flex flex-wrap gap-2">
            {ERA_PRESETS.map((era) => {
              const active = params.from === era.from && params.to === era.to;
              return (
                <button
                  key={era.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange(active ? { from: null, to: null } : { from: era.from, to: era.to })
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-line-strong'}`}
                >
                  {era.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <YearInput
              key={`from-${params.from}`}
              id="filter-from"
              label="From"
              value={params.from}
              onChange={(v) => onChange({ from: v })}
            />
            <YearInput
              key={`to-${params.to}`}
              id="filter-to"
              label="To"
              value={params.to}
              onChange={(v) => onChange({ to: v })}
            />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          {select('filter-condition', 'Condition', params.condition, opts(CONDITIONS), (v) =>
            onChange({ condition: v }),
          )}
          {select('filter-rarity', 'Rarity', params.rarity, opts(RARITIES), (v) =>
            onChange({ rarity: v }),
          )}
          {select(
            'filter-originality',
            'Originality',
            params.originality,
            opts(ORIGINALITIES),
            (v) => onChange({ originality: v }),
          )}
        </div>

        {select(
          'filter-case',
          'Display case',
          params.caseId,
          [
            { value: 'none', label: 'Unassigned' },
            ...CASES.map((c) => ({ value: c.id, label: c.name })),
          ],
          (v) => onChange({ caseId: v }),
        )}

        {staff && (
          <div className="flex flex-col gap-3 rounded-xl bg-sunken p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Staff</p>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={params.review}
                onChange={(e) => onChange({ review: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              Needs review (unverified AI fields)
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={params.archived}
                onChange={(e) => onChange({ archived: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              Show archived pieces instead
            </label>
          </div>
        )}
      </div>
    </Sheet>
  );
}
