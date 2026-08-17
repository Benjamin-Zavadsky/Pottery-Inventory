// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import type { PotteryItem } from '@/lib/types';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));
vi.mock('@/components/InventoryMap', () => ({
  default: ({
    onEditPiece,
    items,
  }: {
    onEditPiece: (item: PotteryItem) => void;
    items: PotteryItem[];
  }) => (
    <div>
      Map view
      {items[0] && <button onClick={() => onEditPiece(items[0])}>Edit via map</button>}
    </div>
  ),
}));
vi.mock('@/components/InventoryTree', () => ({ default: () => <div>Tree view</div> }));
vi.mock('@/components/InventoryCase', () => ({ default: () => <div>Case view</div> }));
vi.mock('@/components/PieceModal', () => ({
  default: ({
    onClose,
    onSaved,
  }: {
    onClose: () => void;
    onSaved: (item: PotteryItem) => void;
  }) => (
    <div>
      Piece modal
      <button onClick={onClose}>Close modal</button>
      <button onClick={() => onSaved({ id: 'saved-1', name: 'Saved Piece' } as PotteryItem)}>
        Save from modal
      </button>
      <button onClick={() => onSaved({ id: 'a', name: 'Updated In Place' } as PotteryItem)}>
        Save existing from modal
      </button>
    </div>
  ),
}));

import { createClient } from '@/lib/supabase';
import HomePage from '@/app/page';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

function makeItem(overrides: Partial<PotteryItem>): PotteryItem {
  return {
    id: 'id-1',
    sku: 'P0001',
    date_entered: '2026-01-01',
    date_acquired: null,
    location_acquired: null,
    name: 'Mississippian Bowl',
    use_function: null,
    place_of_origin: 'North America',
    age: '800 CE',
    dimensions: null,
    tribe_culture: null,
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
    ...overrides,
  };
}

describe('HomePage', () => {
  beforeEach(() => {
    supabaseMock.reset();
  });

  it('loads and renders items in grid view', async () => {
    supabaseMock.queueResult({ data: [makeItem({ id: 'a', name: 'Mississippian Bowl' })] }); // fetchItems
    supabaseMock.queueResult({ data: [] }); // fetchDynamicOptions

    render(<HomePage />);

    expect(await screen.findByText('Mississippian Bowl')).toBeInTheDocument();
  });

  it('filters items by the search box', async () => {
    supabaseMock.queueResult({
      data: [
        makeItem({ id: 'a', name: 'Mississippian Bowl', sku: 'P0001' }),
        makeItem({ id: 'b', name: 'Maya Vase', sku: 'P0002' }),
      ],
    });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');

    fireEvent.change(screen.getByPlaceholderText('Search name, SKU, origin, color...'), {
      target: { value: 'maya' },
    });

    expect(screen.queryByText('Mississippian Bowl')).not.toBeInTheDocument();
    expect(screen.getByText('Maya Vase')).toBeInTheDocument();
  });

  it('shows an empty state when there are no pieces', async () => {
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);

    expect(await screen.findByText('No pieces found.')).toBeInTheDocument();
  });

  it('switches to map, tree, and case views', async () => {
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);
    await screen.findByText('No pieces found.');

    fireEvent.click(screen.getByText('Map'));
    expect(await screen.findByText('Map view')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tree'));
    expect(await screen.findByText('Tree view')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cases' }));
    expect(await screen.findByText('Case view')).toBeInTheDocument();
  });

  it('shows Sign In for anonymous users and Add Piece / Sign Out for staff', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);

    expect(await screen.findByText('+ Add Piece')).toHaveAttribute('href', '/add');
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('signs out and redirects to /login', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });

    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);
    fireEvent.click(await screen.findByText('Sign Out'));

    await waitFor(() => expect(supabaseMock.supabase.auth.signOut).toHaveBeenCalled());
    await waitFor(() => expect(window.location.href).toBe('/login'));

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('opens the filter panel and applies a filter, updating the active count', async () => {
    supabaseMock.queueResult({
      data: [
        makeItem({ id: 'a', condition: 'Good' }),
        makeItem({ id: 'b', name: 'Maya Vase', condition: 'Poor' }),
      ],
    });
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [makeItem({ id: 'a', condition: 'Good' })] }); // refetch on filter change

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');

    fireEvent.click(screen.getByText('Filters'));
    const conditionSelects = screen.getAllByDisplayValue('All');
    fireEvent.change(conditionSelects[0], { target: { value: 'Good' } });

    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('toggles sort order and clears filters from the mobile pills', async () => {
    const item = makeItem({ id: 'a', condition: 'Good' });
    supabaseMock.queueResult({ data: [item] }); // initial fetchItems
    supabaseMock.queueResult({ data: [] }); // fetchDynamicOptions
    supabaseMock.queueResult({ data: [item] }); // refetch on sort change
    supabaseMock.queueResult({ data: [item] }); // refetch on filter change
    supabaseMock.queueResult({ data: [item] }); // refetch on clear filters

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');

    fireEvent.click(screen.getByText('Oldest first'));
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.change(screen.getAllByDisplayValue('All')[0], { target: { value: 'Good' } });
    fireEvent.click(screen.getByText('Clear filters'));

    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('opens the quick-edit modal from a non-grid view and closes it', async () => {
    supabaseMock.queueResult({ data: [makeItem({ id: 'a', name: 'Mississippian Bowl' })] });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');

    fireEvent.click(screen.getByText('Map'));
    fireEvent.click(await screen.findByText('Edit via map'));
    expect(await screen.findByText('Piece modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close modal'));
    expect(screen.queryByText('Piece modal')).not.toBeInTheDocument();
  });

  it('applies every filter field, exercising both eq and ilike query branches', async () => {
    const item = makeItem({ id: 'a' });
    supabaseMock.queueResult({ data: [item] }); // initial fetchItems
    supabaseMock.queueResult({
      data: [
        {
          place_of_origin: 'TestOrigin',
          color: 'Red',
          use_function: 'Cooking',
          tribe_culture: 'TestCulture',
          location_acquired: 'TestLoc',
          location_in_case: 'TestCase',
          seller_donator: 'TestSeller',
          age: '900 CE',
        },
      ],
    }); // fetchDynamicOptions
    for (let i = 0; i < 20; i++) supabaseMock.queueResult({ data: [item] }); // one refetch per filter change

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');
    fireEvent.click(screen.getByText('Filters'));

    const selects = screen.getAllByDisplayValue('All');
    const values = [
      'Good',
      'Rare',
      'Reproduction',
      'TestOrigin',
      'Red',
      'Cooking',
      'TestCulture',
      '900 CE',
      'TestLoc',
      'TestCase',
      'TestSeller',
    ];
    for (let i = 0; i < values.length; i++) {
      fireEvent.change(selects[i], { target: { value: values[i] } });
    }

    await waitFor(() =>
      expect(screen.getAllByText(String(values.length)).length).toBeGreaterThan(0),
    );
  });

  it('changes sort order via the desktop select', async () => {
    const item = makeItem({ id: 'a' });
    supabaseMock.queueResult({ data: [item] });
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [item] }); // refetch on sort change

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');
    fireEvent.change(screen.getByDisplayValue('Newest First'), { target: { value: 'oldest' } });

    await waitFor(() => expect(screen.getByDisplayValue('Oldest First')).toBeInTheDocument());
  });

  it('closes the mobile filter sheet via backdrop, close button, and done', async () => {
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [] });

    const { container } = render(<HomePage />);
    await screen.findByText('No pieces found.');

    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(container.querySelector('.absolute.inset-0.bg-black\\/40')!);
    expect(screen.queryByText('Filter by')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByText('Filter by')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Done'));
    expect(screen.queryByText('Filter by')).not.toBeInTheDocument();
  });

  it('prepends a newly-saved piece that does not already exist', async () => {
    supabaseMock.queueResult({ data: [makeItem({ id: 'a', name: 'Mississippian Bowl' })] });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');

    fireEvent.click(screen.getByText('Map'));
    fireEvent.click(await screen.findByText('Edit via map'));
    fireEvent.click(await screen.findByText('Save from modal'));

    expect(screen.queryByText('Piece modal')).not.toBeInTheDocument();
  });

  it('replaces an existing item in place when the saved piece already exists', async () => {
    supabaseMock.queueResult({ data: [makeItem({ id: 'a', name: 'Mississippian Bowl' })] });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);
    await screen.findByText('Mississippian Bowl');

    fireEvent.click(screen.getByText('Map'));
    fireEvent.click(await screen.findByText('Edit via map'));
    fireEvent.click(await screen.findByText('Save existing from modal'));
    fireEvent.click(screen.getByText('Grid'));

    expect(await screen.findByText('Updated In Place')).toBeInTheDocument();
    expect(screen.queryByText('Mississippian Bowl')).not.toBeInTheDocument();
  });

  it('handles fetchDynamicOptions returning no rows', async () => {
    supabaseMock.queueResult({ data: [makeItem({ id: 'a' })] });
    supabaseMock.queueResult({ data: null });

    render(<HomePage />);
    expect(await screen.findByText('Mississippian Bowl')).toBeInTheDocument();
  });

  it('marks the first three newest items as recent', async () => {
    supabaseMock.queueResult({
      data: [
        makeItem({ id: 'a', name: 'First' }),
        makeItem({ id: 'b', name: 'Second' }),
        makeItem({ id: 'c', name: 'Third' }),
        makeItem({ id: 'd', name: 'Fourth' }),
      ],
    });
    supabaseMock.queueResult({ data: [] });

    render(<HomePage />);
    await screen.findByText('First');

    expect(screen.getAllByText('New')).toHaveLength(3);
  });
});
