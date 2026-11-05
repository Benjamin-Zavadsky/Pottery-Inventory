// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, renderWithToast, screen, waitFor, within } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeSummary } from '../support/fixtures';

let searchParams = new URLSearchParams();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/',
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));
vi.mock('@/components/InventoryMap', () => ({
  default: ({ items }: { items: unknown[] }) => <p>map view {items.length}</p>,
}));
vi.mock('@/components/InventoryTimeline', () => ({
  default: ({ items }: { items: unknown[] }) => <p>timeline view {items.length}</p>,
}));
vi.mock('@/components/InventoryTree', () => ({
  default: ({ items }: { items: unknown[] }) => <p>tree view {items.length}</p>,
}));
vi.mock('@/components/InventoryCase', () => ({
  default: ({ items }: { items: unknown[] }) => <p>case view {items.length}</p>,
}));

import { createClient } from '@/lib/supabase';
import HomePage from '@/app/(public)/page';

const mock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  mock.supabase as unknown as ReturnType<typeof createClient>,
);

const items = [
  makeSummary({ id: '1', sku: 'P0001', name: 'Cahokia jar' }),
  makeSummary({
    id: '2',
    sku: 'P0002',
    name: 'Maya plate',
    culture_id: 'maya',
    region: 'Mesoamerica',
    period_start_year: -300,
    period_end_year: 250,
    case_id: 'A',
  }),
];
const statRows = [
  {
    culture_id: 'mississippian',
    tribe_culture: null,
    region: 'North America',
    period_start_year: 1050,
    period_end_year: 1200,
  },
  {
    culture_id: null,
    tribe_culture: 'Maya',
    region: null,
    period_start_year: null,
    period_end_year: -300,
  },
  {
    culture_id: null,
    tribe_culture: null,
    region: null,
    period_start_year: null,
    period_end_year: null,
  },
];

function load(page = { data: items, count: 2 }, stats: unknown[] | null = statRows) {
  mock.queueResult(page);
  mock.queueResult(stats ? { data: stats } : { error: { message: 'x' } });
}

beforeEach(() => {
  mock.reset();
  replace.mockClear();
  searchParams = new URLSearchParams();
});
afterEach(() => vi.unstubAllGlobals());

describe('Catalog home page', () => {
  it('shows the hero with collection stats and the first page of pieces', async () => {
    load();
    renderWithToast(<HomePage />);
    expect(await screen.findByText('Cahokia jar')).toBeInTheDocument();
    expect(screen.getByText('2 pieces')).toBeInTheDocument();
    const stats = await screen.findByText('Cultures', { selector: 'dt' });
    expect(stats.nextSibling).toHaveTextContent('2');
    expect(screen.getByText('300 BCE – 1200 CE')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mesoamerica/ }));
    expect(replace).toHaveBeenCalledWith('/?region=Mesoamerica', { scroll: false });
  });

  it('hides hero stats when they cannot load', async () => {
    load({ data: items, count: 2 }, null);
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    expect(screen.queryByText('Cultures', { selector: 'dt' })).not.toBeInTheDocument();
  });

  it('debounces search into the URL', async () => {
    load();
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    fireEvent.change(screen.getByLabelText('Search the collection'), { target: { value: 'jar' } });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/?q=jar', { scroll: false }));
  });

  it('loads more pages on demand', async () => {
    load({ data: items, count: 3 });
    renderWithToast(<HomePage />);
    const more = await screen.findByRole('button', { name: 'Load 1 more' });
    mock.queueResult({ data: [makeSummary({ id: '3', sku: 'P0003', name: 'Third' })], count: 3 });
    fireEvent.click(more);
    expect(await screen.findByText('Third')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load/ })).not.toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    mock.queueResult({ error: { message: 'offline' } });
    mock.queueResult({ data: [] });
    renderWithToast(<HomePage />);
    expect(await screen.findByText('offline')).toBeInTheDocument();
    mock.queueResult({ data: items, count: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Cahokia jar')).toBeInTheDocument();
  });

  it('explains empty results and clears filters', async () => {
    searchParams = new URLSearchParams('region=Europe&q=zzz&sort=sku&view=grid&archived=1');
    load({ data: [], count: 0 });
    renderWithToast(<HomePage />);
    expect(await screen.findByText('No pieces found')).toBeInTheDocument();
    expect(screen.queryByText('Pottery from across the ancient world')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(replace).toHaveBeenCalledWith('/?sort=sku', { scroll: false });
  });

  it('says the collection is empty when there are no filters', async () => {
    load({ data: [], count: 0 }, []);
    renderWithToast(<HomePage />);
    expect(await screen.findByText('The collection is empty.')).toBeInTheDocument();
  });

  it('removes individual filter chips', async () => {
    searchParams = new URLSearchParams(
      'region=North America&culture=mississippian&from=-1000&to=1&condition=Good&rarity=Rare&originality=Unknown&case=none&review=1&archived=1',
    );
    load();
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    expect(screen.getByText('1000 BCE – 1 CE')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText(/\(archived\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter North America' }));
    expect(replace.mock.calls.at(-1)?.[0]).not.toContain('region=');
    expect(replace.mock.calls.at(-1)?.[0]).not.toContain('culture=');
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Needs review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(replace).toHaveBeenLastCalledWith('/', { scroll: false });
  });

  it.each([
    ['from=500', 'After 500 CE'],
    ['to=-200', 'Before 200 BCE'],
    ['case=A', 'A — Left Tower'],
  ])('labels the %s chip', async (qs, label) => {
    searchParams = new URLSearchParams(qs);
    load();
    renderWithToast(<HomePage />);
    expect(
      await screen.findByRole('button', { name: `Remove filter ${label}` }),
    ).toBeInTheDocument();
  });

  it('opens the filter sheet and applies selections', async () => {
    load();
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog', { name: 'Filter the collection' });
    fireEvent.change(within(sheet).getByLabelText('Region'), { target: { value: 'Europe' } });
    expect(replace).toHaveBeenLastCalledWith('/?region=Europe', { scroll: false });
    fireEvent.change(within(sheet).getByLabelText('Culture'), { target: { value: 'maya' } });
    fireEvent.change(within(sheet).getByLabelText('Condition'), { target: { value: 'Good' } });
    fireEvent.change(within(sheet).getByLabelText('Rarity'), { target: { value: 'Rare' } });
    fireEvent.change(within(sheet).getByLabelText('Originality'), { target: { value: 'Unknown' } });
    fireEvent.change(within(sheet).getByLabelText('Display case'), { target: { value: 'none' } });
    fireEvent.click(within(sheet).getByRole('button', { name: '1 – 1000 CE' }));
    expect(replace).toHaveBeenLastCalledWith('/?from=1&to=1000', { scroll: false });
    fireEvent.change(within(sheet).getByLabelText('From', { selector: 'input' }), {
      target: { value: '300' },
    });
    expect(replace).toHaveBeenLastCalledWith('/?from=300', { scroll: false });
    fireEvent.change(within(sheet).getByLabelText('To', { selector: 'input' }), {
      target: { value: '900' },
    });
    expect(within(sheet).queryByText('Staff')).not.toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Clear all' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Show 2 pieces' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles an active era preset off and filters cultures by region', async () => {
    searchParams = new URLSearchParams('from=1&to=1000&region=Oceania');
    load({ data: items.slice(0, 1), count: 1 });
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('button', { name: 'Show 1 piece' })).toBeInTheDocument();
    expect(within(within(sheet).getByLabelText('Culture')).getAllByRole('option')).toHaveLength(3);
    fireEvent.click(within(sheet).getByRole('button', { name: '1 – 1000 CE' }));
    expect(replace).toHaveBeenLastCalledWith('/?region=Oceania', { scroll: false });
  });

  it('changes sort and view', async () => {
    load();
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'age-asc' } });
    expect(replace).toHaveBeenLastCalledWith('/?sort=age-asc', { scroll: false });
    fireEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
    expect(replace).toHaveBeenLastCalledWith('/?view=timeline', { scroll: false });
  });

  it.each([
    ['map', 'map view 2'],
    ['timeline', 'timeline view 2'],
    ['tree', 'tree view 2'],
    ['case', 'case view 2'],
  ])('renders the %s view from every matching piece', async (view, text) => {
    searchParams = new URLSearchParams(`view=${view}`);
    mock.queueResult({ data: items });
    mock.queueResult({ data: statRows });
    renderWithToast(<HomePage />);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByLabelText('Sort')).not.toBeInTheDocument();
  });

  it('shows a load error for alternate views', async () => {
    searchParams = new URLSearchParams('view=map');
    mock.queueResult({ error: { message: 'map failed' } });
    mock.queueResult({ data: [] });
    renderWithToast(<HomePage />);
    expect(await screen.findByText('map failed')).toBeInTheDocument();
  });
});

describe('Catalog staff tools', () => {
  beforeEach(() => mock.setUser({ id: 'staff' }));

  async function selectBoth() {
    load();
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Cahokia jar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Maya plate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Maya plate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Maya plate' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  }

  it('shows staff-only filters', async () => {
    load();
    renderWithToast(<HomePage />);
    await screen.findByText('Cahokia jar');
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByLabelText(/Needs review/));
    expect(replace).toHaveBeenLastCalledWith('/?review=1', { scroll: false });
    fireEvent.click(screen.getByLabelText(/Show archived/));
    expect(replace).toHaveBeenLastCalledWith('/?archived=1', { scroll: false });
  });

  it('moves selected pieces to a case and logs only real moves', async () => {
    await selectBoth();
    fireEvent.change(screen.getByLabelText('Move selected to case'), { target: { value: 'A' } });
    mock.queueResult({});
    mock.queueResult({});
    mock.queueResult({ data: items, count: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(await screen.findByText('Moved 2 to A — Left Tower')).toBeInTheDocument();
    const insert = mock.builders.find((b) => b.insert.mock.calls.length)!;
    expect(insert.insert).toHaveBeenCalledWith([
      { pottery_id: '1', from_case: null, to_case: 'A', moved_by: 'staff' },
    ]);
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
  });

  it('reports bulk failures', async () => {
    await selectBoth();
    fireEvent.change(screen.getByLabelText('Move selected to case'), { target: { value: 'B' } });
    mock.queueResult({ error: { message: 'rls denied' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(await screen.findByText('rls denied')).toBeInTheDocument();
  });

  it('reports a failed history insert', async () => {
    await selectBoth();
    fireEvent.change(screen.getByLabelText('Move selected to case'), { target: { value: 'B' } });
    mock.queueResult({});
    mock.queueResult({ error: { message: 'history failed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(await screen.findByText('history failed')).toBeInTheDocument();
  });

  it('skips the history insert when nothing actually moved', async () => {
    load({ data: [items[1]], count: 1 });
    renderWithToast(<HomePage />);
    await screen.findByText('Maya plate');
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Maya plate' }));
    fireEvent.change(screen.getByLabelText('Move selected to case'), { target: { value: 'A' } });
    mock.queueResult({});
    mock.queueResult({ data: [items[1]], count: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(await screen.findByText('Moved 1 to A — Left Tower')).toBeInTheDocument();
  });

  it('archives after confirmation', async () => {
    await selectBoth();
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    mock.queueResult({});
    mock.queueResult({ data: [], count: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Archived 2 pieces')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('reports archive errors', async () => {
    await selectBoth();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mock.queueResult({ error: { message: 'cannot archive' } });
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('cannot archive')).toBeInTheDocument();
  });

  it('queues background AI for selected pieces with photos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ name: 'x' }))),
    );
    await selectBoth();
    mock.queueResult({});
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Re-run AI' }));
    expect(await screen.findByText(/Analyzing 2 pieces in the background/)).toBeInTheDocument();
    await waitFor(() => expect(mock.pending()).toBe(0));
  });

  it('cancels selection mode', async () => {
    await selectBoth();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel selection' }));
    expect(screen.getByRole('link', { name: /Cahokia jar/ })).toBeInTheDocument();
  });
});
