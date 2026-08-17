// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import type { PotteryItem } from '@/lib/types';

vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase';
import PieceModal from '@/components/PieceModal';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

const existingItem: PotteryItem = {
  id: 'id-1',
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
  case_id: 'A',
  condition: 'Good',
  originality: null,
  seller_donator: null,
  provenance: null,
  appraisal_date: null,
  appraiser_name: null,
  status: 'Active',
  research_notes: null,
  description: null,
  photos: ['https://example.com/p.jpg'],
  created_at: '2026-01-01',
};

describe('PieceModal', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockClear();
  });

  it('requires a name before submitting in add mode', async () => {
    render(<PieceModal mode="add" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByText('Add Piece', { selector: 'button' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('creates a new piece on submit in add mode', async () => {
    const onSaved = vi.fn();
    supabaseMock.queueResult({ data: { id: 'x', name: 'New Piece' }, error: null, count: 3 });
    supabaseMock.queueResult({ data: { id: 'x', name: 'New Piece' }, error: null });

    render(<PieceModal mode="add" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Effigy Vessel'), {
      target: { value: 'New Piece' },
    });
    fireEvent.click(screen.getByText('Add Piece', { selector: 'button' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 'x', name: 'New Piece' }));
  });

  it('pre-fills the form from the item in edit mode', () => {
    render(<PieceModal mode="edit" item={existingItem} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByDisplayValue('Existing Vessel')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('surfaces the error message when the save fails', async () => {
    supabaseMock.queueResult({ data: null, error: null, count: 0 });
    supabaseMock.queueResult({ data: null, error: { message: 'insert failed' } });

    render(<PieceModal mode="add" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Effigy Vessel'), {
      target: { value: 'Broken Piece' },
    });
    fireEvent.click(screen.getByText('Add Piece', { selector: 'button' }));

    expect(await screen.findByText('insert failed')).toBeInTheDocument();
  });

  it('falls back to empty/null defaults when the item has no optional fields set, and saves blanks', async () => {
    const bareItem: PotteryItem = {
      ...existingItem,
      tribe_culture: null,
      age: '',
      condition: null,
      case_id: null,
      photos: [],
    };
    const onSaved = vi.fn();
    supabaseMock.queueResult({ data: { ...bareItem, name: 'Bare Vessel' }, error: null });

    render(<PieceModal mode="edit" item={bareItem} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('falls back to a generic error message when the thrown error has no message', async () => {
    supabaseMock.queueResult({ data: null, error: null, count: 0 });
    supabaseMock.queueResult({ data: null, error: {} });

    render(<PieceModal mode="add" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Effigy Vessel'), {
      target: { value: 'Broken Piece' },
    });
    fireEvent.click(screen.getByText('Add Piece', { selector: 'button' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<PieceModal mode="add" onClose={onClose} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('fills in every optional field and submits', async () => {
    const onSaved = vi.fn();
    supabaseMock.queueResult({ count: 0 });
    supabaseMock.queueResult({ data: { id: 'y' }, error: null });

    const { container } = render(<PieceModal mode="add" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Effigy Vessel'), {
      target: { value: 'Full Piece' },
    });
    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'Mississippian' } }); // culture
    fireEvent.change(selects[1], { target: { value: 'Good' } }); // condition
    fireEvent.change(selects[2], { target: { value: 'A' } }); // case
    fireEvent.change(screen.getByPlaceholderText('e.g. 800–1200 CE'), {
      target: { value: '800 CE' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com/x.jpg' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional research notes...'), {
      target: { value: 'Some notes' },
    });

    fireEvent.click(screen.getByText('Add Piece', { selector: 'button' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 'y' }));
  });

  it('saves changes in edit mode, replacing the first photo when a new URL is set', async () => {
    const onSaved = vi.fn();
    supabaseMock.queueResult({ data: { ...existingItem, name: 'Updated Vessel' }, error: null });

    render(<PieceModal mode="edit" item={existingItem} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByDisplayValue('Existing Vessel'), {
      target: { value: 'Updated Vessel' },
    });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Vessel' })),
    );
  });

  it('falls back to the item unchanged when condition and age are left blank in edit mode', async () => {
    const onSaved = vi.fn();
    const itemNoPhotos = { ...existingItem, photos: [] };
    supabaseMock.queueResult({ data: itemNoPhotos, error: null });

    render(<PieceModal mode="edit" item={itemNoPhotos} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});
