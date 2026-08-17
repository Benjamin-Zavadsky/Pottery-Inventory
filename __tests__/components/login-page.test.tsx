// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase';
import LoginPage from '@/app/login/page';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

describe('LoginPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it('signs in and redirects home on success', async () => {
    supabaseMock.queueResult({ data: {}, error: null });
    const { container } = render(<LoginPage />);
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows the error message on failed login', async () => {
    supabaseMock.queueResult({ data: null, error: { message: 'Invalid credentials' } });
    const { container } = render(<LoginPage />);
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
