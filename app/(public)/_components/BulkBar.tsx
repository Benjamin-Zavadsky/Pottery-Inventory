'use client';

import { useState } from 'react';
import { CASES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';

export default function BulkBar({
  count,
  busy,
  onMove,
  onArchive,
  onAnalyze,
  onCancel,
}: {
  count: number;
  busy: boolean;
  onMove: (caseId: string) => void;
  onArchive: () => void;
  onAnalyze: () => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState('');
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed inset-x-0 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-t-2xl border border-line bg-surface p-3 shadow-2xl animate-sheet-up sm:bottom-4 sm:rounded-2xl"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
    >
      <span className="px-1 text-sm font-medium">{count} selected</span>
      <div className="flex flex-1 items-center gap-2">
        <select
          aria-label="Move selected to case"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={`${inputClass} !py-2`}
        >
          <option value="">Move to case…</option>
          {CASES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!target || !count}
          loading={busy}
          onClick={() => onMove(target)}
        >
          Move
        </Button>
      </div>
      <Button size="sm" variant="secondary" disabled={!count || busy} onClick={onAnalyze}>
        Re-run AI
      </Button>
      <Button size="sm" variant="danger" disabled={!count || busy} onClick={onArchive}>
        Archive
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Done
      </Button>
    </div>
  );
}
