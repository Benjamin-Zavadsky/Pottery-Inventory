import { AI_MODEL, normalizeAiResult, type AiResult } from './ai';
import type { Supabase } from './supabase';

let pending = 0;
const listeners = new Set<(count: number) => void>();

function emit() {
  listeners.forEach((l) => l(pending));
}

export function subscribeAiQueue(listener: (count: number) => void) {
  listeners.add(listener);
  listener(pending);
  return () => {
    listeners.delete(listener);
  };
}

// Keeps background work (an analysis that outlives the form that started it)
// visible in the UI until it settles.
export async function trackInBackground<T>(task: Promise<T>): Promise<T | undefined> {
  pending++;
  emit();
  try {
    return await task;
  } catch {
    return undefined;
  } finally {
    pending--;
    emit();
  }
}

export async function requestAnalysis(
  supabase: Supabase,
  imageUrls: string[],
  userContext?: string,
): Promise<AiResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch('/api/generate-description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ imageUrls, userContext: userContext?.trim() || undefined }),
  });
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned an unexpected response (status ${res.status})`);
  }
  if (!res.ok || typeof data?.error === 'string') {
    throw new Error(
      typeof data?.error === 'string' ? data.error : `Analysis failed (${res.status})`,
    );
  }
  return {
    ...normalizeAiResult(data),
    model: typeof data.model === 'string' ? data.model : AI_MODEL,
  };
}

export async function saveAnalysis(
  supabase: Supabase,
  potteryId: string,
  imageUrls: string[],
  result: AiResult,
  status: 'pending' | 'applied' | 'dismissed',
  userContext?: string,
) {
  const { model, ...suggestions } = result;
  const { error } = await supabase.from('ai_analyses').insert({
    pottery_id: potteryId,
    model,
    photo_urls: imageUrls,
    user_context: userContext?.trim() || null,
    result: suggestions,
    status,
  });
  if (error) throw error;
}

export function analyzeInBackground(supabase: Supabase, potteryId: string, imageUrls: string[]) {
  return trackInBackground(
    requestAnalysis(supabase, imageUrls).then((result) =>
      saveAnalysis(supabase, potteryId, imageUrls, result, 'pending'),
    ),
  );
}
