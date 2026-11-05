'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { CASES } from '@/lib/constants';
import { formatDateOnly } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { SUMMARY_COLUMNS, type Case, type PieceSummary } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PieceCard from '@/components/PieceCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser(supabase);
  const toast = useToast();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [pieces, setPieces] = useState<PieceSummary[] | null>(null);
  const [marking, setMarking] = useState(false);
  const caseMeta = CASES.find((c) => c.id === id);

  useEffect(() => {
    async function load() {
      const [{ data: caseRow }, { data: rows }] = await Promise.all([
        supabase.from('cases').select('*').eq('id', id).single(),
        supabase
          .from('pottery')
          .select(SUMMARY_COLUMNS)
          .eq('case_id', id)
          .eq('status', 'Active')
          .order('sku', { ascending: true }),
      ]);
      setCaseData(caseRow);
      setPieces((rows ?? []) as unknown as PieceSummary[]);
    }
    load();
  }, [id, supabase]);

  async function markInventoried() {
    setMarking(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('cases')
      .update({ last_inventoried_at: now })
      .eq('id', id);
    if (error) toast.error(errorMessage(error));
    else {
      setCaseData((prev) => (prev ? { ...prev, last_inventoried_at: now } : prev));
      toast.success('Marked as inventoried today');
    }
    setMarking(false);
  }

  return (
    <>
      <AppHeader
        user={user}
        back="/cases"
        title="Display cases"
        actions={
          user ? (
            <Button size="sm" loading={marking} onClick={markInventoried}>
              Mark inventoried
            </Button>
          ) : null
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-nav pt-6 sm:px-6 sm:pb-16">
        <h1 className="font-display text-3xl">{caseMeta?.name ?? id}</h1>
        <p className="mt-1 text-sm text-muted">
          {pieces ? `${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}` : ' '}
          {caseData?.last_inventoried_at &&
            ` · Last inventoried ${formatDateOnly(caseData.last_inventoried_at)}`}
        </p>
        <div className="mt-6">
          {!pieces ? (
            <CardGridSkeleton count={6} />
          ) : pieces.length === 0 ? (
            <EmptyState
              icon="case"
              title="This case is empty"
              body="No pieces are assigned here yet."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
              {pieces.map((p) => (
                <PieceCard key={p.id} item={p} />
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav staff={!!user} />
    </>
  );
}
