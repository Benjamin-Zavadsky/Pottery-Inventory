'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { CASES } from '@/lib/constants';
import { formatDateOnly } from '@/lib/dates';
import type { Case } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';

type CaseWithCount = Case & { piece_count: number };

export default function CasesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser(supabase);
  const [cases, setCases] = useState<CaseWithCount[] | null>(null);
  const [unassigned, setUnassigned] = useState(0);

  useEffect(() => {
    async function load() {
      const [{ data: caseRows }, { data: pottery }] = await Promise.all([
        supabase.from('cases').select('*'),
        supabase.from('pottery').select('case_id').eq('status', 'Active'),
      ]);
      const counts: Record<string, number> = {};
      let none = 0;
      pottery?.forEach((p: { case_id: string | null }) => {
        if (p.case_id) counts[p.case_id] = (counts[p.case_id] ?? 0) + 1;
        else none++;
      });
      setUnassigned(none);
      setCases(
        CASES.map((c) => {
          const row = caseRows?.find((r: Case) => r.id === c.id);
          return {
            id: c.id,
            name: c.name,
            description: row?.description ?? c.description,
            capacity: row?.capacity ?? null,
            last_inventoried_at: row?.last_inventoried_at ?? null,
            piece_count: counts[c.id] ?? 0,
          };
        }),
      );
    }
    load();
  }, [supabase]);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-nav pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        <h1 className="mb-1 font-display text-3xl">Display cases</h1>
        <p className="mb-6 text-sm text-muted">Where every piece lives in the gallery.</p>
        {!cases ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading cases">
            {CASES.map((c) => (
              <Skeleton key={c.id} className="h-20" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sunken font-mono text-xs font-medium text-muted transition-colors group-hover:bg-ink group-hover:text-white">
                    {c.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <span className="block text-xs text-muted">{c.description}</span>
                    {c.capacity ? (
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken">
                        <span
                          className={`block h-full rounded-full ${c.piece_count > c.capacity ? 'bg-danger' : 'bg-accent'}`}
                          style={{ width: `${Math.min(100, (c.piece_count / c.capacity) * 100)}%` }}
                        />
                      </span>
                    ) : null}
                    {c.last_inventoried_at && (
                      <span className="mt-1 block text-[10px] text-faint">
                        Last inventoried {formatDateOnly(c.last_inventoried_at)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-2xl">{c.piece_count}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-faint">
                      {c.capacity ? `of ${c.capacity}` : c.piece_count === 1 ? 'piece' : 'pieces'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {unassigned > 0 && (
              <li>
                <Link
                  href="/?unassigned=1"
                  className="flex items-center gap-4 rounded-2xl border border-warn/30 bg-warn-soft p-4 sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-warn">
                    <Icon name="alert" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-warn">Unassigned pieces</span>
                    <span className="block text-xs text-warn/80">Not yet placed in a case</span>
                  </span>
                  <span className="font-display text-2xl text-warn">{unassigned}</span>
                </Link>
              </li>
            )}
          </ul>
        )}
      </main>
      <BottomNav staff={!!user} />
    </>
  );
}
