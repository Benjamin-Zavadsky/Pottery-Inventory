'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { CASES, CULTURE_BY_ID } from '@/lib/constants';
import { DEFAULT_PARAMS } from '@/lib/catalogParams';
import { fetchAll } from '@/lib/queries';
import { coverThumb } from '@/lib/photos';
import { formatPeriod } from '@/lib/period';
import { errorMessage } from '@/lib/errors';
import type { PotteryItem } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icon, Spinner } from '@/components/ui/Icon';

export default function PrintCatalogPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<PotteryItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll<PotteryItem>(supabase, '*', { ...DEFAULT_PARAMS, sort: 'sku' })
      .then(setItems)
      .catch((err) => setError(errorMessage(err)));
  }, [supabase]);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <Icon name="back" size={16} />
          Dashboard
        </Link>
        <Button onClick={() => window.print()} disabled={!items}>
          <Icon name="print" size={16} />
          Print / save as PDF
        </Button>
      </div>
      <header className="mb-6 border-b border-line pb-4">
        <h1 className="font-display text-3xl">Pottery Collection — Catalog</h1>
        <p className="text-sm text-muted">
          {items ? `${items.length} pieces` : ''} · Generated {new Date().toLocaleDateString()}
        </p>
      </header>
      {error && <p className="text-danger">{error}</p>}
      {!items && !error ? (
        <Spinner />
      ) : (
        <ol className="grid grid-cols-2 gap-x-6 gap-y-5">
          {items?.map((p) => (
            <li key={p.id} className="flex break-inside-avoid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverThumb(p)}
                alt=""
                className="h-24 w-24 shrink-0 rounded-lg bg-sunken object-cover"
              />
              <div className="min-w-0 text-xs leading-snug">
                <p className="font-mono text-faint">{p.sku}</p>
                <p className="font-display text-sm text-ink">{p.name}</p>
                <p className="text-muted">
                  {[
                    p.culture_id ? CULTURE_BY_ID[p.culture_id]?.culture : p.tribe_culture,
                    formatPeriod(p.period_start_year, p.period_end_year) || p.age,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="text-muted">
                  {[p.condition, p.dimensions, CASES.find((c) => c.id === p.case_id)?.name]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
