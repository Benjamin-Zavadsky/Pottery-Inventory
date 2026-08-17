// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../support/render';
import type { PotteryItem } from '@/lib/types';
import type { ReactNode } from 'react';

vi.mock('react-simple-maps', () => ({
  ComposableMap: ({
    children,
    projectionConfig,
  }: {
    children: ReactNode;
    projectionConfig: { scale: number };
  }) => (
    <div data-testid="composable-map" data-scale={projectionConfig.scale}>
      {children}
    </div>
  ),
  Geographies: ({ children }: { children: (props: { geographies: unknown[] }) => ReactNode }) => (
    <>{children({ geographies: [] })}</>
  ),
  Geography: () => null,
  Marker: ({ children, coordinates }: { children: ReactNode; coordinates: [number, number] }) => (
    <g data-testid={`marker-${coordinates.join(',')}`}>{children}</g>
  ),
}));

import InventoryMap from '@/components/InventoryMap';

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

// Mississippian is at lat 33.5, lng -90.2 in lib/constants.ts
const MISSISSIPPIAN_MARKER = 'marker--90.2,33.5';

describe('InventoryMap', () => {
  it('renders the region legend', () => {
    render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    expect(screen.getByText('North America')).toBeInTheDocument();
    expect(screen.getByText('Mesoamerica')).toBeInTheDocument();
  });

  it('zooms in when the + control is clicked', () => {
    const { container } = render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    const before = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );
    fireEvent.click(screen.getByText('+'));
    const after = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );
    expect(after).toBeGreaterThan(before);
  });

  it('opens a drawer with matching pieces (plural, with a photo) when a marker is clicked', () => {
    const items = [
      makeItem({
        id: 'a',
        name: 'Shell Vessel',
        tribe_culture: 'Mississippian',
        photos: ['https://example.com/p.jpg'],
      }),
      makeItem({ id: 'b', name: 'Second Vessel', tribe_culture: 'Mississippian' }),
    ];
    const { container } = render(<InventoryMap items={items} onEditPiece={vi.fn()} />);
    const marker = container.querySelector(`[data-testid="${MISSISSIPPIAN_MARKER}"] circle`)!;
    fireEvent.click(marker);
    expect(screen.getByRole('heading', { name: 'Mississippian' })).toBeInTheDocument();
    expect(screen.getByText('Shell Vessel')).toBeInTheDocument();
    expect(screen.getByText('2 pieces')).toBeInTheDocument();
  });

  it('shows an empty drawer for a culture with no matching pieces', () => {
    const { container } = render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    const marker = container.querySelector(`[data-testid="${MISSISSIPPIAN_MARKER}"] circle`)!;
    fireEvent.click(marker);
    expect(screen.getByText('No pieces catalogued')).toBeInTheDocument();
  });

  it('ignores pieces with no tribe_culture set', () => {
    const items = [makeItem({ id: 'a', tribe_culture: null })];
    const { container } = render(<InventoryMap items={items} onEditPiece={vi.fn()} />);
    const marker = container.querySelector(`[data-testid="${MISSISSIPPIAN_MARKER}"] circle`)!;
    fireEvent.click(marker);
    expect(screen.getByText('No pieces catalogued')).toBeInTheDocument();
  });

  it('closes the drawer via its close button', () => {
    const items = [makeItem({ id: 'a', name: 'Shell Vessel', tribe_culture: 'Mississippian' })];
    const { container } = render(<InventoryMap items={items} onEditPiece={vi.fn()} />);
    fireEvent.click(container.querySelector(`[data-testid="${MISSISSIPPIAN_MARKER}"] circle`)!);
    expect(screen.getByText('Shell Vessel')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button').find((b) => b.querySelector('line'))!);
    expect(screen.queryByText('Shell Vessel')).not.toBeInTheDocument();
  });

  it('zooms out when the − control is clicked', () => {
    const { container } = render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    const before = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );
    fireEvent.click(screen.getByText('−'));
    const after = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );
    expect(after).toBeLessThan(before);
  });

  it('shows and hides a tooltip on marker hover, with a plural piece count', () => {
    const items = [
      makeItem({ id: 'a', tribe_culture: 'Mississippian' }),
      makeItem({ id: 'b', tribe_culture: 'Mississippian' }),
    ];
    const { container } = render(<InventoryMap items={items} onEditPiece={vi.fn()} />);
    const marker = container.querySelector(`[data-testid="${MISSISSIPPIAN_MARKER}"] circle`)!;
    fireEvent.mouseEnter(marker, { clientX: 10, clientY: 10 });
    expect(screen.getByText('Mississippian')).toBeInTheDocument();
    expect(screen.getByText(/2 pieces/)).toBeInTheDocument();
    fireEvent.mouseLeave(marker);
    expect(screen.queryByText('Mississippian')).not.toBeInTheDocument();
  });

  it('pans on mouse drag and updates the cursor while dragging', () => {
    const { container } = render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    const mapContainer = container.firstElementChild as HTMLElement;
    fireEvent.mouseDown(mapContainer, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(mapContainer, { clientX: 130, clientY: 130 });
    expect(mapContainer.style.cursor).toBe('grabbing');
    fireEvent.mouseUp(mapContainer);
    expect(mapContainer.style.cursor).toBe('grab');
  });

  it('zooms via the wheel event and commits after the interaction settles', async () => {
    const { container } = render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    const mapContainer = container.firstElementChild as HTMLElement;
    const before = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );

    fireEvent.wheel(mapContainer, { deltaY: -100, clientX: 50, clientY: 50 });
    await new Promise((r) => setTimeout(r, 250));

    const after = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );
    expect(after).toBeGreaterThan(before);
  });

  function touchEvent(type: string, touches: { clientX: number; clientY: number }[]) {
    return Object.assign(new Event(type, { cancelable: true }), { touches });
  }

  it('pans on a single-finger touch drag', async () => {
    const { container } = render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    const mapContainer = container.firstElementChild as HTMLElement;
    const before = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );

    mapContainer.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
    mapContainer.dispatchEvent(touchEvent('touchmove', [{ clientX: 130, clientY: 130 }]));
    mapContainer.dispatchEvent(touchEvent('touchend', []));
    await new Promise((r) => setTimeout(r, 250));

    const after = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );
    expect(after).toBe(before); // pan changes center, not scale
  });

  it('zooms on a two-finger pinch touch gesture', async () => {
    const { container } = render(<InventoryMap items={[]} onEditPiece={vi.fn()} />);
    const mapContainer = container.firstElementChild as HTMLElement;
    const before = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );

    mapContainer.dispatchEvent(
      touchEvent('touchstart', [
        { clientX: 90, clientY: 100 },
        { clientX: 110, clientY: 100 },
      ]),
    );
    mapContainer.dispatchEvent(
      touchEvent('touchmove', [
        { clientX: 60, clientY: 100 },
        { clientX: 140, clientY: 100 },
      ]),
    );
    mapContainer.dispatchEvent(touchEvent('touchend', [{ clientX: 60, clientY: 100 }]));
    mapContainer.dispatchEvent(touchEvent('touchend', []));
    await new Promise((r) => setTimeout(r, 250));

    const after = Number(
      container.querySelector('[data-testid="composable-map"]')!.getAttribute('data-scale'),
    );
    expect(after).toBeGreaterThan(before);
  });
});
