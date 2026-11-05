'use client';

import { useState } from 'react';
import {
  CASES,
  CONDITIONS,
  CULTURES,
  CULTURE_BY_ID,
  ORIGINALITIES,
  RARITIES,
  REGIONS,
} from '@/lib/constants';
import type { FormKey, PieceFormValues, PrivateFormValues } from '@/lib/pieceForm';
import { Field, inputClass } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';

type FieldProps = {
  form: PieceFormValues;
  onField: <K extends FormKey>(key: K, value: PieceFormValues[K]) => void;
  aiFields?: string[];
  idPrefix?: string;
};

function AiMark({ show }: { show: boolean }) {
  return show ? (
    <Badge tone="accent" className="!px-1.5 !py-0 normal-case tracking-normal">
      AI
    </Badge>
  ) : null;
}

function makeText({ form, onField, aiFields = [], idPrefix = 'f' }: FieldProps) {
  return function renderText(
    key: FormKey,
    label: string,
    opts: {
      required?: boolean;
      placeholder?: string;
      multiline?: boolean;
      hint?: string;
      className?: string;
    } = {},
  ) {
    const id = `${idPrefix}-${key}`;
    const common = {
      id,
      value: (form[key] as string) ?? '',
      placeholder: opts.placeholder,
      className: inputClass + (opts.multiline ? ' resize-y min-h-24' : ''),
    };
    return (
      <Field
        label={label}
        htmlFor={id}
        required={opts.required}
        hint={opts.hint}
        className={opts.className}
        badge={<AiMark show={aiFields.includes(key)} />}
      >
        {opts.multiline ? (
          <textarea {...common} rows={4} onChange={(e) => onField(key, e.target.value)} />
        ) : (
          <input
            {...common}
            required={opts.required}
            onChange={(e) => onField(key, e.target.value)}
          />
        )}
      </Field>
    );
  };
}

function makeSelect({ form, onField, aiFields = [], idPrefix = 'f' }: FieldProps) {
  return function renderSelect(
    key: FormKey,
    label: string,
    options: readonly { value: string; label: string }[],
    empty = '—',
  ) {
    const id = `${idPrefix}-${key}`;
    return (
      <Field label={label} htmlFor={id} badge={<AiMark show={aiFields.includes(key)} />}>
        <select
          id={id}
          value={(form[key] as string) ?? ''}
          onChange={(e) => onField(key, e.target.value)}
          className={inputClass}
        >
          <option value="">{empty}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    );
  };
}

const asOptions = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));

export function YearInput({
  id,
  label,
  value,
  onChange,
  ai,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  ai?: boolean;
}) {
  const [era, setEra] = useState<'BCE' | 'CE'>(value != null && value < 0 ? 'BCE' : 'CE');
  const emit = (abs: string, e: 'BCE' | 'CE') => {
    const n = Number.parseInt(abs, 10);
    onChange(Number.isFinite(n) ? (e === 'BCE' ? -Math.abs(n) : Math.abs(n)) : null);
  };
  return (
    <Field label={label} htmlFor={id} badge={<AiMark show={!!ai} />}>
      <div className="flex gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={value == null ? '' : Math.abs(value)}
          onChange={(e) => emit(e.target.value, era)}
          className={inputClass}
        />
        <select
          aria-label={`${label} era`}
          value={era}
          onChange={(e) => {
            const next = e.target.value as 'BCE' | 'CE';
            setEra(next);
            if (value != null) emit(String(Math.abs(value)), next);
          }}
          className={`${inputClass} !w-24`}
        >
          <option value="CE">CE</option>
          <option value="BCE">BCE</option>
        </select>
      </div>
    </Field>
  );
}

export function CultureSelect({ form, onField, aiFields = [], idPrefix = 'f' }: FieldProps) {
  const id = `${idPrefix}-culture_id`;
  return (
    <Field
      label="Culture"
      htmlFor={id}
      badge={<AiMark show={aiFields.includes('culture_id')} />}
      hint="Choose from the canonical list so the piece appears on the map, timeline and filters"
    >
      <select
        id={id}
        value={form.culture_id}
        onChange={(e) => {
          onField('culture_id', e.target.value);
          const culture = CULTURE_BY_ID[e.target.value];
          if (culture) onField('region', culture.region);
        }}
        className={inputClass}
      >
        <option value="">— Unclassified —</option>
        {REGIONS.map((region) => (
          <optgroup key={region} label={region}>
            {CULTURES.filter((c) => c.region === region).map((c) => (
              <option key={c.id} value={c.id}>
                {c.culture}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  );
}

export function IdentificationFields(props: FieldProps) {
  const text = makeText(props);
  const select = makeSelect(props);
  const { form, onField, aiFields = [], idPrefix = 'f' } = props;
  return (
    <div className="flex flex-col gap-4">
      {text('name', 'Name', { required: true, placeholder: 'e.g. Ramey Incised jar' })}
      <div className="grid gap-4 sm:grid-cols-2">
        <CultureSelect {...props} />
        {select('region', 'Region', asOptions(REGIONS))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <YearInput
          id={`${idPrefix}-period_start_year`}
          label="Period start"
          value={form.period_start_year}
          onChange={(v) => onField('period_start_year', v)}
          ai={aiFields.includes('period_start_year')}
        />
        <YearInput
          id={`${idPrefix}-period_end_year`}
          label="Period end"
          value={form.period_end_year}
          onChange={(v) => onField('period_end_year', v)}
          ai={aiFields.includes('period_end_year')}
        />
      </div>
      {text('age', 'Age / Period (as written)', {
        placeholder: 'e.g. Mississippian, 1200–1400 CE',
      })}
      {text('place_of_origin', 'Place of origin')}
      {text('tribe_culture', 'Tradition / phase detail', {
        placeholder: 'e.g. Moundville phase',
      })}
    </div>
  );
}

export function PhysicalFields(props: FieldProps) {
  const text = makeText(props);
  const select = makeSelect(props);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {text('color', 'Color')}
        {text('dimensions', 'Dimensions', { placeholder: 'e.g. 8"H × 5"W (measured)' })}
      </div>
      {text('use_function', 'Use / function', { placeholder: 'e.g. Ceremonial' })}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {select('condition', 'Condition', asOptions(CONDITIONS))}
        {select('rarity', 'Rarity', asOptions(RARITIES))}
        {select('originality', 'Originality', asOptions(ORIGINALITIES))}
      </div>
    </div>
  );
}

export function NarrativeFields(props: FieldProps) {
  const text = makeText(props);
  return (
    <div className="flex flex-col gap-4">
      {text('description', 'Description', { multiline: true })}
      {text('research_notes', 'Research notes', { multiline: true })}
      {text('museums_comparable', 'Museums with comparable pieces')}
    </div>
  );
}

export function LocationFields(props: FieldProps) {
  const text = makeText(props);
  const select = makeSelect(props);
  const { form, onField, idPrefix = 'f' } = props;
  return (
    <div className="flex flex-col gap-4">
      {select(
        'case_id',
        'Display case',
        CASES.map((c) => ({ value: c.id, label: c.name })),
        '— Unassigned —',
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date acquired" htmlFor={`${idPrefix}-date_acquired`}>
          <input
            id={`${idPrefix}-date_acquired`}
            type="date"
            value={form.date_acquired}
            onChange={(e) => onField('date_acquired', e.target.value)}
            className={inputClass}
          />
        </Field>
        {text('location_acquired', 'Acquired from (place)')}
      </div>
      {text('provenance', 'Provenance', {
        multiline: true,
        hint: 'Chain of ownership with dates where known (e.g. "Private collection, Ohio, before 1970")',
      })}
    </div>
  );
}

export function PrivateFields({
  value,
  onChange,
  idPrefix = 'p',
}: {
  value: PrivateFormValues;
  onChange: (key: keyof PrivateFormValues, value: string) => void;
  idPrefix?: string;
}) {
  const input = (key: keyof PrivateFormValues, label: string, type = 'text') => (
    <Field label={label} htmlFor={`${idPrefix}-${key}`}>
      <input
        id={`${idPrefix}-${key}`}
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? '0.01' : undefined}
        value={value[key]}
        onChange={(e) => onChange(key, e.target.value)}
        className={inputClass}
      />
    </Field>
  );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted">Staff only — never shown on the public catalog.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {input('seller_donator', 'Seller / donor')}
        {input('acquisition_cost', 'Acquisition cost ($)', 'number')}
        {input('appraised_value', 'Appraised value ($)', 'number')}
        {input('appraisal_date', 'Appraisal date', 'date')}
        {input('appraiser_name', 'Appraiser')}
      </div>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="mb-4 font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}
