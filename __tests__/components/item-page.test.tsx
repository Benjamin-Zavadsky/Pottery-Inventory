// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, renderWithToast, screen, waitFor, within } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeFile, stubImageAndCanvas } from '../support/browser';
import { STORAGE, makeItem, makeSummary } from '../support/fixtures';
import type { PotteryItem } from '@/lib/types';

let id = 'P0001';
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id }),
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/item/P0001',
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import ItemView from '@/app/(public)/item/[id]/_components/ItemView';

const mock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  mock.supabase as unknown as ReturnType<typeof createClient>,
);

const piece = makeItem({
  description: 'A shell-tempered jar.',
  provenance: 'Private collection, Ohio, before 1970',
  ai_fields: ['description'],
  date_acquired: '2024-03-15',
  case_id: 'A',
  photos: [`${STORAGE}/P0001/a.jpg`, `${STORAGE}/P0001/b.jpg`],
  thumbs: [`${STORAGE}/P0001/thumbs/a.jpg`, `${STORAGE}/P0001/thumbs/b.jpg`],
});
const privateRow = {
  pottery_id: 'id-1',
  acquisition_cost: 250,
  appraised_value: null,
  appraisal_date: '2024-02-01',
  appraiser_name: null,
  seller_donator: 'Estate of A. Smith',
};

function loadPublic(
  item: PotteryItem | null = piece,
  related: unknown[] | null = [makeSummary({ id: 'r1', sku: 'P0009', name: 'Sibling jar' })],
) {
  mock.queueResult({ data: item });
  if (item && related) mock.queueResult({ data: related });
}

function loadStaff(item: PotteryItem = piece, opts: { priv?: unknown; analyses?: unknown[] } = {}) {
  mock.setUser({ id: 'staff' });
  loadPublic(item, []);
  mock.queueResult({ data: opts.priv ?? privateRow });
  mock.queueResult({ data: opts.analyses ?? [] });
}

async function renderReady(name = piece.name) {
  renderWithToast(<ItemView />);
  const heading = await screen.findByRole('heading', { level: 1, name });
  await waitFor(() => expect(mock.pending()).toBe(0));
  return heading;
}

beforeEach(() => {
  mock.reset();
  push.mockClear();
  id = 'P0001';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Item page — public', () => {
  it('shows attribution, details, provenance and related pieces', async () => {
    loadPublic();
    await renderReady();
    expect(screen.getByText(/Mississippian · 1050–1200 CE/)).toBeInTheDocument();
    const attribution = screen.getByRole('region', { name: 'Attribution' });
    expect(within(attribution).getByText('North America')).toBeInTheDocument();
    expect(within(attribution).getByText('Cahokia, Illinois')).toBeInTheDocument();
    expect(screen.getByText('A — Left Tower')).toBeInTheDocument();
    expect(screen.getByText(new Date(2024, 2, 15).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText('Private collection, Ohio, before 1970')).toBeInTheDocument();
    expect(screen.getByText('AI-suggested')).toBeInTheDocument();
    expect(screen.getByText(/pending review/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sibling jar/ })).toHaveAttribute(
      'href',
      '/item/P0009',
    );
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Staff-only details' })).not.toBeInTheDocument();
  });

  it('prints, switches photos and opens the viewer', async () => {
    loadPublic();
    await renderReady();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Show photo 2' }));
    expect(screen.getByAltText(piece.name)).toHaveAttribute('src', piece.photos[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Open photo viewer' }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close photo viewer' }));
    expect(screen.queryByText('2 / 2')).not.toBeInTheDocument();
  });

  it('handles pieces without photos, culture or period', async () => {
    loadPublic(
      makeItem({
        photos: [],
        thumbs: [],
        culture_id: null,
        tribe_culture: 'Local ware',
        region: null,
        period_start_year: null,
        period_end_year: null,
        place_of_origin: null,
      }),
      null,
    );
    await renderReady();
    expect(screen.getByText('No photos yet')).toBeInTheDocument();
    expect(screen.getByText('Local ware')).toBeInTheDocument();
    expect(screen.queryByText('More from')).not.toBeInTheDocument();
  });

  it('shows not-found and error states', async () => {
    loadPublic(null);
    renderWithToast(<ItemView />);
    expect(await screen.findByText('Piece not found')).toBeInTheDocument();
    mock.reset();
    mock.queueResult({ error: { message: 'down' } });
    renderWithToast(<ItemView />);
    expect(await screen.findByText('Could not load this piece')).toBeInTheDocument();
  });

  it('survives a failing related-pieces query', async () => {
    mock.queueResult({ data: piece });
    mock.queueResult({ error: { message: 'x' } });
    await renderReady();
    expect(screen.queryByRole('region', { name: 'Related pieces' })).not.toBeInTheDocument();
  });
});

describe('Item page — staff', () => {
  it('shows private details and staff actions', async () => {
    loadStaff();
    await renderReady();
    const priv = await screen.findByRole('region', { name: 'Staff-only details' });
    expect(within(priv).getByText('Estate of A. Smith')).toBeInTheDocument();
    expect(within(priv).getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze with AI' })).toBeInTheDocument();
  });

  it('tolerates a failing private-fields query', async () => {
    mock.setUser({ id: 'staff' });
    loadPublic(piece, []);
    mock.queueResult({ error: { message: 'rls' } });
    mock.queueResult({ data: null });
    await renderReady();
    await waitFor(() => expect(mock.pending()).toBe(0));
    expect(screen.queryByRole('region', { name: 'Staff-only details' })).not.toBeInTheDocument();
  });

  it('edits and saves only changed fields, logging case moves and private changes', async () => {
    loadStaff();
    await renderReady();
    await screen.findByRole('region', { name: 'Staff-only details' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: 'Renamed jar' },
    });
    fireEvent.change(screen.getByLabelText(/^Display case/), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText('Appraised value ($)'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));

    const updated = { ...piece, name: 'Renamed jar', case_id: 'B', updated_at: '2026-02-01' };
    mock.queueResult({ data: [updated] });
    mock.queueResult({});
    mock.queueResult({});
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Renamed jar' })).toBeInTheDocument();

    const update = mock.builders.find((b) => b.update.mock.calls.length)!;
    expect(update.update.mock.calls[0][0]).toEqual({
      name: 'Renamed jar',
      case_id: 'B',
      photos: [piece.photos[0]],
      thumbs: [piece.thumbs[0]],
    });
    expect(mock.builders.find((b) => b.upsert.mock.calls.length)!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ appraised_value: 900 }),
    );
    expect(mock.bucket.remove).toHaveBeenCalledWith(['P0001/b.jpg', 'P0001/thumbs/b.jpg']);
  });

  it('warns when removed photos cannot be deleted from storage', async () => {
    loadStaff(piece, { priv: null });
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    mock.queueResult({ data: [piece] });
    mock.queueResult({ error: { message: 'denied' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/could not be deleted from storage/)).toBeInTheDocument();
  });

  it('validates before saving and reports conflicts', async () => {
    loadStaff();
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: ' ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: 'Ok' },
    });
    mock.queueResult({ data: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/changed by someone else/)).toBeInTheDocument();
  });

  it('uploads photos while editing, then cleans them up on cancel', async () => {
    stubImageAndCanvas();
    loadStaff();
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/P0001/new.jpg` } });
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/P0001/thumbs/new.jpg` } });
    fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: [makeFile()] } });
    expect(await screen.findByAltText('Photo 3')).toBeInTheDocument();
    mock.queueResult({});
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]);
    expect(mock.bucket.remove).toHaveBeenCalledWith(['P0001/new.jpg', 'P0001/thumbs/new.jpg']);
    expect(screen.getByRole('heading', { level: 1, name: piece.name })).toBeInTheDocument();
  });

  it('runs AI, applies a suggestion into edit mode, and records the analysis on save', async () => {
    loadStaff();
    await renderReady();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(Response.json({ name: 'AI name', culture_id: 'moche', confidence: 'Low' })),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Analyze with AI' }));
    expect(await screen.findByText('Low confidence')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Name' }));
    expect(screen.getByLabelText(/^Name/, { selector: 'input' })).toHaveValue('AI name');
    fireEvent.click(screen.getByRole('button', { name: /Apply all/ }));
    expect(screen.getByLabelText(/^Culture/, { selector: 'select' })).toHaveValue('moche');

    mock.queueResult({ data: [{ ...piece, name: 'AI name' }] });
    mock.queueResult({});
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    const update = mock.builders.find((b) => b.update.mock.calls.length)!;
    expect(update.update.mock.calls[0][0].ai_fields).toEqual(
      expect.arrayContaining(['description', 'name', 'culture_id', 'region']),
    );
    const insert = mock.builders.find((b) => b.insert.mock.calls.length)!;
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'applied' }));
  });

  it('re-analyzes with context while editing, and reports failures', async () => {
    loadStaff();
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Context for the AI'), {
      target: { value: 'From Arkansas' },
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ error: 'Rate limited' }, { status: 429 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    fireEvent.click(screen.getByRole('button', { name: 'Re-analyze with AI' }));
    expect(await screen.findByText('Analysis failed: Rate limited')).toBeInTheDocument();
    expect(
      JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
        .userContext,
    ).toBe('From Arkansas');
  });

  it('refuses to analyze without photos', async () => {
    loadStaff(makeItem({ photos: [], thumbs: [] }));
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze with AI' }));
    expect(await screen.findByText('Add a photo before running the analysis')).toBeInTheDocument();
  });

  it('surfaces a pending background analysis and dismisses it', async () => {
    loadStaff(piece, {
      analyses: [
        { id: 'an1', photo_urls: piece.photos, model: 'm', result: { name: 'Queued name' } },
      ],
    });
    await renderReady();
    expect(await screen.findByText('Queued name')).toBeInTheDocument();
    mock.queueResult({ error: { message: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(await screen.findByText('Could not record the AI analysis: nope')).toBeInTheDocument();
    expect(screen.queryByText('Queued name')).not.toBeInTheDocument();
  });

  it('marks a background analysis applied by id', async () => {
    loadStaff(piece, {
      analyses: [{ id: 'an1', photo_urls: piece.photos, model: 'm', result: { color: 'Black' } }],
    });
    await renderReady();
    fireEvent.click(await screen.findByRole('button', { name: 'Apply Color' }));
    mock.queueResult({ data: [piece] });
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Changes saved');
    const statusUpdate = mock.builders.filter((b) => b.update.mock.calls.length).at(-1)!;
    expect(statusUpdate.update).toHaveBeenCalledWith({ status: 'applied' });
  });

  it('verifies AI fields, archives and restores', async () => {
    loadStaff();
    await renderReady();
    mock.queueResult({ data: [{ ...piece, ai_fields: [] }] });
    fireEvent.click(screen.getByRole('button', { name: 'Verify AI fields' }));
    expect(await screen.findByText(/marked as verified/)).toBeInTheDocument();

    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    mock.queueResult({ data: [{ ...piece, ai_fields: [], status: 'Archived' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Piece archived')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
    mock.queueResult({ data: [{ ...piece, status: 'Active' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Piece restored')).toBeInTheDocument();
  });

  it('reports verify and archive failures', async () => {
    loadStaff();
    await renderReady();
    mock.queueResult({ error: { message: 'verify failed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify AI fields' }));
    expect(await screen.findByText('verify failed')).toBeInTheDocument();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mock.queueResult({ error: { message: 'archive failed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('archive failed')).toBeInTheDocument();
  });

  it('permanently deletes archived pieces and their photos', async () => {
    loadStaff(makeItem({ status: 'Archived' }));
    await renderReady();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    mock.queueResult({ data: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(await screen.findByText('Delete was not permitted')).toBeInTheDocument();
    mock.queueResult({ data: [{ id: 'id-1' }] });
    mock.queueResult({ error: { message: 'storage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });

  it('loads edit history on demand', async () => {
    loadStaff();
    await renderReady();
    mock.queueResult({
      data: [
        {
          id: 2,
          operation: 'UPDATE',
          changed_at: '2026-01-02T00:00:00Z',
          changed_by: 'staff',
          old_row: { name: 'a' },
          new_row: { name: 'b' },
        },
        {
          id: 1,
          operation: 'INSERT',
          changed_at: '2026-01-01T00:00:00Z',
          changed_by: 'other',
          old_row: null,
          new_row: {},
        },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Edit history' }));
    expect(await screen.findByText('Changed name')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText(/You$/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit history' }));
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('shows empty and failed history', async () => {
    loadStaff();
    await renderReady();
    mock.queueResult({ data: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Edit history' }));
    expect(await screen.findByText('No recorded changes yet.')).toBeInTheDocument();
  });

  it('shows a history load error', async () => {
    loadStaff();
    await renderReady();
    mock.queueResult({ error: { message: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit history' }));
    expect(await screen.findByText('x')).toBeInTheDocument();
  });
});
