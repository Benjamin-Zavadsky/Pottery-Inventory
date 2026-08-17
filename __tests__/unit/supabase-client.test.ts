import { describe, it, expect } from 'vitest';
import { createClient } from '@/lib/supabase';

describe('createClient', () => {
  it('constructs a Supabase browser client from the public env vars', () => {
    const client = createClient();
    expect(client).toBeTruthy();
    expect(typeof client.auth.getUser).toBe('function');
  });
});
