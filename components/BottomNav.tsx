'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 sm:hidden bg-white border-t border-[#e5e5e5]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center h-16">
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors ${pathname === '/' ? 'text-[#111]' : 'text-[#bbb]'}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="text-[9px] uppercase tracking-widest font-medium">Collection</span>
        </Link>

        <Link
          href="/cases"
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors ${pathname.startsWith('/cases') ? 'text-[#111]' : 'text-[#bbb]'}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="2" y1="9" x2="22" y2="9" />
            <line x1="12" y1="9" x2="12" y2="20" />
          </svg>
          <span className="text-[9px] uppercase tracking-widest font-medium">Cases</span>
        </Link>

        <Link
          href="/add"
          className="flex-1 flex flex-col items-center justify-center gap-1 h-full"
        >
          <div className="w-12 h-12 bg-[#111] rounded-full flex items-center justify-center -mt-5 shadow-lg shadow-black/15">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-[9px] uppercase tracking-widest font-medium text-[#bbb]">Add</span>
        </Link>
      </div>
    </nav>
  )
}
