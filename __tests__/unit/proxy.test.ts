import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetUser, captured } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  captured: {
    setAll: null as null | ((c: { name: string; value: string; options?: object }[]) => void),
  },
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _u: string,
    _k: string,
    opts: { cookies: { setAll: typeof captured.setAll } },
  ) => {
    captured.setAll = opts.cookies.setAll;
    return { auth: { getUser: mockGetUser } };
  },
}));

import { proxy, config } from '@/proxy';

function request(path: string, cookie?: string) {
  return new NextRequest(
    new Request(`http://localhost${path}`, cookie ? { headers: { cookie } } : {}),
  );
}

beforeEach(() => mockGetUser.mockReset());

describe('proxy', () => {
  it('protects only staff routes', () => {
    expect(config.matcher).toEqual([
      '/add/:path*',
      '/dashboard/:path*',
      '/review/:path*',
      '/catalog/:path*',
    ]);
  });

  it('redirects signed-out visitors to login without calling Supabase', async () => {
    const res = await proxy(request('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login?next=%2Fdashboard');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects when the session cookie is no longer valid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(request('/add', 'sb-abc-auth-token=stale'));
    expect(res.status).toBe(307);
  });

  it('lets valid sessions through and forwards refreshed cookies', async () => {
    mockGetUser.mockImplementation(async () => {
      captured.setAll?.([{ name: 'sb-abc-auth-token', value: 'fresh', options: { path: '/' } }]);
      return { data: { user: { id: 'u1' } } };
    });
    const res = await proxy(request('/review', 'sb-abc-auth-token=old'));
    expect(res.status).toBe(200);
    expect(res.cookies.get('sb-abc-auth-token')?.value).toBe('fresh');
  });
});
