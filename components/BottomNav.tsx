'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';

export default function BottomNav({ staff = false }: { staff?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-surface/95 backdrop-blur sm:hidden print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-16 items-center">
        <Tab href="/" icon="grid" label="Collection" active={pathname === '/'} />
        <Tab href="/cases" icon="case" label="Cases" active={pathname.startsWith('/cases')} />
        {staff && (
          <>
            <Link
              href="/add"
              aria-label="Add piece"
              className="flex h-full flex-1 flex-col items-center justify-center gap-1"
            >
              <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30">
                <Icon name="plus" size={22} strokeWidth={2} />
              </span>
              <span className="text-[9px] font-medium uppercase tracking-widest text-faint">
                Add
              </span>
            </Link>
            <Tab href="/review" icon="review" label="Review" active={pathname === '/review'} />
            <Tab
              href="/dashboard"
              icon="dashboard"
              label="Dashboard"
              active={pathname === '/dashboard'}
            />
          </>
        )}
      </div>
    </nav>
  );
}

function Tab({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-ink' : 'text-faint'}`}
    >
      <Icon name={icon} size={22} />
      <span className="text-[9px] font-medium uppercase tracking-widest">{label}</span>
    </Link>
  );
}
