import { vi } from 'vitest';

export type QueueResult<T = unknown> = { data: T | null; error: unknown; count?: number | null };

// Supabase's real query builder is "thenable" — awaiting it directly (without
// .single()) resolves the query. This mock queues one result per DB
// round-trip, consumed in call order, and implements that same thenable shape.
export function createSupabaseMock() {
  const queue: QueueResult[] = [];
  let currentUser: unknown = null;

  function nextResult(): QueueResult {
    const next = queue.shift();
    if (!next) {
      throw new Error(
        'createSupabaseMock: no queued result — call queueResult() before this query runs',
      );
    }
    return next;
  }

  function makeQueryBuilder() {
    const builder: Record<string, unknown> = {};
    const chain = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'ilike', 'not', 'is'];
    for (const method of chain) {
      builder[method] = vi.fn(() => builder);
    }
    builder.single = vi.fn(() => Promise.resolve(nextResult()));
    builder.then = (
      onFulfilled?: ((value: QueueResult) => unknown) | null,
      onRejected?: ((reason: unknown) => unknown) | null,
    ) => Promise.resolve(nextResult()).then(onFulfilled, onRejected);
    return builder;
  }

  const storageBucket = {
    upload: vi.fn(() => Promise.resolve(nextResult())),
    // Real getPublicUrl is synchronous — no await in calling code.
    getPublicUrl: vi.fn(() => nextResult()),
  };

  const supabase = {
    from: vi.fn(() => makeQueryBuilder()),
    storage: { from: vi.fn(() => storageBucket) },
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: currentUser }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve(nextResult())),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  };

  return {
    supabase,
    queueResult: <T>(result: Partial<QueueResult<T>>) => {
      queue.push({ data: null, error: null, ...result });
    },
    setUser: (user: unknown) => {
      currentUser = user;
    },
    // Clears any unconsumed queue entries left over from a previous test —
    // call in beforeEach for suites where component effects can outlive a test.
    reset: () => {
      queue.length = 0;
      currentUser = null;
    },
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;
