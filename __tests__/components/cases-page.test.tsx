// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';

vi.mock('next/navigation', () => ({
  usePathname: () => '/cases',
}));

vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase';
import CasesPage from '@/app/cases/page';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

describe('CasesPage', () => {
  beforeEach(() => {
    supabaseMock.setUser(null);
  });

  it('renders each of the 6 cases with its piece count', async () => {
    supabaseMock.queueResult({ data: [] }); // cases table
    supabaseMock.queueResult({
      data: [{ case_id: 'A' }, { case_id: 'A' }, { case_id: 'B' }],
    }); // pottery case_id rows
    supabaseMock.queueResult({ count: 2 }); // unassigned count

    render(<CasesPage />);

    expect(await screen.findByText('A — Left Tower')).toBeInTheDocument();
    const caseARow = screen.getByText('A — Left Tower').closest('a')!;
    expect(caseARow).toHaveTextContent('2');
    expect(caseARow).toHaveAttribute('href', '/cases/A');
  });

  it('shows the unassigned pieces card when there are unassigned pieces', async () => {
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ count: 3 });

    render(<CasesPage />);

    expect(await screen.findByText('Unassigned pieces')).toBeInTheDocument();
  });

  it('hides the unassigned pieces card when there are none', async () => {
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ data: [] });
    supabaseMock.queueResult({ count: 0 });

    render(<CasesPage />);

    await waitFor(() => expect(screen.getByText('A — Left Tower')).toBeInTheDocument());
    expect(screen.queryByText('Unassigned pieces')).not.toBeInTheDocument();
  });

  it('ignores pottery rows with no case_id and shows a singular piece count', async () => {
    supabaseMock.queueResult({
      data: [{ id: 'A', description: 'Custom desc', last_inventoried_at: '2026-01-01T00:00:00Z' }],
    }); // cases table
    supabaseMock.queueResult({ data: [{ case_id: 'A' }, { case_id: null }] }); // one unassigned row
    supabaseMock.queueResult({}); // unassigned count undefined

    render(<CasesPage />);

    const caseARow = await screen.findByText('A — Left Tower');
    expect(caseARow.closest('a')).toHaveTextContent('1piece');
    expect(screen.getByText('Custom desc')).toBeInTheDocument();
    expect(screen.getByText(/Last inventoried/)).toBeInTheDocument();
  });
});
