# Skill: Add a New Page to the App

Follow this sequence exactly. Do not skip steps or reorder them.

## 1. Explore first
- Read `app/layout.tsx` to understand the root layout
- Read `app/page.tsx` to understand the pattern for a public page
- Read `app/add/page.tsx` to understand the pattern for an authenticated page
- Read `components/BottomNav.tsx` to understand mobile navigation
- Read `app/globals.css` for available safe-area utilities

## 2. Plan
Before writing any code, answer these questions:
- What is the page's URL path? (must be `kebab-case`, e.g. `app/cases/page.tsx`)
- Is this page public (anyone can view) or protected (requires login)?
- Does it need a back button in the header?
- Does it need to appear in the bottom navigation bar on mobile?
- What data does it fetch from Supabase?

Wait for approval before proceeding.

## 3. Create the page file
Create `app/[page-name]/page.tsx`. Follow these patterns:

**Public page:**
```tsx
'use client'
import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function PageName() {
  const supabase = useMemo(() => createClient(), [])
  // ...
}
```

**Protected page (requires login):**
```tsx
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AuthGuard from '@/components/AuthGuard'

export default function PageName() {
  const supabase = useMemo(() => createClient(), [])
  return (
    <AuthGuard>
      {/* page content */}
    </AuthGuard>
  )
}
```

## 4. Header pattern
Every page must have a sticky header with a back button:
```tsx
<header className="bg-white border-b border-[#e5e5e5] px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-10">
  <Link href="/" className="text-[#6b6b6b] hover:text-[#111] transition-colors p-1 -ml-1">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </Link>
  <h1 className="text-sm sm:text-lg font-light tracking-widest uppercase flex-1">Page Title</h1>
</header>
```

## 5. Mobile layout requirements
- Use `pb-nav` class on the main content container to clear the bottom navigation bar
- Use `pb-safe` for content that sits above the device home bar
- Test that the page is fully usable at 390px width (iPhone 14 viewport)
- Data entry forms must be touch-friendly: minimum tap target 44px, inputs use `py-2.5`

## 6. Add to BottomNav (if applicable)
If the page should appear in mobile navigation, update `components/BottomNav.tsx`.
Only add pages that staff need to access frequently from the store floor.

## 7. Add navigation links
Add a link to the new page from wherever a user would naturally navigate to it.
Do not create orphan pages with no entry point.

## 8. Verify
- Page loads without errors when not logged in (if public)
- Page redirects to login when not logged in (if protected)
- Layout is correct on mobile (390px) and desktop (1280px)
- Back button navigates correctly
- Safe area insets are respected on notched devices

## 9. Commit
```
feat: add [page-name] page
```
