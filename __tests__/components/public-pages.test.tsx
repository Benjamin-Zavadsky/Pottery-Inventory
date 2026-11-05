// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithToast, screen, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeSummary } from '../support/fixtures';

let caseId = 'A';
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: caseId }),
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
  usePathname: () => '/cases',
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import CasesPage from '@/app/(public)/cases/page';
import CaseDetailPage from '@/app/(public)/cases/[id]/page';
import LoginPage from '@/app/(public)/login/page';

const mock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  mock.supabase as unknown as ReturnType<typeof createClient>,
);

beforeEach(() => {
  mock.reset();
  push.mockClear();
  caseId = 'A';
  window.history.replaceState(null, '', '/login');
});

describe('Cases page', () => {
  it('lists cases with counts, capacity and an unassigned link', async () => {
    mock.queueResult({
      data: [
        {
          id: 'A',
          description: 'Custom description',
          capacity: 2,
          last_inventoried_at: '2026-01-05',
        },
        { id: 'B', description: null, capacity: 1, last_inventoried_at: null },
      ],
    });
    mock.queueResult({
      data: [{ case_id: 'A' }, { case_id: 'B' }, { case_id: 'B' }, { case_id: null }],
    });
    renderWithToast(<CasesPage />);
    expect(await screen.findByText('Custom description')).toBeInTheDocument();
    expect(screen.getByText('of 2')).toBeInTheDocument();
    expect(screen.getByText(/Last inventoried/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unassigned pieces/ })).toHaveAttribute(
      'href',
      '/?unassigned=1',
    );
    expect(screen.getAllByText('pieces').length).toBeGreaterThan(0);
  });

  it('omits the unassigned card when every piece is placed', async () => {
    mock.queueResult({ data: null });
    mock.queueResult({ data: [{ case_id: 'C' }] });
    renderWithToast(<CasesPage />);
    expect(await screen.findByText('piece')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned pieces')).not.toBeInTheDocument();
  });
});

describe('Case detail page', () => {
  it('shows the pieces in a case', async () => {
    mock.queueResult({ data: { id: 'A', last_inventoried_at: '2026-01-05' } });
    mock.queueResult({
      data: [makeSummary(), makeSummary({ id: '2', sku: 'P0002', name: 'Second' })],
    });
    renderWithToast(<CaseDetailPage />);
    expect(await screen.findByText('Second')).toBeInTheDocument();
    expect(screen.getByText(/2 pieces · Last inventoried/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark inventoried' })).not.toBeInTheDocument();
  });

  it('shows an empty case and lets staff mark it inventoried', async () => {
    caseId = 'ZZ';
    mock.setUser({ id: 'staff' });
    mock.queueResult({ data: { id: 'ZZ', last_inventoried_at: null } });
    mock.queueResult({ data: null });
    renderWithToast(<CaseDetailPage />);
    expect(await screen.findByText('This case is empty')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ZZ' })).toBeInTheDocument();
    mock.queueResult({ error: { message: 'denied' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Mark inventoried' }));
    expect(await screen.findByText('denied')).toBeInTheDocument();
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Mark inventoried' }));
    expect(await screen.findByText('Marked as inventoried today')).toBeInTheDocument();
  });

  it('handles a missing case row when marking', async () => {
    mock.setUser({ id: 'staff' });
    mock.queueResult({ data: null });
    mock.queueResult({ data: [makeSummary()] });
    renderWithToast(<CaseDetailPage />);
    await screen.findByText('1 piece');
    mock.queueResult({});
    fireEvent.click(await screen.findByRole('button', { name: 'Mark inventoried' }));
    expect(await screen.findByText('Marked as inventoried today')).toBeInTheDocument();
  });
});

describe('Login page', () => {
  function fill() {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  }

  it('shows auth errors', async () => {
    renderWithToast(<LoginPage />);
    mock.queueResult({ error: { message: 'Invalid login credentials' } });
    fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials');
  });

  it('returns to the requested staff page after signing in', async () => {
    window.history.replaceState(null, '', '/login?next=/review');
    renderWithToast(<LoginPage />);
    mock.queueResult({});
    fill();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/review'));
    expect(refresh).toHaveBeenCalled();
  });

  it('ignores off-site redirect targets', async () => {
    window.history.replaceState(null, '', '/login?next=//evil.example');
    renderWithToast(<LoginPage />);
    mock.queueResult({});
    fill();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});
