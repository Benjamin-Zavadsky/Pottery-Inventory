'use client';

import { useMemo } from 'react';
import { REGION_COLORS } from '@/lib/constants';
import { regionFor } from '@/lib/taxonomy';
import type { PieceSummary } from '@/lib/types';
import ViewFrame from '@/components/ViewFrame';
import { TileRow } from '@/components/PieceTile';

const BUCKETS = [
  { label: 'Before 3000 BCE', max: -3000 },
  { label: '3000 – 1000 BCE', max: -1000 },
  { label: '1000 BCE – 1 CE', max: 1 },
  { label: '1 – 500 CE', max: 500 },
  { label: '500 – 1000 CE', max: 1000 },
  { label: '1000 – 1250 CE', max: 1250 },
  { label: '1250 – 1500 CE', max: 1500 },
  { label: '1500 – 1750 CE', max: 1750 },
  { label: '1750 CE – present', max: Infinity },
];

function midpoint(p: PieceSummary): number | null {
  const s = p.period_start_year ?? p.period_end_year;
  const e = p.period_end_year ?? p.period_start_year;
  return s == null || e == null ? null : (s + e) / 2;
}

function accentFor(p: PieceSummary) {
  const region = regionFor(p);
  return region ? REGION_COLORS[region] : undefined;
}

export default function InventoryTimeline({ items }: { items: PieceSummary[] }) {
  const { buckets, undated, max } = useMemo(() => {
    const buckets = BUCKETS.map((b) => ({ ...b, pieces: [] as PieceSummary[] }));
    const undated: PieceSummary[] = [];
    for (const p of items) {
      const m = midpoint(p);
      if (m == null) undated.push(p);
      else buckets.find((b) => m < b.max)!.pieces.push(p);
    }
    for (const b of buckets) {
      b.pieces.sort((a, c) => (midpoint(a) as number) - (midpoint(c) as number));
    }
    return { buckets, undated, max: Math.max(1, ...buckets.map((b) => b.pieces.length)) };
  }, [items]);

  return (
    <ViewFrame title="Collection through time" count={items.length}>
      {buckets.map((b) => (
        <section key={b.label} aria-label={b.label} className="bg-surface">
          <div className="flex items-center gap-3 px-5 pt-4">
            <h3 className="w-36 shrink-0 font-display text-sm sm:w-44 sm:text-base">{b.label}</h3>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-sunken">
              {b.pieces.map((p) => (
                <span
                  key={p.id}
                  className="h-full"
                  style={{
                    width: `${100 / max}%`,
                    backgroundColor: accentFor(p) ?? '#cbc1b2',
                  }}
                />
              ))}
            </div>
            <span className="w-14 shrink-0 text-right text-xs text-muted">{b.pieces.length}</span>
          </div>
          {b.pieces.length > 0 ? (
            <TileRow pieces={b.pieces} accent={accentFor} />
          ) : (
            <div className="h-4" />
          )}
        </section>
      ))}
      {undated.length > 0 && (
        <section aria-label="Undated" className="bg-canvas">
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="font-display text-sm text-muted">Undated</h3>
            <span className="text-xs text-muted">{undated.length}</span>
          </div>
          <TileRow pieces={undated} accent={accentFor} />
        </section>
      )}
    </ViewFrame>
  );
}
