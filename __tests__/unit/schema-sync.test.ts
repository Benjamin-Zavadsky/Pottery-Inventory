import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { CULTURES, REGIONS } from '@/lib/constants';
import { formToRow, EMPTY_FORM } from '@/lib/pieceForm';
import { EXPORT_COLUMNS } from '@/lib/maintenance';

const schema = readFileSync(path.resolve(__dirname, '../../supabase-schema.sql'), 'utf8');

function columnsOf(table: string): Set<string> {
  const cols = new Set<string>();
  const create = new RegExp(`create table (?:if not exists )?${table} \\(([\\s\\S]*?)\\n\\);`).exec(
    schema,
  );
  for (const line of create?.[1].split('\n') ?? []) {
    const m = /^\s+([a-z_]+)\s+[a-z]/.exec(line);
    if (m) cols.add(m[1]);
  }
  for (const m of schema.matchAll(
    new RegExp(`alter table ${table} add column (?:if not exists )?([a-z_]+)`, 'g'),
  )) {
    cols.add(m[1]);
  }
  const dropped = /alter table pottery\s+drop column ([\s\S]*?);/.exec(schema);
  if (table === 'pottery' && dropped) {
    for (const m of dropped[1].matchAll(/drop column ([a-z_]+)|^\s*([a-z_]+)/gm))
      cols.delete(m[1] ?? m[2]);
    for (const c of dropped[1].split(',').map((s) => s.replace('drop column', '').trim()))
      cols.delete(c);
  }
  return cols;
}

describe('supabase-schema.sql stays in sync with the code', () => {
  it('seeds every canonical culture with the same name and region', () => {
    const seeded = new Map(
      [
        ...schema.matchAll(
          /\('([a-z0-9-]+)', '((?:[^']|'')+)', '([^']+)', (-?[\d.]+), (-?[\d.]+)\)/g,
        ),
      ].map((m) => [
        m[1],
        { culture: m[2].replace(/''/g, "'"), region: m[3], lat: +m[4], lng: +m[5] },
      ]),
    );
    expect(seeded.size).toBe(CULTURES.length);
    for (const { id, ...rest } of CULTURES) expect(seeded.get(id), id).toEqual(rest);
    for (const r of REGIONS) expect(schema).toContain(`'${r}'`);
  });

  it('every column the app writes to pottery exists', () => {
    const cols = columnsOf('pottery');
    const written = [
      ...Object.keys(formToRow(EMPTY_FORM)),
      'photos',
      'thumbs',
      'ai_fields',
      'status',
      'case_id',
    ];
    for (const key of written) expect(cols, key).toContain(key);
    for (const gone of ['acquisition_cost', 'seller_donator']) expect(cols.has(gone)).toBe(false);
  });

  it('every exported column exists in pottery or pottery_private', () => {
    const cols = new Set([...columnsOf('pottery'), ...columnsOf('pottery_private')]);
    for (const key of EXPORT_COLUMNS) expect(cols, key).toContain(key);
  });

  it('enables RLS on every table it creates', () => {
    const tables = [...schema.matchAll(/create table (?:if not exists )?([a-z_]+)/g)].map(
      (m) => m[1],
    );
    for (const t of tables)
      expect(schema, t).toMatch(new RegExp(`alter table ${t} enable row level security`));
  });
});
