@AGENTS.md

# Pottery Inventory

Pottery Inventory is a professional collection management system for a family-owned store's archaeological ceramics collection, currently comprising approximately 200 pieces with ongoing additions. The app is being developed to support a 501(c)(3) nonprofit registration and serves as the canonical record of the collection's documentation, provenance, and research history. Multiple authenticated staff members access the backend to photograph, catalog, and edit pieces, with Claude's vision API generating detailed attributions from photos. The public-facing frontend is open to anyone with the link — no login required — allowing appraisers, researchers, and the general public to browse the collection. The long-term goal is a fully separated public catalog and authenticated staff portal.

## Tech Stack

**Framework:** Next.js 16.2.3 (App Router). Breaking changes from older versions — middleware is named `proxy.ts` not `middleware.ts`. Read `node_modules/next/dist/docs/` before touching routing.

**Language:** TypeScript 5, strict mode enabled.

**Styling:** Tailwind CSS v4. Uses `@import "tailwindcss"` syntax — do NOT use `@tailwind base/components/utilities` directives from v3.

**Database:** Supabase (PostgreSQL) via `@supabase/ssr`. Browser client only — always initialize with `useMemo(() => createClient(), [])` inside components. Row Level Security enabled: public read, authenticated write.

**Storage:** Supabase Storage, bucket `pottery-photos`, public read.

**Auth:** Supabase Auth. Binary for now — logged in (staff) or anonymous (public). Planned: role-based access (Admin, Editor) before additional staff are onboarded.

**AI:** Anthropic Claude API, model `claude-opus-4-7`, multi-image vision. Images must be resized to max 1568px via canvas before base64 encoding — raw mobile photos exceed Vercel's 4.5MB serverless payload limit. The AI analysis route is always mocked in tests — never make real Anthropic API calls from the test suite.

**Deployment:** Vercel, auto-deploys from `main` branch. Environment variables set in Vercel Dashboard.

**Testing:** Vitest + React Testing Library for unit and component tests. Playwright for E2E tests. The Anthropic API is mocked in all test contexts. Pre-commit runs lint + typecheck. Pre-push runs unit and component tests. GitHub Actions CI runs the full suite including E2E on every push to `main`.

**Planned — Case & Location Tracking:** A `cases` table, a `location_history` table, and a case management view are planned. The 6 official case locations are: A — Left Tower, B — Center Left, C — Center Right, D — Right Tower, B — Center Left Top Surface, C — Center Right Top Surface. Do not build location features using free-text — always reference the cases table.

**No test framework is currently installed.**

## Folder Structure

```
app/                          # Next.js App Router — all pages and API routes
  page.tsx                    # Public inventory grid (home page)
  layout.tsx                  # Root layout — viewport, meta tags, fonts
  globals.css                 # Tailwind v4 import + safe-area utilities
  add/
    page.tsx                  # Add new piece — auth-gated, photo mode picker, AI analysis
  item/[id]/
    page.tsx                  # Item detail + edit — public view, edit gated to auth
  cases/                      # (planned) Case management — inventory by display case
  api/
    generate-description/
      route.ts                # Claude vision API — accepts images + user context, returns JSON

components/                   # Shared React components used across 2+ pages
  AuthGuard.tsx               # Redirects unauthenticated users away from protected pages
  BottomNav.tsx               # Mobile-only bottom navigation bar

lib/                          # Shared utilities and configuration
  supabase.ts                 # Supabase browser client factory (createBrowserClient)
  types.ts                    # TypeScript types — PotteryItem and future shared types

__tests__/                    # All tests — never colocate test files with source files
  unit/                       # Vitest unit tests — pure functions (resize, validation, SKU)
  components/                 # React Testing Library — component behavior tests
  e2e/                        # Playwright — full user flow tests in real browser

public/                       # Static assets — images, icons, fonts

skills/                       # Claude task-specific instruction files (see Phase 3)

supabase-schema.sql           # Canonical DB schema — source of truth for all table definitions
.env.example                  # Required environment variable names with placeholder values
```

**Rules:**
- New shared components go in `components/` only if used in 2 or more places
- New API routes go in `app/api/` following the Next.js App Router convention
- New shared types go in `lib/types.ts`
- All tests go in `__tests__/` — never next to the file being tested
- `supabase-schema.sql` must be updated any time the database schema changes

## Coding Conventions

**Supabase client**
Always initialize with `useMemo(() => createClient(), [])` inside the component body. Never call `createClient()` at module level, in a `useCallback`, or in a dependency array. Violating this causes infinite re-renders.

**Image handling**
Always resize images to a maximum of 1568px on the longest side at 85% JPEG quality using canvas before base64 encoding. Never send raw `File` objects or unresized buffers to `/api/generate-description`.

**Error handling**
Supabase errors are plain objects — not `instanceof Error`. Always extract messages with:
```ts
const msg = err instanceof Error
  ? err.message
  : (err as { message?: string })?.message ?? 'Something went wrong'
```

**Database inserts**
Every key in a Supabase `.insert()` or `.update()` call must exist as a column in `supabase-schema.sql`. Check before adding a new field.

**Constrained fields**
`condition`, `rarity`, and `originality` have Postgres CHECK constraints. Always validate against the allowed list before inserting:
```ts
condition: CONDITIONS.includes(form.condition) ? form.condition : null
```

**Imports**
Use the `@/` alias for all internal imports. Never use relative paths like `../../lib/supabase`.

**Components**
Small sub-components belong at the bottom of the file that uses them. Only move a component to `components/` if it is used in two or more separate files.

**Auth**
Check authentication with `supabase.auth.getUser()` inside a `useEffect`. Gate UI elements conditionally based on the result. Never wrap public-facing pages in `AuthGuard`.

**TypeScript**
Strict mode is enabled. No `any` types. Use `unknown` and narrow explicitly.

**Comments**
Write no comments by default. Only add one when the WHY is non-obvious. Never describe what the code does.

**Naming conventions**
- Database columns and table names → `snake_case`
- TypeScript types, interfaces, and React components → `PascalCase`
- Functions and variables → `camelCase`
- Environment variables and top-level constants → `SCREAMING_SNAKE_CASE`
- Folder names and URLs → `kebab-case`

**Security**
`ANTHROPIC_API_KEY` must never have the `NEXT_PUBLIC_` prefix. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to be public. Never use `dangerouslySetInnerHTML`.

**Row Level Security**
Every new Supabase table must have RLS policies defined in `supabase-schema.sql` before it is used in code. Never disable RLS on any table.

**Mobile and desktop**
Data entry happens on mobile — that workflow is the priority. Public browsing happens on both mobile and laptop — all views must work on both. Build data entry mobile-first, verify desktop. Always verify safe-area insets on notched devices. Use `pb-safe` and `pb-nav` utilities defined in `globals.css`.

**API route contract**
All API routes must return `{ error: string }` on failure with an appropriate HTTP status code, and a consistent documented shape on success. Never expose raw internal error messages or stack traces to the client.

## Forbidden Patterns

- **Never** call `createClient()` outside of `useMemo` — causes infinite re-renders
- **Never** send unresized images to `/api/generate-description` — exceeds Vercel's 4.5MB limit
- **Never** use `btoa(String.fromCharCode(...new Uint8Array(buffer)))` spread — stack overflow on large files
- **Never** insert a field that isn't in `supabase-schema.sql` — causes untraceable errors
- **Never** skip validation on `condition`, `rarity`, or `originality` before inserting
- **Never** prefix `ANTHROPIC_API_KEY` with `NEXT_PUBLIC_` — exposes the key in every browser session
- **Never** commit `.env.local` or any file containing real credentials
- **Never** disable Row Level Security on any table
- **Never** store case or location data as free text — always reference the `cases` table
- **Never** make real Anthropic API calls from the test suite
- **Never** force push to `main`
- **Never** skip pre-commit hooks with `--no-verify`

## Common Commands

**Development**
```bash
npm run dev          # Start local dev server at http://localhost:3000
npm run build        # Production build — also runs TypeScript typecheck
npm run lint         # Run ESLint across the project
```

**Testing** *(once installed in Phase 4)*
```bash
npm run test         # Run unit and component tests (Vitest)
npm run test:e2e     # Run end-to-end tests (Playwright)
npm run typecheck    # TypeScript typecheck without building
```

**Deployment**
Push to `main` on GitHub — Vercel auto-deploys. No manual deploy command needed.
Monitor at: Vercel Dashboard → pottery-inventory → Deployments.

**Database changes**
1. Update `supabase-schema.sql` first
2. Run the new statements in Supabase Dashboard → SQL Editor

Never alter the database directly without updating `supabase-schema.sql` first.

**Environment setup** *(new machine or new contributor)*
```bash
git clone https://github.com/Benjamin-Z-web/Pottery-Inventory.git
cd pottery-inventory
npm install
cp .env.example .env.local   # Fill in real values from Supabase + Anthropic dashboards
npm run dev
```

## Recovery Runbook

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Failed to fetch" / infinite re-render | `createClient()` outside `useMemo` | Wrap in `useMemo(() => createClient(), [])` |
| Vercel build fails | Missing environment variables | Add all three env vars in Vercel → Settings → Environment Variables |
| Vercel shows "Ready" but returns 404 | Deployment Protection enabled | Disable in Vercel → Settings → Deployment Protection |
| Save fails with "Something went wrong" | Supabase error not surfaced, or unknown column inserted | Check browser console. Verify all insert fields exist in `supabase-schema.sql` |
| Save fails with "violates check constraint" | AI returned invalid value for constrained field | Validate `condition`, `rarity`, `originality` against allowed arrays before inserting |
| Multi-photo analysis only processes first photo | Images not resized — payload exceeds 4.5MB | Ensure canvas resize runs before base64 encoding |
| AI analysis returns no results | Invalid model name or missing API key | Verify `ANTHROPIC_API_KEY` is set. Model must be `claude-opus-4-7` |
| Photos not showing after upload | Storage bucket not public | Supabase → Storage → pottery-photos → Make Public |
| "relation pottery does not exist" | Schema not run in Supabase | Run `supabase-schema.sql` in Supabase Dashboard → SQL Editor |
| New contributor can't run the app | Environment variables not configured | Copy `.env.example` to `.env.local` and fill in values |
| Git push rejected | Git identity not configured | Run `git config --global user.email` and `git config --global user.name` |
| Supabase data visible but edits fail | RLS policy missing for authenticated write | Add insert/update policies to the table in `supabase-schema.sql` and run in SQL Editor |

## Workflow Directives

**Every task — without exception — follows this sequence:**

1. **Explore** — Read every file that will be touched. Never act on assumptions from conversation history. The file may have changed.
2. **Plan** — Write a numbered plan stating which files change and what changes in each. Wait for explicit approval before writing any code.
3. **Code** — Implement exactly what was approved. Nothing more.
4. **Commit** — Stage the relevant files and commit with a conventional message (`feat:`, `fix:`, `chore:`, `refactor:`), then push to `main`.

This sequence applies to every task — a one-line fix and a new feature follow the same steps.

**Scope**
Do exactly what was asked and nothing more. Do not refactor surrounding code, rename variables for consistency, add unrequested error handling, or restructure files that weren't mentioned.

**Commit format**
- `feat:` — new functionality
- `fix:` — bug fix
- `chore:` — config, dependencies, tooling
- `refactor:` — restructuring without behavior change
