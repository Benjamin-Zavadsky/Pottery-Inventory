// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeSummary } from '../support/fixtures';

let pathname = '/';
const push = vi.fn();
const refresh = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, refresh, replace }),
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import AuthGuard from '@/components/AuthGuard';
import PieceCard from '@/components/PieceCard';
import { trackInBackground } from '@/lib/aiClient';

const mock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  mock.supabase as unknown as ReturnType<typeof createClient>,
);

beforeEach(() => {
  mock.reset();
  pathname = '/';
  push.mockClear();
  replace.mockClear();
});

describe('AppHeader', () => {
  it('shows public navigation and a staff sign-in link', () => {
    render(<AppHeader user={null} />);
    expect(screen.getByRole('link', { name: 'Pottery Collection' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('shows staff links, signs out, and reports background AI work', async () => {
    let release: () => void = () => {};
    void trackInBackground(new Promise<void>((r) => (release = r)));
    render(<AppHeader user={{ id: 'u' } as never} />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('AI · 1');
    release();
    await waitFor(() => expect(screen.queryByText('AI · 1')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
  });

  it('renders a back link with a title and custom actions', () => {
    render(<AppHeader user={null} back="/cases" title="Cases" actions={<button>Act</button>} />);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/cases');
    expect(screen.getByText('Cases')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
    expect(screen.queryByText('Staff sign in')).not.toBeInTheDocument();
  });
});

describe('BottomNav', () => {
  it('shows only public tabs to visitors', () => {
    render(<BottomNav />);
    expect(screen.getByRole('link', { name: 'Collection' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('link', { name: 'Add piece' })).not.toBeInTheDocument();
  });

  it('adds staff tabs and marks the active one', () => {
    pathname = '/cases/A';
    const { rerender } = render(<BottomNav staff />);
    expect(screen.getByRole('link', { name: 'Cases' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Add piece' })).toHaveAttribute('href', '/add');
    pathname = '/review';
    rerender(<BottomNav staff />);
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('aria-current', 'page');
    pathname = '/dashboard';
    rerender(<BottomNav staff />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('AuthGuard', () => {
  it('shows a session check, then redirects signed-out users', async () => {
    render(
      <AuthGuard>
        <p>Protected</p>
      </AuthGuard>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children for staff', async () => {
    mock.setUser({ id: 'u' });
    render(
      <AuthGuard>
        <p>Protected</p>
      </AuthGuard>,
    );
    expect(await screen.findByText('Protected')).toBeInTheDocument();
  });
});

describe('PieceCard', () => {
  it('links to the SKU URL with culture, period and review badge', () => {
    render(<PieceCard item={makeSummary({ ai_fields: ['name'] })} showReview />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/item/P0001');
    expect(screen.getByText('Mississippian')).toBeInTheDocument();
    expect(screen.getByText('1050–1200 CE')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('falls back to the age text and an unclassified label', () => {
    render(
      <PieceCard
        item={makeSummary({
          culture_id: null,
          tribe_culture: null,
          region: null,
          period_start_year: null,
          period_end_year: null,
          age: 'Ancient',
        })}
      />,
    );
    expect(screen.getByText('Unclassified')).toBeInTheDocument();
    expect(screen.getByText('Ancient')).toBeInTheDocument();
  });

  it('becomes a toggle button in selection mode', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<PieceCard item={makeSummary()} selectable onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /Select/ }));
    expect(onToggle).toHaveBeenCalledWith('id-1');
    rerender(
      <PieceCard
        item={makeSummary({
          region: null,
          culture_id: null,
          tribe_culture: 'Maya',
          period_start_year: null,
          period_end_year: null,
          age: null,
        })}
        selectable
        selected
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    rerender(<PieceCard item={makeSummary()} selectable selected />);
  });
});
