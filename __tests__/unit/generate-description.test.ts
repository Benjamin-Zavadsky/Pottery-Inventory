import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeJsonRequest } from '../support/http';
import { STORAGE } from '../support/fixtures';

const { mockCreate, mockGetUser } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: mockCreate };
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
}));

import { POST } from '@/app/api/generate-description/route';

const URL_ = 'http://localhost/api/generate-description';
const AUTH = { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' } };
const photo = (n: number) => `${STORAGE}/intake/x/${n}.jpg`;

function reply(text: string) {
  mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text }] });
}

beforeEach(() => {
  mockCreate.mockReset();
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/generate-description', () => {
  it('rejects requests without a valid session', async () => {
    const noHeader = await POST(makeJsonRequest(URL_, { imageUrls: [photo(1)] }));
    expect(noHeader.status).toBe(401);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const badToken = await POST(makeJsonRequest(URL_, { imageUrls: [photo(1)] }, AUTH));
    expect(badToken.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['no urls', {}],
    ['empty list', { imageUrls: [] }],
    ['too many', { imageUrls: Array.from({ length: 13 }, (_, i) => photo(i)) }],
    ['foreign host', { imageUrls: ['https://evil.example/x.jpg'] }],
    ['path traversal', { imageUrls: [`${STORAGE}/../secret.jpg`] }],
    ['non-string', { imageUrls: [42] }],
  ])('returns 400 for %s', async (_label, body) => {
    const res = await POST(makeJsonRequest(URL_, body, AUTH));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/photo URLs/);
  });

  it('returns 400 for a body that is not JSON', async () => {
    const res = await POST(makeJsonRequest(URL_, undefined, { ...AUTH, body: 'not json' }));
    expect(res.status).toBe(400);
  });

  it('sends URL image sources, a cached system prompt, and normalizes the reply', async () => {
    reply(
      'Here you go: {"name":"Moche stirrup-spout bottle","culture_id":"moche","condition":"Pristine","period_start_year":100,"period_end_year":800,"confidence":"High"}',
    );
    const res = await POST(
      makeJsonRequest(
        URL_,
        { imageUrls: [photo(1), photo(2)], userContext: 'x'.repeat(3000) },
        AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      name: 'Moche stirrup-spout bottle',
      culture_id: 'moche',
      region: 'South America',
      condition: null,
      model: 'claude-opus-4-7',
    });
    const args = mockCreate.mock.calls[0][0];
    expect(args.model).toBe('claude-opus-4-7');
    expect(args.system[0].cache_control).toEqual({ type: 'ephemeral' });
    const content = args.messages[0].content;
    expect(content[0]).toEqual({ type: 'image', source: { type: 'url', url: photo(1) } });
    expect(content[2].text).toContain('these 2 photographs');
    expect(content[2].text).toContain('mississippian = Mississippian');
    expect(content[2].text).toContain(`"${'x'.repeat(2000)}"`);
    expect(content[2].text).not.toContain('x'.repeat(2001));
  });

  it('uses single-photo wording without context', async () => {
    reply('{"name":"Bowl"}');
    await POST(makeJsonRequest(URL_, { imageUrls: [photo(1)], userContext: 7 }, AUTH));
    const text = mockCreate.mock.calls[0][0].messages[0].content[1].text;
    expect(text).toContain('Examine this pottery piece');
    expect(text).not.toContain('collector has provided');
  });

  it('returns 502 when the model reply has no JSON', async () => {
    reply('I cannot help with that.');
    mockCreate.mockResolvedValueOnce({ content: [] });
    expect((await POST(makeJsonRequest(URL_, { imageUrls: [photo(1)] }, AUTH))).status).toBe(502);
  });

  it('hides internal failures behind a generic 500', async () => {
    mockCreate.mockRejectedValueOnce(new Error('rate limited: secret details'));
    const res = await POST(makeJsonRequest(URL_, { imageUrls: [photo(1)] }, AUTH));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to generate description' });
  });
});
