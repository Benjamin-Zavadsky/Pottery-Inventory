import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMaybeSingle, eqSpy } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  eqSpy: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          eqSpy(...args);
          return { maybeSingle: mockMaybeSingle };
        },
      }),
    }),
  }),
}));
vi.mock('@/app/(public)/item/[id]/_components/ItemView', () => ({ default: () => null }));

import ItemPage, { generateMetadata } from '@/app/(public)/item/[id]/page';

const meta = (id: string) => generateMetadata({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mockMaybeSingle.mockReset();
  eqSpy.mockReset();
});

describe('item page metadata', () => {
  it('builds a title, summary and preview image from the piece', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        name: 'Jar',
        sku: 'P0007',
        description: 'd'.repeat(300),
        photos: ['https://img/1.jpg'],
      },
    });
    const m = await meta('p0007');
    expect(eqSpy).toHaveBeenCalledWith('sku', 'P0007');
    expect(m.title).toBe('Jar (P0007)');
    expect(m.description).toHaveLength(160);
    expect(m.openGraph?.images).toEqual(['https://img/1.jpg']);
  });

  it('handles pieces without description or photos, missing pieces, and errors', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { name: 'Jar', sku: 'P1', description: null, photos: [] },
    });
    const m = await meta('some-uuid');
    expect(eqSpy).toHaveBeenCalledWith('id', 'some-uuid');
    expect(m.description).toBeUndefined();
    expect(m.openGraph?.images).toBeUndefined();
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    expect((await meta('x')).title).toBe('Piece not found');
    mockMaybeSingle.mockRejectedValueOnce(new Error('network'));
    expect((await meta('x')).title).toBe('Collection piece');
  });

  it('renders the client view', () => {
    expect(ItemPage()).toBeTruthy();
  });
});
