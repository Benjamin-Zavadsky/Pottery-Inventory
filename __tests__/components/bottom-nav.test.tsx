// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../support/render';

const mockPathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

import BottomNav from '@/components/BottomNav';

describe('BottomNav', () => {
  it('highlights Collection when on the home route', () => {
    mockPathname.mockReturnValue('/');
    render(<BottomNav />);
    expect(screen.getByText('Collection').closest('a')).toHaveClass('text-[#111]');
    expect(screen.getByText('Cases').closest('a')).toHaveClass('text-[#bbb]');
  });

  it('highlights Cases on any /cases sub-route', () => {
    mockPathname.mockReturnValue('/cases/A');
    render(<BottomNav />);
    expect(screen.getByText('Cases').closest('a')).toHaveClass('text-[#111]');
    expect(screen.getByText('Collection').closest('a')).toHaveClass('text-[#bbb]');
  });

  it('links to the add page', () => {
    mockPathname.mockReturnValue('/');
    render(<BottomNav />);
    expect(screen.getByText('Add').closest('a')).toHaveAttribute('href', '/add');
  });
});
