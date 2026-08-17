'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { CASES } from '@/lib/constants';
import type { Case } from '@/lib/types';
import BottomNav from '@/components/BottomNav';

type CaseWithCount = Case & { piece_count: number };

export default function CasesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [cases, setCases] = useState<CaseWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: caseRows } = await supabase.from('cases').select('*');
      const { data: pottery } = await supabase
        .from('pottery')
        .select('case_id')
        .eq('status', 'Active')
        .not('case_id', 'is', null);

      const counts: Record<string, number> = {};
      pottery?.forEach((p) => {
        if (p.case_id) counts[p.case_id] = (counts[p.case_id] ?? 0) + 1;
      });

      const merged: CaseWithCount[] = CASES.map((c) => {
        const row = caseRows?.find((r) => r.id === c.id);
        return {
          id: c.id,
          name: c.name,
          description: row?.description ?? c.description,
          capacity: row?.capacity ?? null,
          last_inventoried_at: row?.last_inventoried_at ?? null,
          piece_count: counts[c.id] ?? 0,
        };
      });

      setCases(merged);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f9] pb-nav">
      <header className="bg-white border-b border-[#e5e5e5] px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/"
          className="text-[#6b6b6b] hover:text-[#111] transition-colors p-1 -ml-1 sm:block hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-sm sm:text-lg font-light tracking-widest uppercase flex-1">
          Display Cases
        </h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-[#6b6b6b]">
            Loading...
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:border-[#111] transition-colors group"
              >
                {/* Case ID badge */}
                <div className="w-12 h-12 rounded-xl bg-[#f3f3f3] group-hover:bg-[#111] transition-colors flex items-center justify-center shrink-0">
                  <span className="text-xs font-mono font-medium text-[#6b6b6b] group-hover:text-white transition-colors">
                    {c.id}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111] truncate">{c.name}</p>
                  <p className="text-xs text-[#6b6b6b] mt-0.5">{c.description}</p>
                  {c.last_inventoried_at && (
                    <p className="text-[10px] text-[#aaa] mt-1">
                      Last inventoried {new Date(c.last_inventoried_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Piece count */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-light text-[#111]">{c.piece_count}</p>
                  <p className="text-[10px] text-[#aaa] uppercase tracking-wider">
                    {c.piece_count === 1 ? 'piece' : 'pieces'}
                  </p>
                </div>
              </Link>
            ))}

            {/* Unassigned count */}
            <UnassignedCard supabase={supabase} />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function UnassignedCard({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('pottery')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active')
      .is('case_id', null)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [supabase]);

  if (count === null || count === 0) return null;

  return (
    <Link
      href="/?unassigned=1"
      className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:border-[#f59e0b] transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-[#fef3c7] flex items-center justify-center shrink-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d97706"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#92400e]">Unassigned pieces</p>
        <p className="text-xs text-[#b45309] mt-0.5">Not yet assigned to a display case</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xl font-light text-[#92400e]">{count}</p>
        <p className="text-[10px] text-[#b45309] uppercase tracking-wider">
          {count === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
    </Link>
  );
}
