'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Icon';

// proxy.ts blocks signed-out requests server-side; this covers sessions that
// expire while a staff page is already open.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login');
      else setChecking(false);
    });
  }, [router, supabase]);

  if (checking) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-muted">
        <Spinner size={20} />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  return <>{children}</>;
}
