// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../support/render';
import InventoryTree from '@/components/InventoryTree';
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

describe('InventoryTree', () => {
  it('renders all regions collapsed to their culture list by default', () => {
    render(<InventoryTree items={[]} onEditPiece={vi.fn()} />);
    expect(screen.getByText('North America')).toBeInTheDocument();
    expect(screen.getByText('Mississippian')).toBeInTheDocument();
  });

  it('matches a piece to its culture case-insensitively via substring', () => {
    const items = [makeItem({ id: 'a', name: 'Shell Vessel', tribe_culture: 'mississippian' })];
    render(<InventoryTree items={items} onEditPiece={vi.fn()} />);
    fireEvent.click(screen.getByText('Mississippian'));
    expect(screen.getByText('Shell Vessel')).toBeInTheDocument();
  });

  it('collapses a region on click, hiding its cultures', () => {
    render(<InventoryTree items={[]} onEditPiece={vi.fn()} />);
    fireEvent.click(screen.getByText('North America'));
    expect(screen.queryByText('Mississippian')).not.toBeInTheDocument();
  });

  it('does not let an empty culture be expanded', () => {
    render(<InventoryTree items={[]} onEditPiece={vi.fn()} />);
    const cultureButton = screen.getByText('Mississippian').closest('button')!;
    expect(cultureButton).toBeDisabled();
  });

  it('links each piece card to its item detail page and shows its photo', () => {
    const items = [
      makeItem({
        id: 'piece-1',
        name: 'Shell Vessel',
        tribe_culture: 'Mississippian',
        photos: ['https://example.com/p.jpg'],
      }),
    ];
    render(<InventoryTree items={items} onEditPiece={vi.fn()} />);
    fireEvent.click(screen.getByText('Mississippian'));
    expect(screen.getByText('Shell Vessel').closest('a')).toHaveAttribute('href', '/item/piece-1');
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/p.jpg');
  });

  it('ignores pieces with no tribe_culture set', () => {
    const items = [makeItem({ id: 'a', name: 'Unlabeled Piece', tribe_culture: null })];
    render(<InventoryTree items={items} onEditPiece={vi.fn()} />);
    const cultureButton = screen.getByText('Mississippian').closest('button')!;
    expect(cultureButton).toBeDisabled();
  });

  it('re-expands a region and re-collapses a culture after toggling twice', () => {
    const items = [makeItem({ id: 'a', name: 'Shell Vessel', tribe_culture: 'Mississippian' })];
    render(<InventoryTree items={items} onEditPiece={vi.fn()} />);

    const regionButton = screen.getByText('North America').closest('button')!;
    fireEvent.click(regionButton); // collapse
    fireEvent.click(regionButton); // re-expand
    expect(screen.getByText('Mississippian')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mississippian')); // expand culture
    expect(screen.getByText('Shell Vessel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mississippian')); // collapse culture
    expect(screen.queryByText('Shell Vessel')).not.toBeInTheDocument();
  });
});
