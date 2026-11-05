'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { CASES } from '@/lib/constants';
import { DEFAULT_PARAMS } from '@/lib/catalogParams';
import { fetchAll } from '@/lib/queries';
import { createThumbFor, needsThumbs, photoPairs } from '@/lib/photos';
import {
  DASHBOARD_COLUMNS,
  EXPORT_COLUMNS,
  classificationFor,
  dashboardStats,
  type DashboardRow,
} from '@/lib/maintenance';
import { downloadFile, toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/dates';
import { describeRevision } from '@/lib/revisions';
import { errorMessage } from '@/lib/errors';
import type { Case, PotteryItem, PotteryPrivate, Revision } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Button, buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Progress = { done: number; total: number } | null;

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser(supabase);
  const toast = useToast();
  const [rows, setRows] = useState<DashboardRow[] | null>(null);
  const [pending, setPending] = useState(0);
  const [cases, setCases] = useState<Case[]>([]);
  const [activity, setActivity] = useState<Revision[]>([]);
  const [thumbProgress, setThumbProgress] = useState<Progress>(null);
  const [classifyProgress, setClassifyProgress] = useState<Progress>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [all, analyses, caseRows, revisions] = await Promise.all([
        fetchAll<DashboardRow>(supabase, DASHBOARD_COLUMNS, DEFAULT_PARAMS),
        supabase
          .from('ai_analyses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('cases').select('*'),
        supabase
          .from('record_revisions')
          .select('*')
          .order('changed_at', { ascending: false })
          .limit(8),
      ]);
      setRows(all);
      setPending(analyses.count ?? 0);
      setCases((caseRows.data ?? []) as Case[]);
      setActivity((revisions.data ?? []) as Revision[]);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load the dashboard'));
      setRows([]);
    }
  }, [supabase, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  const stats = useMemo(() => (rows ? dashboardStats(rows) : null), [rows]);
  const skuById = useMemo(() => new Map(rows?.map((r) => [r.id, r.sku])), [rows]);

  async function generateThumbs() {
    const targets = (rows ?? []).filter(needsThumbs);
    setThumbProgress({ done: 0, total: targets.length });
    let failed = 0;
    for (const [i, row] of targets.entries()) {
      try {
        const thumbs: string[] = [];
        for (const pair of photoPairs(row)) {
          thumbs.push(
            pair.thumb === pair.photo ? await createThumbFor(supabase, pair.photo) : pair.thumb,
          );
        }
        const { error } = await supabase.from('pottery').update({ thumbs }).eq('id', row.id);
        if (error) throw error;
      } catch {
        failed++;
      }
      setThumbProgress({ done: i + 1, total: targets.length });
    }
    if (failed) toast.error(`${failed} pieces could not be processed`);
    else toast.success('Thumbnails generated');
    setThumbProgress(null);
    load();
  }

  async function classify() {
    const targets = (rows ?? []).flatMap((row) => {
      const patch = classificationFor(row);
      return patch ? [{ row, patch }] : [];
    });
    setClassifyProgress({ done: 0, total: targets.length });
    let failed = 0;
    for (const [i, { row, patch }] of targets.entries()) {
      const { error } = await supabase.from('pottery').update(patch).eq('id', row.id);
      if (error) failed++;
      setClassifyProgress({ done: i + 1, total: targets.length });
    }
    if (failed) toast.error(`${failed} pieces could not be updated`);
    else toast.success(`Classified ${targets.length} pieces`);
    setClassifyProgress(null);
    load();
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const [active, archived] = await Promise.all([
        fetchAll<PotteryItem>(supabase, '*', DEFAULT_PARAMS),
        fetchAll<PotteryItem>(supabase, '*', { ...DEFAULT_PARAMS, archived: true }),
      ]);
      const { data: priv, error } = await supabase
        .from('pottery_private')
        .select('*')
        .range(0, 9999);
      if (error) throw error;
      const privById = new Map((priv as PotteryPrivate[]).map((p) => [p.pottery_id, p]));
      const merged = [...active, ...archived].map((p) => ({ ...p, ...privById.get(p.id) }));
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(`pottery-collection-${date}.csv`, toCsv(merged, EXPORT_COLUMNS));
      toast.success(`Exported ${merged.length} pieces`);
    } catch (err) {
      toast.error(errorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  const tiles: { label: string; value: number | undefined; href?: string; tone?: 'warn' }[] = [
    { label: 'Pieces', value: stats?.total, href: '/' },
    {
      label: 'Needs review',
      value: stats ? stats.flagged + pending : undefined,
      href: '/review',
      tone: 'warn',
    },
    { label: 'Unassigned to a case', value: stats?.unassigned, href: '/?unassigned=1' },
    { label: 'Unclassified culture', value: stats?.unclassified },
    { label: 'Undated', value: stats?.undated },
    { label: 'No photos', value: stats?.noPhotos },
    { label: 'No dimensions', value: stats?.noDimensions },
    { label: 'No provenance', value: stats?.noProvenance },
  ];

  const caseCounts = (id: string) => rows?.filter((r) => r.case_id === id).length ?? 0;

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-nav pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Collection health at a glance.</p>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => {
            const body = (
              <>
                <span className="block text-[11px] uppercase tracking-wider text-muted">
                  {t.label}
                </span>
                {t.value == null ? (
                  <Skeleton className="mt-2 h-8 w-12" />
                ) : (
                  <span
                    className={`mt-1 block font-display text-3xl ${t.tone === 'warn' && t.value > 0 ? 'text-warn' : ''}`}
                  >
                    {t.value.toLocaleString()}
                  </span>
                )}
              </>
            );
            const cls =
              'block h-full rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong';
            return (
              <li key={t.label}>
                {t.href ? (
                  <Link href={t.href} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-display text-lg">Tools</h2>
            <div className="flex flex-col gap-4">
              <Tool
                title="Generate missing thumbnails"
                body="Older pieces load full-size photos in the grid. This creates small thumbnails so browsing stays fast."
                count={stats?.needThumbs}
                progress={thumbProgress}
                onRun={generateThumbs}
              />
              <Tool
                title="Classify legacy pieces"
                body="Matches free-text culture and age to the canonical culture list and numeric years. Only fills empty fields."
                count={stats?.classifiable}
                progress={classifyProgress}
                onRun={classify}
              />
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Button variant="secondary" size="sm" loading={exporting} onClick={exportCsv}>
                  <Icon name="download" size={14} />
                  Export CSV
                </Button>
                <Link href="/catalog/print" className={buttonClass('secondary', 'sm')}>
                  <Icon name="print" size={14} />
                  Printable catalog
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-display text-lg">Cases</h2>
            <ul className="flex flex-col gap-3">
              {CASES.map((c) => {
                const count = caseCounts(c.id);
                const capacity = cases.find((r) => r.id === c.id)?.capacity;
                return (
                  <li key={c.id}>
                    <Link href={`/cases/${c.id}`} className="block">
                      <span className="flex justify-between text-sm">
                        <span>{c.name}</span>
                        <span className="text-muted">
                          {count}
                          {capacity ? ` / ${capacity}` : ''}
                        </span>
                      </span>
                      {capacity ? (
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sunken">
                          <span
                            className={`block h-full ${count > capacity ? 'bg-danger' : 'bg-accent'}`}
                            style={{ width: `${Math.min(100, (count / capacity) * 100)}%` }}
                          />
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-lg">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">No recorded changes yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((rev) => {
                const sku = skuById.get(rev.record_id);
                return (
                  <li key={rev.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                    <span className="w-16 shrink-0 font-mono text-xs text-faint">
                      {sku ? <Link href={`/item/${sku}`}>{sku}</Link> : '—'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{describeRevision(rev)}</span>
                    <span className="shrink-0 text-xs text-faint">
                      {formatDateTime(rev.changed_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <BottomNav staff />
    </>
  );
}

function Tool({
  title,
  body,
  count,
  progress,
  onRun,
}: {
  title: string;
  body: string;
  count: number | undefined;
  progress: Progress;
  onRun: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">{body}</p>
        </div>
        <Button size="sm" disabled={!count || !!progress} loading={!!progress} onClick={onRun}>
          {progress ? `${progress.done}/${progress.total}` : `Run (${count ?? 0})`}
        </Button>
      </div>
      {progress && (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemax={progress.total}
        >
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
