// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

describe('AuthGuard', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    supabaseMock.setUser(null);
  });

  it('shows a loading state before the auth check resolves', () => {
    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /login when there is no authenticated user', async () => {
    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children once an authenticated user is found', async () => {
    supabaseMock.setUser({ id: 'user-1' });
    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    );
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
