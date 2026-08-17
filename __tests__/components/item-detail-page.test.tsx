// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { stubImageAndCanvas, makeFile } from '../support/browser';
import type { PotteryItem } from '@/lib/types';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'p1' }),
  useRouter: () => ({ push: mockPush }),
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import ItemPage from '@/app/item/[id]/page';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

const baseItem: PotteryItem = {
  id: 'p1',
  sku: 'P0001',
  date_entered: '2026-01-01',
  date_acquired: null,
  location_acquired: null,
  name: 'Existing Vessel',
  use_function: null,
  place_of_origin: 'North America',
  age: '800 CE',
  dimensions: null,
  tribe_culture: 'Mississippian',
  appraised_value: null,
  acquisition_cost: null,
  color: 'Brown',
  rarity: null,
  museums_comparable: null,
  location_in_case: null,
  case_id: null,
  condition: 'Good',
  originality: null,
  seller_donator: null,
  provenance: null,
  appraisal_date: null,
  appraiser_name: null,
  status: 'Active',
  research_notes: null,
  description: null,
  photos: [],
  created_at: '2026-01-01',
};

describe('ItemPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    supabaseMock.supabase.storage.from.mockClear();
    supabaseMock.setUser(null);
    stubImageAndCanvas();
  });

  it('shows a loading state before the item resolves', () => {
    supabaseMock.queueResult({ data: baseItem });
    render(<ItemPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the item once loaded', async () => {
    supabaseMock.queueResult({ data: baseItem });
    render(<ItemPage />);
    expect(await screen.findByText('Existing Vessel')).toBeInTheDocument();
    expect(screen.getByText('North America')).toBeInTheDocument();
  });

  it('does not show Edit for anonymous visitors', async () => {
    supabaseMock.queueResult({ data: baseItem });
    render(<ItemPage />);
    await screen.findByText('Existing Vessel');
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('lets a staff member switch into edit mode', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: baseItem });
    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    expect(screen.getByDisplayValue('Existing Vessel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('saves edits and exits edit mode', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: baseItem }); // initial load
    supabaseMock.queueResult({ data: null, error: null }); // update()
    supabaseMock.queueResult({ data: { ...baseItem, name: 'Renamed Vessel' } }); // reload

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.change(screen.getByDisplayValue('Existing Vessel'), {
      target: { value: 'Renamed Vessel' },
    });
    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText('Renamed Vessel')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('archives the piece after confirmation and redirects home', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: baseItem });
    supabaseMock.queueResult({ data: null, error: null }); // update to Archived
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Archive'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('does not archive when the confirmation is dismissed', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: baseItem });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Archive'));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows an error when the only photo is removed before analyzing', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.click(document.querySelector('.absolute.-top-1\\.5.-right-1\\.5')!);
    fireEvent.click(screen.getByText('Re-analyze with AI'));

    expect(await screen.findByText('No photos found to analyze')).toBeInTheDocument();
  });

  it('runs AI analysis and shows the suggestions banner', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://example.com/p.jpg') {
        return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      }
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ name: 'AI Suggested Name' })),
      });
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Analyze with AI'));

    expect(await screen.findByText('AI Suggested Name')).toBeInTheDocument();
  });

  it('shows the analysis error banner when the API returns an error field', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://example.com/p.jpg') {
        return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      }
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ error: 'Analysis failed upstream' })),
      });
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Analyze with AI'));

    expect(await screen.findByText('Analysis failed upstream')).toBeInTheDocument();
  });

  it('shows a fetch failure error when the photo cannot be retrieved', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Analyze with AI'));

    expect(await screen.findByText('Failed to fetch photo (404)')).toBeInTheDocument();
  });

  it('applies a suggestion directly to the DB when not in edit mode', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });
    supabaseMock.queueResult({ data: null, error: null }); // applySuggestion update

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://example.com/p.jpg') {
        return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      }
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ name: 'AI Suggested Name' })),
      });
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Analyze with AI'));
    await screen.findByText('AI Suggested Name');
    fireEvent.click(screen.getByText('Apply'));

    await waitFor(() => expect(screen.getAllByText('AI Suggested Name').length).toBeGreaterThan(0));
  });

  it('applies all suggestions at once while editing', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://example.com/p.jpg') {
        return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      }
      return Promise.resolve({
        text: () =>
          Promise.resolve(JSON.stringify({ name: 'AI Suggested Name', color: 'Slate Grey' })),
      });
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.click(screen.getByText('Re-analyze with AI'));
    await screen.findByText('AI Suggested Name');
    fireEvent.click(screen.getByText('Apply All'));

    expect(screen.getByDisplayValue('AI Suggested Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Slate Grey')).toBeInTheDocument();
  });

  it('permanently deletes an archived piece after confirmation', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, status: 'Archived' } });
    supabaseMock.queueResult({ data: null, error: null }); // delete()
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Delete'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('renders the full set of optional info fields when populated', async () => {
    supabaseMock.queueResult({
      data: {
        ...baseItem,
        use_function: 'Ceremonial',
        dimensions: '8"H',
        rarity: 'Rare',
        originality: 'Suspected Original',
        case_id: 'A',
        date_acquired: '2020-01-01',
        location_acquired: 'Estate Sale',
        seller_donator: 'Jane Doe',
        provenance: 'Private collection',
        appraised_value: 500,
        acquisition_cost: 200,
        museums_comparable: 'Smithsonian',
        description: 'A fine example.',
        research_notes: 'Needs further research.',
      },
    });

    render(<ItemPage />);
    await screen.findByText('Existing Vessel');

    expect(screen.getByText('Ceremonial')).toBeInTheDocument();
    expect(screen.getByText('A — Left Tower')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('A fine example.')).toBeInTheDocument();
    expect(screen.getByText('Needs further research.')).toBeInTheDocument();
  });

  it('does not delete when the confirmation is dismissed', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, status: 'Archived' } });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Delete'));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('uploads a new photo added while editing and analyzes it via resizeFile', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });
    supabaseMock.queueResult({ data: null, error: null }); // update() on save

    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ name: 'Resized File Name' })),
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    // remove the only existing photo so resizeFile (not resizeUrl) is exercised
    fireEvent.click(document.querySelector('.absolute.-top-1\\.5.-right-1\\.5')!);

    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    fireEvent.change(screen.getByPlaceholderText(/Share your thoughts/i), {
      target: { value: 'Found near a midden' },
    });
    fireEvent.click(screen.getByText('Re-analyze with AI'));

    expect(await screen.findByText('Resized File Name')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Apply'));
    expect(screen.getByDisplayValue('Resized File Name')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.queryByText('Saving...')).not.toBeInTheDocument());
  });

  it('removes a newly added photo before saving', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });

    const removeButtons = document.querySelectorAll('.absolute.-top-1\\.5.-right-1\\.5');
    expect(removeButtons.length).toBe(2);
    fireEvent.click(removeButtons[1]); // the newly-added preview's remove button
    expect(document.querySelectorAll('.absolute.-top-1\\.5.-right-1\\.5').length).toBe(1);
  });

  it('cancels edit mode via the Cancel button, discarding changes', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: baseItem });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.change(screen.getByDisplayValue('Existing Vessel'), {
      target: { value: 'Unsaved Name' },
    });
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Existing Vessel')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved Name')).not.toBeInTheDocument();
  });

  it('switches the active photo via the thumbnail strip', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({
      data: { ...baseItem, photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] },
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));
    const thumbnails = document.querySelectorAll('button img');
    expect(thumbnails.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(thumbnails[1].closest('button')!);
    expect(thumbnails[1].closest('button')).toHaveClass('border-[#111]');
  });

  it('applies all suggestions at once directly to the DB when not editing', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });
    supabaseMock.queueResult({ data: null, error: null }); // applyAllSuggestions update

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://example.com/p.jpg') {
        return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      }
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ name: 'AI Name', color: 'Buff' })),
      });
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Analyze with AI'));
    await screen.findByText('AI Name');
    fireEvent.click(screen.getByText('Apply All'));

    await waitFor(() => expect(screen.getAllByText('AI Name').length).toBeGreaterThan(0));
  });

  it('resizes a portrait-oriented existing photo (height greater than width)', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: { ...baseItem, photos: ['https://example.com/p.jpg'] } });

    class TallImage {
      onload: (() => void) | null = null;
      width = 100;
      height = 300;
      private _src = '';
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => this.onload?.());
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', TallImage);
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://example.com/p.jpg') {
        return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      }
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ name: 'Portrait Photo' })),
      });
    });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Analyze with AI'));
    expect(await screen.findByText('Portrait Photo')).toBeInTheDocument();
  });

  it('fills in every EditForm field', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: baseItem });
    supabaseMock.queueResult({ data: null, error: null }); // update()
    supabaseMock.queueResult({ data: baseItem }); // reload

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));

    const inputs = document.querySelectorAll('input:not([type=file])');
    const textareas = document.querySelectorAll('textarea');
    const selects = document.querySelectorAll('select');

    // name, place_of_origin, age, color, use_function, tribe_culture, dimensions
    fireEvent.change(inputs[0], { target: { value: 'Renamed' } });
    fireEvent.change(inputs[1], { target: { value: 'Mesoamerica' } });
    fireEvent.change(inputs[2], { target: { value: '900 CE' } });
    fireEvent.change(inputs[3], { target: { value: 'Buff' } });
    fireEvent.change(inputs[4], { target: { value: 'Cooking' } });
    fireEvent.change(inputs[5], { target: { value: 'Maya' } });
    fireEvent.change(inputs[6], { target: { value: '10"H' } });

    fireEvent.change(selects[0], { target: { value: 'A' } }); // case_id
    fireEvent.change(selects[1], { target: { value: 'Good' } }); // condition
    fireEvent.change(selects[2], { target: { value: 'Rare' } }); // rarity
    fireEvent.change(selects[3], { target: { value: 'Reproduction' } }); // originality

    fireEvent.change(inputs[7], { target: { value: '2020-01-01' } }); // date_acquired
    fireEvent.change(inputs[8], { target: { value: 'Estate Sale' } }); // location_acquired
    fireEvent.change(inputs[9], { target: { value: 'Jane Doe' } }); // seller_donator
    fireEvent.change(inputs[10], { target: { value: '250' } }); // appraised_value
    fireEvent.change(inputs[11], { target: { value: '100' } }); // acquisition_cost
    fireEvent.change(inputs[12], { target: { value: 'Private collection' } }); // provenance
    fireEvent.change(inputs[13], { target: { value: 'Smithsonian' } }); // museums_comparable

    fireEvent.change(textareas[0], { target: { value: 'Needs research' } }); // research_notes
    fireEvent.change(textareas[1], { target: { value: 'A description.' } }); // description

    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.queryByText('Saving...')).not.toBeInTheDocument());
  });

  it('clears numeric fields back to null and blanks tribe_culture/condition', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({
      data: {
        ...baseItem,
        appraised_value: 500,
        acquisition_cost: 200,
        tribe_culture: null,
        condition: null,
      },
    });
    supabaseMock.queueResult({ data: null, error: null });
    supabaseMock.queueResult({ data: baseItem });

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));

    const inputs = document.querySelectorAll('input:not([type=file])');
    fireEvent.change(inputs[10], { target: { value: '' } }); // appraised_value -> null
    fireEvent.change(inputs[11], { target: { value: '' } }); // acquisition_cost -> null
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(screen.queryByText('Saving...')).not.toBeInTheDocument());
  });

  it('logs a case move to location_history when the case changes on save', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: baseItem }); // initial load
    supabaseMock.queueResult({ data: null, error: null }); // update()
    supabaseMock.queueResult({ data: null, error: null }); // location_history insert
    supabaseMock.queueResult({ data: { ...baseItem, case_id: 'A' } }); // reload

    render(<ItemPage />);
    fireEvent.click(await screen.findByText('Edit'));

    const caseSelect = screen.getByDisplayValue('— Unassigned —');
    fireEvent.change(caseSelect, { target: { value: 'A' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(screen.queryByText('Saving...')).not.toBeInTheDocument());
    expect(supabaseMock.supabase.storage.from).not.toHaveBeenCalled();
  });
});
