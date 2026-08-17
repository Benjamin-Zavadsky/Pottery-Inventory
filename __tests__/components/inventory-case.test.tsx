// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../support/render';
import InventoryCase from '@/components/InventoryCase';
import type { PotteryItem } from '@/lib/types';

function makeItem(overrides: Partial<PotteryItem>): PotteryItem {
  return {
    id: 'id-1',
    sku: 'P0001',
    date_entered: '2026-01-01',
    date_acquired: null,
    location_acquired: null,
    name: 'Test Vessel',
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

describe('InventoryCase', () => {
  it('groups pieces under their assigned case', () => {
    const items = [makeItem({ id: 'a', name: 'Case A Piece', case_id: 'A' })];
    render(<InventoryCase items={items} onEditPiece={vi.fn()} />);
    expect(screen.getByText('Case A Piece')).toBeInTheDocument();
    expect(screen.getByText('A — Left Tower')).toBeInTheDocument();
  });

  it('shows unassigned pieces in their own group, collapsed by default', () => {
    const items = [makeItem({ id: 'b', name: 'Loose Piece', case_id: null })];
    render(<InventoryCase items={items} onEditPiece={vi.fn()} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.queryByText('Loose Piece')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Unassigned').closest('button')!);
    expect(screen.getByText('Loose Piece')).toBeInTheDocument();
  });

  it('collapses and re-expands a case group on click', () => {
    const items = [makeItem({ id: 'a', name: 'Case A Piece', case_id: 'A' })];
    render(<InventoryCase items={items} onEditPiece={vi.fn()} />);
    const header = screen.getByText('A — Left Tower').closest('button')!;
    fireEvent.click(header);
    expect(screen.queryByText('Case A Piece')).not.toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.getByText('Case A Piece')).toBeInTheDocument();
  });

  it('calls onEditPiece when a piece is clicked', () => {
    const onEditPiece = vi.fn();
    const items = [makeItem({ id: 'a', name: 'Case A Piece', case_id: 'A' })];
    render(<InventoryCase items={items} onEditPiece={onEditPiece} />);
    fireEvent.click(screen.getByText('Case A Piece'));
    expect(onEditPiece).toHaveBeenCalledWith(items[0]);
  });

  it('shows an empty state for a case with no pieces', () => {
    render(<InventoryCase items={[]} onEditPiece={vi.fn()} />);
    expect(screen.getAllByText('No pieces assigned to this case.').length).toBeGreaterThan(0);
  });

  it('shows a photo thumbnail for pieces that have one, in both case and unassigned groups', () => {
    const items = [
      makeItem({
        id: 'a',
        name: 'Case A Piece',
        case_id: 'A',
        photos: ['https://example.com/a.jpg'],
      }),
      makeItem({
        id: 'b',
        name: 'Loose Piece',
        case_id: null,
        photos: ['https://example.com/b.jpg'],
      }),
    ];
    render(<InventoryCase items={items} onEditPiece={vi.fn()} />);
    fireEvent.click(screen.getByText('Unassigned').closest('button')!);
    const images = screen.getAllByRole('img') as HTMLImageElement[];
    expect(images.some((img) => img.src.includes('a.jpg'))).toBe(true);
    expect(images.some((img) => img.src.includes('b.jpg'))).toBe(true);
  });

  it('collapses and re-expands the unassigned group', () => {
    const items = [makeItem({ id: 'b', name: 'Loose Piece', case_id: null })];
    render(<InventoryCase items={items} onEditPiece={vi.fn()} />);
    const header = screen.getByText('Unassigned').closest('button')!;
    fireEvent.click(header); // expand
    fireEvent.click(header); // collapse
    expect(screen.queryByText('Loose Piece')).not.toBeInTheDocument();
  });
});
