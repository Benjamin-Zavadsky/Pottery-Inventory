'use client';

import { useState } from 'react';
import type { Supabase } from '@/lib/supabase';
import { fetchRevisions } from '@/lib/queries';
import { formatDateTime } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import type { Revision } from '@/lib/types';
import { describeRevision } from '@/lib/revisions';
import { Icon, Spinner } from '@/components/ui/Icon';

export default function History({
  supabase,
  recordId,
  currentUserId,
}: {
  supabase: Supabase;
  recordId: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setOpen((o) => !o);
    if (revisions || open) return;
    try {
      setRevisions(await fetchRevisions(supabase, recordId));
    } catch (err) {
      setError(errorMessage(err, 'Could not load history'));
    }
  }

  return (
    <section className="border-t border-line pt-5 print:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:text-ink"
      >
        <Icon name="history" size={14} />
        <span className="flex-1 text-left">Edit history</span>
        <Icon name="chevron-down" size={14} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="mt-3">
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : !revisions ? (
            <Spinner />
          ) : revisions.length === 0 ? (
            <p className="text-sm text-muted">No recorded changes yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {revisions.map((rev) => {
                return (
                  <li key={rev.id} className="text-sm">
                    <p className="text-ink">{describeRevision(rev)}</p>
                    <p className="text-xs text-faint">
                      {formatDateTime(rev.changed_at)} ·{' '}
                      {rev.changed_by === currentUserId ? 'You' : 'Staff'}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
