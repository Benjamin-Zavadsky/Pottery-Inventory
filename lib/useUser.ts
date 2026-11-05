'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Supabase } from './supabase';

export function useUser(supabase: Supabase) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
  }, [supabase]);
  return { user, ready };
}
