import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatSuggestion, normalizeAiResult, suggestionEntries } from '@/lib/ai';
import {
  analyzeInBackground,
  requestAnalysis,
  saveAnalysis,
  subscribeAiQueue,
  trackInBackground,
} from '@/lib/aiClient';
import { createSupabaseMock } from '../support/supabaseMock';
import type { Supabase } from '@/lib/supabase';

describe('normalizeAiResult', () => {
  it('keeps valid values and nulls out anything off-list or malformed', () => {
    const r = normalizeAiResult({
      name: '  Effigy bottle ',
      description: '',
      condition: 'Perfect',
      rarity: 'Rare',
      culture_id: 'moche',
      region: null,
      period_start_year: 600,
      period_end_year: 100,
      confidence: 'High',
      originality: 42,
    });
    expect(r).toMatchObject({
      name: 'Effigy bottle',
      description: null,
      condition: null,
      rarity: 'Rare',
      culture_id: 'moche',
      region: 'South America',
      period_start_year: 100,
      period_end_year: 600,
      confidence: 'High',
      originality: null,
    });
  });

  it('rejects unknown culture ids and non-objects', () => {
    expect(normalizeAiResult({ culture_id: 'atlantis' }).culture_id).toBeNull();
    expect(normalizeAiResult('nope').name).toBeNull();
    expect(normalizeAiResult(null).period_start_year).toBeNull();
  });

  it('lists only present suggestions and formats them for display', () => {
    const r = normalizeAiResult({ name: 'Jar', culture_id: 'maya', period_start_year: -300 });
    expect(suggestionEntries(r).map((e) => e.key)).toEqual([
      'name',
      'culture_id',
      'region',
      'period_start_year',
    ]);
    expect(formatSuggestion('culture_id', 'maya')).toBe('Maya');
    expect(formatSuggestion('culture_id', 'unknown-id')).toBe('unknown-id');
    expect(formatSuggestion('period_start_year', -300)).toBe('300 BCE');
    expect(formatSuggestion('name', 'Jar')).toBe('Jar');
    expect(formatSuggestion('name', null)).toBe('—');
    expect(formatSuggestion('name', '')).toBe('—');
  });
});

describe('aiClient', () => {
  const mock = createSupabaseMock();
  const supabase = mock.supabase as unknown as Supabase;

  beforeEach(() => {
    mock.reset();
    mock.setUser({ id: 'u1' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('posts photo URLs with the session token and normalizes the result', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ name: 'Jar', condition: 'Bad', model: 'm-1' })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestAnalysis(supabase, ['u1'], '  context ');
    expect(result).toMatchObject({ name: 'Jar', condition: null, model: 'm-1' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-access-token');
    expect(JSON.parse(init.body as string)).toEqual({ imageUrls: ['u1'], userContext: 'context' });
  });

  it('defaults the model name and omits empty context', async () => {
    mock.setUser(null);
    const fetchMock = vi.fn(() => Promise.resolve(Response.json({ name: 'Jar' })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestAnalysis(supabase, ['u1']);
    expect(result.model).toBe('claude-opus-4-7');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ');
  });

  it('throws the API error message, a status fallback, or a parse error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ error: 'Unauthorized' }, { status: 401 }))),
    );
    await expect(requestAnalysis(supabase, ['u'])).rejects.toThrow('Unauthorized');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({}, { status: 502 }))),
    );
    await expect(requestAnalysis(supabase, ['u'])).rejects.toThrow('Analysis failed (502)');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>', { status: 504 }))),
    );
    await expect(requestAnalysis(supabase, ['u'])).rejects.toThrow('status 504');
  });

  it('stores an analysis row and surfaces insert errors', async () => {
    const result = { ...normalizeAiResult({ name: 'Jar' }), model: 'm' };
    mock.queueResult({});
    await saveAnalysis(supabase, 'p1', ['u'], result, 'pending', ' ctx ');
    expect(mock.lastBuilder().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pottery_id: 'p1',
        model: 'm',
        user_context: 'ctx',
        status: 'pending',
      }),
    );
    mock.queueResult({ error: { message: 'rls' } });
    await expect(saveAnalysis(supabase, 'p1', ['u'], result, 'applied')).rejects.toEqual({
      message: 'rls',
    });
  });

  it('tracks background work for subscribers and swallows failures', async () => {
    const seen: number[] = [];
    const unsubscribe = subscribeAiQueue((n) => seen.push(n));
    expect(await trackInBackground(Promise.resolve('ok'))).toBe('ok');
    expect(await trackInBackground(Promise.reject(new Error('x')))).toBeUndefined();
    unsubscribe();
    expect(seen).toEqual([0, 1, 0, 1, 0]);
  });

  it('analyzes and stores a pending result in the background', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ name: 'Jar' }))),
    );
    mock.queueResult({});
    await analyzeInBackground(supabase, 'p1', ['u']);
    expect(mock.lastBuilder().insert).toHaveBeenCalledWith(
      expect.objectContaining({ pottery_id: 'p1', status: 'pending' }),
    );
  });
});
