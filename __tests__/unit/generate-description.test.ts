import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeJsonRequest } from '../support/http';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: mockCreate };
  },
}));

const ROUTE_URL = 'http://localhost/api/generate-description';

describe('POST /api/generate-description', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns 400 when no image data is provided', async () => {
    const { POST } = await import('@/app/api/generate-description/route');
    const res = await POST(makeJsonRequest(ROUTE_URL, {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing image data');
  });

  it('returns 400 when the images array is empty', async () => {
    const { POST } = await import('@/app/api/generate-description/route');
    const res = await POST(makeJsonRequest(ROUTE_URL, { images: [] }));
    expect(res.status).toBe(400);
  });

  it('accepts the legacy single-image shape', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"name":"Test Vessel","description":"A vessel."}' }],
    });
    const { POST } = await import('@/app/api/generate-description/route');
    const res = await POST(
      makeJsonRequest(ROUTE_URL, { imageBase64: 'AAAA', mediaType: 'image/jpeg' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Test Vessel');
    expect(body.research_notes).toBeNull();
  });

  it('returns 500 when the model response has no parseable JSON', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'not json at all' }] });
    const { POST } = await import('@/app/api/generate-description/route');
    const res = await POST(
      makeJsonRequest(ROUTE_URL, { images: [{ imageBase64: 'AAAA', mediaType: 'image/jpeg' }] }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to parse response');
  });

  it('returns 500 when the Anthropic call throws', async () => {
    mockCreate.mockRejectedValue(new Error('upstream failure'));
    const { POST } = await import('@/app/api/generate-description/route');
    const res = await POST(
      makeJsonRequest(ROUTE_URL, { images: [{ imageBase64: 'AAAA', mediaType: 'image/jpeg' }] }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to generate description');
  });

  it('returns 200 with the parsed attribution on the happy path for multiple images', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 'Here you go:\n{"name":"Mississippian Effigy Vessel","condition":"Good"}\nDone.',
        },
      ],
    });
    const { POST } = await import('@/app/api/generate-description/route');
    const res = await POST(
      makeJsonRequest(ROUTE_URL, {
        images: [
          { imageBase64: 'AAAA', mediaType: 'image/jpeg' },
          { imageBase64: 'BBBB', mediaType: 'image/png' },
        ],
        userContext: 'Found in a shell midden',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Mississippian Effigy Vessel');
    expect(body.condition).toBe('Good');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-7',
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'image' }),
              expect.objectContaining({ type: 'image' }),
              expect.objectContaining({ type: 'text' }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('returns 500 when the request body is malformed JSON', async () => {
    const { POST } = await import('@/app/api/generate-description/route');
    const req = new (await import('next/server')).NextRequest(
      new Request(ROUTE_URL, { method: 'POST', body: '{not valid json' }),
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
