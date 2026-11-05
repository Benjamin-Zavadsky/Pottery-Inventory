'use client';

import { useMemo, useState } from 'react';
import { CULTURES, REGIONS, REGION_COLORS, type Region } from '@/lib/constants';
import { groupByCulture } from '@/lib/taxonomy';
import type { PieceSummary } from '@/lib/types';
import CollapsibleRow from '@/components/CollapsibleRow';
import ViewFrame from '@/components/ViewFrame';
import { TileRow } from '@/components/PieceTile';

function toggle<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function InventoryTree({ items }: { items: PieceSummary[] }) {
  const [openRegions, setOpenRegions] = useState<Set<Region | 'none'>>(new Set());
  const [openCultures, setOpenCultures] = useState<Set<string>>(new Set());

  const { regions, unclassified } = useMemo(() => {
    const { groups, unclassified } = groupByCulture(items);
    const regions = REGIONS.map((region) => {
      const cultures = CULTURES.filter((c) => c.region === region && groups.has(c.id)).map((c) => ({
        ...c,
        pieces: groups.get(c.id) as PieceSummary[],
      }));
      return { region, cultures, total: cultures.reduce((n, c) => n + c.pieces.length, 0) };
    });
    return { regions, unclassified };
  }, [items]);

  return (
    <ViewFrame title="Collection by culture" count={items.length}>
      {regions.map(({ region, cultures, total }) => (
        <CollapsibleRow
          key={region}
          open={openRegions.has(region)}
          onToggle={() => setOpenRegions((s) => toggle(s, region))}
          color={REGION_COLORS[region]}
          title={region}
          subtitle={`${cultures.length} ${cultures.length === 1 ? 'culture' : 'cultures'}`}
          count={total}
          disabled={total === 0}
        >
          {cultures.map((c) => (
            <CollapsibleRow
              key={c.id}
              indent
              open={openCultures.has(c.id)}
              onToggle={() => setOpenCultures((s) => toggle(s, c.id))}
              color={REGION_COLORS[region]}
              title={c.culture}
              count={c.pieces.length}
            >
              <TileRow pieces={c.pieces} />
            </CollapsibleRow>
          ))}
        </CollapsibleRow>
      ))}
      {unclassified.length > 0 && (
        <CollapsibleRow
          open={openRegions.has('none')}
          onToggle={() => setOpenRegions((s) => toggle(s, 'none'))}
          color="#cbc1b2"
          title="Unclassified"
          subtitle="No culture assigned yet"
          count={unclassified.length}
        >
          <TileRow pieces={unclassified} />
        </CollapsibleRow>
      )}
    </ViewFrame>
  );
}
