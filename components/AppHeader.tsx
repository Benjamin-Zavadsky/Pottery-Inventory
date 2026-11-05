'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { subscribeAiQueue } from '@/lib/aiClient';
import { Icon, Spinner } from '@/components/ui/Icon';
import { buttonClass } from '@/components/ui/Button';

export default function AppHeader({
  user,
  back,
  title,
  actions,
}: {
  user: User | null;
  back?: string;
  title?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [aiPending, setAiPending] = useState(0);

  useEffect(() => subscribeAiQueue(setAiPending), []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur pt-safe print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
        {back ? (
          <>
            <Link
              href={back}
              aria-label="Back"
              className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-ink"
            >
              <Icon name="back" size={20} />
            </Link>
            <div className="min-w-0 flex-1 truncate text-sm text-muted">{title}</div>
          </>
        ) : (
          <>
            <Link href="/" className="flex-1 truncate font-display text-lg sm:text-xl">
              Pottery Collection
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
              <NavLink href="/">Collection</NavLink>
              <NavLink href="/cases">Cases</NavLink>
              {user && <NavLink href="/review">Review</NavLink>}
              {user && <NavLink href="/dashboard">Dashboard</NavLink>}
            </nav>
          </>
        )}

        {aiPending > 0 && (
          <span
            role="status"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-strong"
          >
            <Spinner size={12} />
            AI · {aiPending}
          </span>
        )}

        {actions}

        {!back && user && (
          <Link href="/add" className={buttonClass('accent', 'sm', 'hidden sm:inline-flex')}>
            <Icon name="plus" size={14} />
            Add Piece
          </Link>
        )}
        {!back &&
          (user ? (
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-ink"
            >
              <Icon name="logout" />
            </button>
          ) : (
            <Link href="/login" className="shrink-0 text-sm text-muted hover:text-ink">
              Staff sign in
            </Link>
          ))}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      {children}
    </Link>
  );
}
