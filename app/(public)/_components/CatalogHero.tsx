import { REGIONS, REGION_COLORS, type Region } from '@/lib/constants';
import { formatYear } from '@/lib/period';

export type HeroStats = {
  total: number;
  cultures: number;
  byRegion: Partial<Record<Region, number>>;
  earliest: number | null;
  latest: number | null;
};

export default function CatalogHero({
  stats,
  onRegion,
}: {
  stats: HeroStats | null;
  onRegion: (region: Region) => void;
}) {
  const regions = REGIONS.filter((r) => stats?.byRegion[r]);
  return (
    <section className="mb-6 animate-fade-in sm:mb-10">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
        Archaeological ceramics
      </p>
      <h1 className="max-w-2xl font-display text-3xl leading-tight sm:text-5xl">
        Pottery from across the ancient world
      </h1>
      {stats && stats.total > 0 && (
        <dl className="mt-5 grid max-w-xl grid-cols-3 gap-4">
          <Stat label="Pieces" value={stats.total.toLocaleString()} />
          <Stat label="Cultures" value={String(stats.cultures)} />
          <Stat
            label="Span"
            value={
              stats.earliest != null && stats.latest != null
                ? `${formatYear(stats.earliest)} – ${formatYear(stats.latest)}`
                : '—'
            }
            small
          />
        </dl>
      )}
      {regions.length > 0 && (
        <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2" style={{ width: 'max-content' }}>
            {regions.map((region) => (
              <li key={region}>
                <button
                  type="button"
                  onClick={() => onRegion(region)}
                  className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm transition-colors hover:border-line-strong"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: REGION_COLORS[region] }}
                  />
                  {region}
                  <span className="text-xs text-muted">{stats?.byRegion[region]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-faint">{label}</dt>
      <dd className={`font-display ${small ? 'text-sm sm:text-base' : 'text-2xl sm:text-3xl'}`}>
        {value}
      </dd>
    </div>
  );
}
