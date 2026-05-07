import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSuggestions = {
  name: 'Mississippian Effigy Vessel',
  place_of_origin: 'Southeastern United States',
  age: '800–1600 CE',
  color: 'Dark brown with buff slip',
  condition: 'Good',
  rarity: 'Rare',
  originality: 'Suspected Original',
};

function SuggestionsPanel({
  suggestions,
  onApply,
  onApplyAll,
  appliedKeys,
}: {
  suggestions: Record<string, string>;
  onApply: (key: string, value: string) => void;
  onApplyAll: () => void;
  appliedKeys: Set<string>;
}) {
  return (
    <div>
      <button onClick={onApplyAll}>Apply All</button>
      {Object.entries(suggestions).map(([key, value]) => (
        <div key={key}>
          <span>{value}</span>
          <button
            onClick={() => onApply(key, value)}
            disabled={appliedKeys.has(key)}
          >
            {appliedKeys.has(key) ? '✓' : 'Apply'}
          </button>
        </div>
      ))}
    </div>
  );
}

describe('SuggestionsPanel', () => {
  it('renders all suggestion values', () => {
    render(
      <SuggestionsPanel
        suggestions={mockSuggestions}
        onApply={vi.fn()}
        onApplyAll={vi.fn()}
        appliedKeys={new Set()}
      />,
    );
    expect(screen.getByText('Mississippian Effigy Vessel')).toBeInTheDocument();
    expect(screen.getByText('Southeastern United States')).toBeInTheDocument();
    expect(screen.getByText('Rare')).toBeInTheDocument();
  });

  it('calls onApply with the correct key and value', () => {
    const onApply = vi.fn();
    render(
      <SuggestionsPanel
        suggestions={{ name: 'Mississippian Effigy Vessel' }}
        onApply={onApply}
        onApplyAll={vi.fn()}
        appliedKeys={new Set()}
      />,
    );
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith('name', 'Mississippian Effigy Vessel');
  });

  it('disables apply button for already-applied keys', () => {
    render(
      <SuggestionsPanel
        suggestions={{ name: 'Mississippian Effigy Vessel' }}
        onApply={vi.fn()}
        onApplyAll={vi.fn()}
        appliedKeys={new Set(['name'])}
      />,
    );
    expect(screen.getByText('✓')).toBeDisabled();
  });

  it('calls onApplyAll when Apply All is clicked', () => {
    const onApplyAll = vi.fn();
    render(
      <SuggestionsPanel
        suggestions={mockSuggestions}
        onApply={vi.fn()}
        onApplyAll={onApplyAll}
        appliedKeys={new Set()}
      />,
    );
    fireEvent.click(screen.getByText('Apply All'));
    expect(onApplyAll).toHaveBeenCalledOnce();
  });
});
