'use client';

import { useMemo, useState } from 'react';
import { CASES } from '@/lib/constants';
import type { PieceSummary } from '@/lib/types';
import CollapsibleRow from '@/components/CollapsibleRow';
import ViewFrame from '@/components/ViewFrame';
import { TileRow } from '@/components/PieceTile';

const UNASSIGNED = '__unassigned__';

export default function InventoryCase({ items }: { items: PieceSummary[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set(CASES.map((c) => c.id)));

  const groups = useMemo(
    () => [
      ...CASES.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        description: c.description as string,
        color: '#1c1917',
        pieces: items.filter((i) => i.case_id === c.id),
      })),
      {
        id: UNASSIGNED,
        name: 'Unassigned',
        description: 'Not yet placed in a case',
        color: '#cbc1b2',
        pieces: items.filter((i) => !i.case_id),
      },
    ],
    [items],
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ViewFrame title="Collection by case" count={items.length}>
      {groups.map((g) => (
        <CollapsibleRow
          key={g.id}
          open={open.has(g.id)}
          onToggle={() => toggle(g.id)}
          color={g.color}
          title={g.name}
          subtitle={g.description}
          count={g.pieces.length}
        >
          {g.pieces.length === 0 ? (
            <p className="py-4 pl-9 pr-5 text-sm text-faint">No pieces here.</p>
          ) : (
            <TileRow pieces={g.pieces} />
          )}
        </CollapsibleRow>
      ))}
    </ViewFrame>
  );
}
