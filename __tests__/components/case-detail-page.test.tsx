// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import type { PotteryItem } from '@/lib/types';

let currentId = 'A';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: currentId }),
}));

vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase';
import CaseDetailPage from '@/app/cases/[id]/page';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

const piece: PotteryItem = {
  id: 'p1',
  sku: 'P0001',
  date_entered: '2026-01-01',
  date_acquired: null,
  location_acquired: null,
  name: 'Case A Piece',
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
  photos: [],
  created_at: '2026-01-01',
};

describe('CaseDetailPage', () => {
  beforeEach(() => {
    supabaseMock.setUser(null);
    currentId = 'A';
  });

  it('shows an empty state with a link to add a piece when the case has none', async () => {
    supabaseMock.queueResult({ data: { id: 'A', name: 'A — Left Tower' } }); // case row
    supabaseMock.queueResult({ data: [] }); // pottery rows

    render(<CaseDetailPage />);

    expect(await screen.findByText('No pieces assigned to this case yet.')).toBeInTheDocument();
    expect(screen.getByText('Add a piece')).toHaveAttribute('href', '/add');
  });

  it('lists pieces assigned to the case', async () => {
    supabaseMock.queueResult({ data: { id: 'A', name: 'A — Left Tower' } });
    supabaseMock.queueResult({ data: [piece] });

    render(<CaseDetailPage />);

    expect(await screen.findByText('Case A Piece')).toBeInTheDocument();
    expect(screen.getByText('Case A Piece').closest('a')).toHaveAttribute('href', '/item/p1');
  });

  it('shows Mark Inventoried for authenticated users and updates on click', async () => {
    supabaseMock.setUser({ id: 'staff-1' });
    supabaseMock.queueResult({
      data: { id: 'A', name: 'A — Left Tower', last_inventoried_at: null },
    });
    supabaseMock.queueResult({ data: [piece] });
    supabaseMock.queueResult({ data: null, error: null }); // update() result

    render(<CaseDetailPage />);

    const button = await screen.findByText('Mark Inventoried');
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByText('Saving...')).not.toBeInTheDocument());
  });

  it('does not show Mark Inventoried for anonymous users', async () => {
    supabaseMock.queueResult({ data: { id: 'A', name: 'A — Left Tower' } });
    supabaseMock.queueResult({ data: [] });

    render(<CaseDetailPage />);

    await waitFor(() =>
      expect(screen.getByText('No pieces assigned to this case yet.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Mark Inventoried')).not.toBeInTheDocument();
  });

  it('falls back to the raw id in the header when the case is not in CASES', async () => {
    currentId = 'ZZZ';
    supabaseMock.queueResult({ data: null });
    supabaseMock.queueResult({ data: null }); // pottery rows -> null, exercises ?? [] fallback

    render(<CaseDetailPage />);

    expect(await screen.findByText('ZZZ')).toBeInTheDocument();
  });

  it('shows a photo thumbnail and plural count for multiple pieces', async () => {
    const piece2 = {
      ...piece,
      id: 'p2',
      name: 'Second Piece',
      photos: ['https://example.com/p.jpg'],
    };
    supabaseMock.queueResult({ data: { id: 'A', name: 'A — Left Tower' } });
    supabaseMock.queueResult({ data: [piece, piece2] });

    render(<CaseDetailPage />);

    expect(await screen.findByText('2 pieces')).toBeInTheDocument();
    expect(screen.getByText('Second Piece')).toBeInTheDocument();
  });
});
