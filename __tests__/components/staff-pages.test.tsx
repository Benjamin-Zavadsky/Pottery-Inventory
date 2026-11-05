// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, renderWithToast, screen, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { stubImageAndCanvas } from '../support/browser';
import { STORAGE, makeItem } from '../support/fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/review',
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import ReviewPage from '@/app/(staff)/review/page';
import DashboardPage from '@/app/(staff)/dashboard/page';
import PrintCatalogPage from '@/app/(staff)/catalog/print/page';
import StaffLayout from '@/app/(staff)/layout';

const mock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  mock.supabase as unknown as ReturnType<typeof createClient>,
);

beforeEach(() => {
  mock.reset();
  mock.setUser({ id: 'staff' });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Staff layout', () => {
  it('guards its children', async () => {
    renderWithToast(
      <StaffLayout>
        <p>inside</p>
      </StaffLayout>,
    );
    expect(await screen.findByText('inside')).toBeInTheDocument();
  });
});

describe('Review queue', () => {
  const analysed = makeItem({ id: 'a', sku: 'P0010', name: 'Needs AI' });
  const flagged = makeItem({
    id: 'f',
    sku: 'P0011',
    name: 'Flagged',
    ai_fields: ['color', 'not_a_field'],
  });

  function loadQueue() {
    mock.queueResult({
      data: [
        {
          id: 'an1',
          model: 'm',
          result: { name: 'Suggested name', color: 'Black' },
          pottery: analysed,
        },
        { id: 'an2', model: 'm', result: {}, pottery: analysed },
        { id: 'an3', model: 'm', result: {}, pottery: null },
      ],
    });
    mock.queueResult({ data: [analysed, flagged] });
  }

  it('is empty when nothing needs review, including when loading fails', async () => {
    mock.queueResult({ data: null });
    mock.queueResult({ data: null });
    renderWithToast(<ReviewPage />);
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
  });

  it('applies suggestions, saves, and advances', async () => {
    loadQueue();
    renderWithToast(<ReviewPage />);
    expect(await screen.findByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Needs AI' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Name' }));
    expect(screen.getByRole('heading', { name: 'Suggested name' })).toBeInTheDocument();
    expect(screen.getByText('AI-suggested fields to verify')).toBeInTheDocument();
    mock.queueResult({ data: [{ ...analysed, name: 'Suggested name', ai_fields: ['name'] }] });
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Save & next' }));
    expect(await screen.findByText('P0010 saved')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flagged' })).toBeInTheDocument();
  });

  it('verifies flagged fields and drops finished pieces from the queue', async () => {
    loadQueue();
    renderWithToast(<ReviewPage />);
    await screen.findByText('1 / 2');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Flagged' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Color/));
    fireEvent.click(screen.getByLabelText(/Color/));
    fireEvent.click(screen.getByRole('button', { name: 'Verify all' }));
    expect(screen.getByLabelText(/Color/)).toBeChecked();
    mock.queueResult({ data: [{ ...flagged, ai_fields: [] }] });
    fireEvent.click(screen.getByRole('button', { name: 'Save & next' }));
    expect(await screen.findByText('P0011 saved')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    const update = mock.lastBuilder();
    expect(update.update.mock.calls[0][0]).toEqual({ ai_fields: [] });
  });

  it('dismisses an analysis and supports keyboard navigation', async () => {
    loadQueue();
    renderWithToast(<ReviewPage />);
    await screen.findByText('1 / 2');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('heading', { name: 'Needs AI' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    mock.queueResult({ data: [analysed] });
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss AI' }));
    expect(await screen.findByText('P0010 saved')).toBeInTheDocument();
    expect(mock.lastBuilder().update).toHaveBeenCalledWith({ status: 'dismissed' });
    expect(screen.getByRole('heading', { name: 'Flagged' })).toBeInTheDocument();
  });

  it('reports save errors', async () => {
    loadQueue();
    renderWithToast(<ReviewPage />);
    await screen.findByText('1 / 2');
    fireEvent.click(screen.getByRole('button', { name: /Apply all/ }));
    mock.queueResult({ data: [analysed] });
    mock.queueResult({ error: { message: 'status failed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & next' }));
    expect(await screen.findByText('status failed')).toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  const rows = [
    makeItem({
      id: '1',
      sku: 'P0001',
      case_id: 'A',
      ai_fields: ['name'],
      provenance: 'x',
      dimensions: '1in',
    }),
    makeItem({
      id: '2',
      sku: 'P0002',
      culture_id: null,
      tribe_culture: 'Classic Maya',
      region: null,
      period_start_year: null,
      period_end_year: null,
      age: '600–900 CE',
      thumbs: [],
    }),
  ];

  function loadDashboard() {
    mock.queueResult({ data: rows });
    mock.queueResult({ count: 3 });
    mock.queueResult({
      data: [
        { id: 'A', capacity: 1 },
        { id: 'B', capacity: 10 },
      ],
    });
    mock.queueResult({
      data: [
        {
          id: 1,
          record_id: '1',
          operation: 'UPDATE',
          changed_at: '2026-01-01T00:00:00Z',
          old_row: { name: 'a' },
          new_row: { name: 'b' },
        },
        {
          id: 2,
          record_id: 'gone',
          operation: 'DELETE',
          changed_at: '2026-01-01T00:00:00Z',
          old_row: {},
          new_row: null,
        },
      ],
    });
  }

  it('shows health tiles, case capacity and recent activity', async () => {
    loadDashboard();
    renderWithToast(<DashboardPage />);
    const review = await screen.findByRole('link', { name: /Needs review/ });
    await waitFor(() => expect(review).toHaveTextContent('4'));
    expect(screen.getByRole('link', { name: /Unassigned to a case/ })).toHaveTextContent('1');
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText('Changed name')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'P0001' })).toHaveAttribute('href', '/item/P0001');
  });

  it('shows empty activity and a load failure', async () => {
    mock.queueResult({ error: { message: 'no access' } });
    mock.queueResult({ count: null });
    mock.queueResult({ data: null });
    mock.queueResult({ data: null });
    renderWithToast(<DashboardPage />);
    expect(await screen.findByText('no access')).toBeInTheDocument();
  });

  it('classifies legacy pieces', async () => {
    loadDashboard();
    renderWithToast(<DashboardPage />);
    const [run] = await screen.findAllByRole('button', { name: 'Run (1)' });
    mock.queueResult({});
    loadDashboard();
    fireEvent.click(screen.getAllByRole('button', { name: /Run \(1\)/ })[1]);
    expect(await screen.findByText('Classified 1 pieces')).toBeInTheDocument();
    expect(mock.builders.find((b) => b.update.mock.calls.length)!.update).toHaveBeenCalledWith({
      culture_id: 'maya',
      region: 'Mesoamerica',
      period_start_year: 600,
      period_end_year: 900,
    });
    expect(run).toBeInTheDocument();
  });

  it('reports classification failures', async () => {
    loadDashboard();
    renderWithToast(<DashboardPage />);
    await screen.findAllByRole('button', { name: /Run \(1\)/ });
    mock.queueResult({ error: { message: 'x' } });
    loadDashboard();
    fireEvent.click(screen.getAllByRole('button', { name: /Run \(1\)/ })[1]);
    expect(await screen.findByText('1 pieces could not be updated')).toBeInTheDocument();
  });

  it('generates missing thumbnails', async () => {
    stubImageAndCanvas();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(new Blob(['x'])))),
    );
    loadDashboard();
    renderWithToast(<DashboardPage />);
    const [thumbs] = await screen.findAllByRole('button', { name: /Run \(1\)/ });
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/P0001/thumbs/a.jpg` } });
    mock.queueResult({});
    loadDashboard();
    fireEvent.click(thumbs);
    expect(await screen.findByText('Thumbnails generated')).toBeInTheDocument();
  });

  it('reports thumbnail failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 500 }))),
    );
    loadDashboard();
    renderWithToast(<DashboardPage />);
    const [thumbs] = await screen.findAllByRole('button', { name: /Run \(1\)/ });
    loadDashboard();
    fireEvent.click(thumbs);
    expect(await screen.findByText('1 pieces could not be processed')).toBeInTheDocument();
  });

  it('exports a CSV merging private fields', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    loadDashboard();
    renderWithToast(<DashboardPage />);
    await screen.findByText('Changed name');
    mock.queueResult({ data: [rows[0]] });
    mock.queueResult({ data: [makeItem({ id: '9', status: 'Archived' })] });
    mock.queueResult({ data: [{ pottery_id: '1', seller_donator: 'Estate' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await screen.findByText('Exported 2 pieces')).toBeInTheDocument();
    const blob = create.mock.calls[0][0] as Blob;
    expect(await blob.text()).toContain('Estate');
  });

  it('reports export failures', async () => {
    loadDashboard();
    renderWithToast(<DashboardPage />);
    await screen.findByText('Changed name');
    mock.queueResult({ data: [] });
    mock.queueResult({ data: [] });
    mock.queueResult({ error: { message: 'private denied' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await screen.findByText('private denied')).toBeInTheDocument();
  });
});

describe('Printable catalog', () => {
  it('lists every active piece and prints', async () => {
    mock.queueResult({
      data: [
        makeItem({ case_id: 'A', dimensions: '5in' }),
        makeItem({
          id: '2',
          sku: 'P0002',
          name: 'Plain',
          culture_id: null,
          tribe_culture: 'Local',
          period_start_year: null,
          period_end_year: null,
          age: null,
          condition: null,
        }),
      ],
    });
    renderWithToast(<PrintCatalogPage />);
    expect(await screen.findByText('Ramey Incised Jar')).toBeInTheDocument();
    expect(screen.getByText('Mississippian · 1050–1200 CE')).toBeInTheDocument();
    expect(screen.getByText('Good · 5in · A — Left Tower')).toBeInTheDocument();
    expect(screen.getByText('Local')).toBeInTheDocument();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: /Print/ }));
    expect(print).toHaveBeenCalled();
  });

  it('shows load errors', async () => {
    mock.queueResult({ error: { message: 'denied' } });
    renderWithToast(<PrintCatalogPage />);
    expect(await screen.findByText('denied')).toBeInTheDocument();
  });
});
