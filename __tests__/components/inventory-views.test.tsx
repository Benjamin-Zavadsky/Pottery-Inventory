// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '../support/render';
import { makeSummary } from '../support/fixtures';
import InventoryTree from '@/components/InventoryTree';
import InventoryCase from '@/components/InventoryCase';
import InventoryTimeline from '@/components/InventoryTimeline';

const items = [
  makeSummary({ id: '1', sku: 'P0001', name: 'Cahokia jar', case_id: 'A' }),
  makeSummary({
    id: '2',
    sku: 'P0002',
    name: 'Maya plate',
    culture_id: 'maya',
    region: 'Mesoamerica',
    period_start_year: -300,
    period_end_year: 250,
    case_id: null,
  }),
  makeSummary({
    id: '3',
    sku: 'P0003',
    name: 'Mystery sherd',
    culture_id: null,
    tribe_culture: 'unknown',
    region: null,
    period_start_year: null,
    period_end_year: null,
    photos: [],
    thumbs: [],
  }),
  makeSummary({
    id: '4',
    sku: 'P0004',
    name: 'Late piece',
    period_start_year: 1900,
    period_end_year: null,
  }),
];

describe('InventoryTree', () => {
  it('starts collapsed and drills down region → culture → pieces', () => {
    render(<InventoryTree items={items} />);
    expect(screen.queryByText('Cahokia jar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Europe/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /North America/ }));
    fireEvent.click(screen.getByRole('button', { name: /Mississippian/ }));
    expect(screen.getByRole('link', { name: /Cahokia jar/ })).toHaveAttribute(
      'href',
      '/item/P0001',
    );
    fireEvent.click(screen.getByRole('button', { name: /Mississippian/ }));
    expect(screen.queryByText('Cahokia jar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /North America/ }));
    fireEvent.click(screen.getByRole('button', { name: /Unclassified/ }));
    expect(screen.getByText('Mystery sherd')).toBeInTheDocument();
  });

  it('omits the unclassified group when everything is classified', () => {
    render(<InventoryTree items={items.slice(0, 1)} />);
    expect(screen.queryByText('Unclassified')).not.toBeInTheDocument();
  });
});

describe('InventoryCase', () => {
  it('expands cases, keeps the unassigned bucket collapsed until opened', () => {
    render(<InventoryCase items={items} />);
    expect(screen.getByRole('link', { name: /Cahokia jar/ })).toBeInTheDocument();
    expect(screen.getAllByText('No pieces here.').length).toBeGreaterThan(0);
    const unassigned = screen.getByRole('button', { name: /Unassigned/ });
    expect(screen.queryByText('Maya plate')).not.toBeInTheDocument();
    fireEvent.click(unassigned);
    expect(screen.getByText('Maya plate')).toBeInTheDocument();
    fireEvent.click(unassigned);
    expect(screen.queryByText('Maya plate')).not.toBeInTheDocument();
  });
});

describe('InventoryTimeline', () => {
  it('buckets by period midpoint and lists undated pieces separately', () => {
    render(<InventoryTimeline items={items} />);
    const early = screen.getByRole('region', { name: '1000 BCE – 1 CE' });
    expect(within(early).getByText('Maya plate')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: '1000 – 1250 CE' })).getByText('Cahokia jar'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: '1750 CE – present' })).getByText('Late piece'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Undated' })).getByText('Mystery sherd'),
    ).toBeInTheDocument();
  });

  it('omits the undated section when every piece is dated', () => {
    render(<InventoryTimeline items={items.slice(0, 2)} />);
    expect(screen.queryByRole('region', { name: 'Undated' })).not.toBeInTheDocument();
  });
});

vi.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Geographies: ({ children }: { children: (p: { geographies: unknown[] }) => React.ReactNode }) => (
    <>{children({ geographies: [{ rsmKey: 'g1' }] })}</>
  ),
  Geography: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <g>{children}</g>,
}));
