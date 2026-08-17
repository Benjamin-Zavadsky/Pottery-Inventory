---
name: writing-tests
description: >-
  Use when adding or changing a feature in this repo (a page, component, API
  route, or lib function) — writes the matching unit/component/e2e tests
  using this project's own conventions (mock helpers, file locations, Next.js
  App Router specifics). A feature isn't done until its tests exist and
  `npm run verify` is green.
---

# Writing tests — pottery-inventory

This repo's stack: Vitest + React Testing Library for unit/component tests,
Playwright for e2e. Coverage thresholds are enforced at 90%
(statements/branches/functions/lines) over `app/**`, `components/**`,
`lib/**` — see `vitest.config.ts` for the exact include/exclude. Every
`pre-commit`/`pre-push`/CI run is `npm run verify` (typecheck + lint +
format:check + coverage + e2e). A feature isn't done until it's covered and
that full gate is green.

## Where tests go

- `__tests__/unit/` — pure functions, API route handlers (Node-shaped logic)
- `__tests__/components/` — pages and components (React Testing Library)
- `__tests__/e2e/` — Playwright, full browser
- `__tests__/support/` — shared mock helpers, imported by the above three

Never colocate a test next to the file it tests.

## The environment

`vitest.config.ts` sets `environment: 'jsdom'` globally — every test file
runs in jsdom by default, including API route tests (Next's `NextRequest`/
`NextResponse` work fine under it). Component test files in this repo start
with `// @vitest-environment jsdom` as a documentation marker even though
it's redundant with the global default — keep doing that, it makes the
file's intent explicit at a glance.

## Mocking `@/lib/supabase`

Every component/page that touches Supabase follows this exact pattern:

```ts
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase'
import { createSupabaseMock } from '../support/supabaseMock'

const supabaseMock = createSupabaseMock()
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
)
```

The `as unknown as` is required — the mock's shape doesn't structurally
overlap enough with the real `SupabaseClient` type for a direct cast.

`createSupabaseMock()` (`__tests__/support/supabaseMock.ts`) is
**queue-based**: `queueResult()` pushes one result, consumed in call order
by the next `.single()` or bare `await query`. This is the single biggest
source of flaky tests in this repo — get the queue order right:

- `auth.getUser()` does **not** consume the queue — it returns whatever user
  `supabaseMock.setUser(...)` last set. Don't queue a result for it.
- `storage.from(bucket).getPublicUrl(path)` is synchronous in real Supabase
  (no `await` at the call site) — the mock returns the queued value directly,
  not wrapped in a promise.
- Every other `.from(table)...` chain — `.select()`, `.insert()`,
  `.update()`, `.delete()`, `.eq()`, `.order()`, `.ilike()`, `.not()`,
  `.is()` — returns the same builder and is "thenable"; queue one result per
  DB round-trip in the exact order the component code issues them.
  `Promise.all([...])` of two queries still consumes the queue in
  left-to-right array order.
- If a component re-fetches on state change (e.g. this repo's home page
  refetches on every filter/sort change), each triggering interaction needs
  its own queued result — count them.
- Call `supabaseMock.reset()` in `beforeEach` for any suite where a
  component's effects could still be resolving when the next test starts
  (anything with multiple sequential state-triggered fetches) — otherwise a
  leftover queue entry from test N silently feeds test N+1.

## Mocking `next/navigation`

`useRouter`/`usePathname`/`useParams` need per-file mocks. When a test needs
to vary the returned value between `it()` blocks (e.g. a different route
param), don't hardcode it in the factory — close over a mutable `let`:

```ts
let currentId = 'A'
vi.mock('next/navigation', () => ({ useParams: () => ({ id: currentId }) }))
// ...
beforeEach(() => { currentId = 'A' })
it('handles an unknown id', () => { currentId = 'ZZZ'; /* ... */ })
```

## Mocking dynamically-imported components

The home page (`app/page.tsx`) loads `InventoryMap`, `InventoryTree`,
`InventoryCase`, and `PieceModal` via `next/dynamic`. When you `vi.mock` one
of these, it still resolves asynchronously through the `dynamic()` wrapper —
use `await screen.findByText(...)`, never a synchronous `getByText`, for the
first assertion after triggering it to render.

## Mocking the AI route (`@anthropic-ai/sdk`)

Never let a test call the real Anthropic API. Mock the SDK with `vi.hoisted`
so the spy is visible inside `vi.mock`'s factory:

```ts
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic { messages = { create: mockCreate } },
}))
```

## Photo-resize flows (add page, item detail page)

jsdom implements neither image decoding nor canvas rendering. Both pages
resize photos via `new Image()` + `<canvas>` before sending to the AI route.
Use `stubImageAndCanvas()` and `makeFile()` from `__tests__/support/
browser.ts` — the fake `Image` fires `onload` on the next microtask, and
canvas `getContext`/`toDataURL` are stubbed. To exercise the
portrait-vs-landscape resize branch, stub a taller custom `Image` class
inline (see the portrait-photo tests in `add-page.test.tsx` /
`item-detail-page.test.tsx` for the pattern).

## Selects and options

`fireEvent.change(select, { target: { value } })` only actually changes the
selected option if `value` matches an existing `<option>`. Several filters
in this app (place of origin, color, culture, etc.) populate their options
from `dynamicOptions` state fetched from Supabase — if a test needs to
select one of those, queue a `fetchDynamicOptions` result containing that
exact value first, don't just fire an arbitrary string.

## e2e conventions

Playwright specs live in `__tests__/e2e/`, run against `npm run dev` (see
`playwright.config.ts`), on both `chromium` and `Mobile Chrome` projects.
Prefer intercepting Supabase's REST calls at the network layer before
navigating, so specs don't depend on live data:

```ts
await page.route('**/rest/v1/pottery**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fixture]) }),
)
```

Unauthenticated/public flows (browsing, viewing an item) need no auth mock —
a fresh Playwright context has no session. `browse-inventory.spec.ts`
predates this convention and hits the real configured Supabase project
directly (read-only) — new specs should follow the mocked pattern above
instead.

## What to cover per file

- **API route handlers**: wrong input → 4xx, upstream failure → 500 (mocked,
  never real), happy path → 200 with the documented shape.
- **Components/pages**: render, empty/loading state, the main happy path,
  at least one error path, and prop-gated branches. Stub heavy children
  (`InventoryMap`'s `react-simple-maps` dependency, dynamically-loaded
  siblings) rather than rendering them for real inside a page test — their
  own dedicated test file already covers their internals.
- Don't write a test just to touch a defensive branch that's unreachable
  through the actual UI (e.g. a `?? fallback` on a field the TypeScript type
  guarantees is non-null) — note it and move on rather than contorting the
  test to force it.
