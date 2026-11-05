# Engineering Standards

What's in place in this repo and why. `CLAUDE.md` is the living source of truth for current state and commands — this doc is reference material for the reasoning behind it.

## The three layers

1. **Skills write the tests.** `.claude/skills/writing-tests`, `.claude/skills/guarding-against-regressions`, and `.claude/skills/maintaining-codebase` are instructions Claude follows — advisory only, not enforcement.
2. **Coverage thresholds measure.** `vitest.config.ts` turns "is it tested?" into a number the build checks — 90% on statements/branches/functions/lines, over owned code only (vendored/generated code excluded deliberately).
3. **Hooks and CI enforce.** They run the tests and block commits, pushes, and deploys on any failure. This is the layer that actually stops bad code from shipping.

Regressions get caught before they ship — that doesn't make them impossible. The gate is only as good as what it checks.

## Testing

One gate command, `npm run verify`: typecheck → lint → format check → unit/component tests with coverage → `npm audit` (production deps, high/critical) → end-to-end browser tests.

- **Unit tests** (Vitest): the `/api/generate-description` route handler, validation helpers.
- **Component tests** (React Testing Library): behavior, not markup — queries by role, text, or label, never CSS selectors where avoidable.
- **End-to-end tests** (Playwright): both desktop Chrome and mobile viewports. The backend is faked at the network layer in e2e specs; the Anthropic API is mocked everywhere, including unit/component tests — never a real call from the test suite.

Shared mock helpers, reused rather than rewritten (`__tests__/support/`):

- `supabaseMock.ts` — a queue-based fake Supabase client: queue one result per DB round-trip, consumed in call order.
- `http.ts` — a `NextRequest` builder for route-handler tests.
- `browser.ts` — `Image`/canvas/`URL.createObjectURL` stubs for the photo-resize flow, which jsdom doesn't implement.
- `render.tsx` — a thin re-export of Testing Library plus a `userEvent` setup helper.

Rules: a feature isn't done until its tests exist and the gate passes. A bug fix starts with a failing test that reproduces the bug. Coverage thresholds only go up — never lowered to force a green build.

## Enforcement — four layers, one command

- A git **pre-commit** hook runs `npm run verify`.
- A git **pre-push** hook runs it again.
- A **Claude Code `PreToolUse` hook** (`.claude/hooks/pre-push-check.sh`, wired in `.claude/settings.json`) runs it before Claude itself is allowed to `git push`, `vercel --prod`, or `npm run deploy`. Exit code 2 blocks the tool call.
- **GitHub Actions** runs it on every push and PR to `main`. Git hooks aren't copied with the repo (`.git/hooks/` isn't version-controlled), so CI is the backstop that survives a fresh clone — hooks are reinstalled via the `prepare` npm lifecycle script (`scripts/install-git-hooks.mjs`), which is version-controlled.

## Commit, push, deploy

Commit freely as work progresses. Push once work is confirmed working. Pushing does **not** deploy — `vercel.json`'s `git.deploymentEnabled.main: false` turns that off. Deploying is its own deliberate step: `npm run deploy` (verify, then `vercel --prod`).

For any change touching `app/api/**`: deploy a preview first, smoke-test the changed endpoint and a couple of unrelated ones (expect the right non-500 — 401/405, not a crash), then promote to production. The test suite catches logic bugs, not deploy-environment failures like import-time crashes (a client constructed at module top level that throws kills every route in that file) or serverless bundling gaps.

## Security

See `CLAUDE.md`'s **Known Gaps** section for what's accepted-but-not-yet-fixed. In place today:

- RLS on every table (`supabase-schema.sql`), public read / authenticated write — deliberate, not default-deny, because the public catalog is this app's actual purpose, not an exception to guard against.
- `/api/generate-description` requires a valid Supabase session (verified server-side via `auth.getUser(token)`, not just hidden client-side) — closed a real gap where any anonymous visitor could trigger billed Anthropic API calls.
- Security headers via `next.config.ts`: a CSP scoped to this app's actual external dependencies (Supabase, the world map's jsdelivr GeoJSON fetch), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a referrer policy.
- `npm audit` as a real gate (production dependencies, high/critical) — not just a report nobody reads.
- Supabase queries are always through the query builder, never raw SQL strings — no injection surface by construction.
- Secrets: only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose to the browser; `ANTHROPIC_API_KEY` never gets the `NEXT_PUBLIC_` prefix. Real values live in gitignored `.env.local` and in Vercel's dashboard; only `.env.example` (placeholders) is committed.

## What's intentionally not here

A few patterns common in larger/multi-service projects don't fit this app's actual shape, and were left out on purpose rather than copied reflexively:

- **Invite-only signup / emailed password reset** — there's no self-serve signup flow to restrict; staff accounts are created directly in the Supabase dashboard.
- **Webhook/Slack/Twilio-style auth tiers (shared secret, HMAC)** — no such integrations exist. The one protected route uses a session JWT, which is the right tier for a browser-called endpoint.
- **A read-only allowlist for third-party systems** — this app has exactly one write integration (Supabase), which it's supposed to write to as its core function; there's no proxied third-party write surface to lock down.
- **Database role enforcement** — no roles exist yet (auth is still binary staff/anonymous). Worth doing when Admin/Editor roles are actually built — see Known Gaps.
