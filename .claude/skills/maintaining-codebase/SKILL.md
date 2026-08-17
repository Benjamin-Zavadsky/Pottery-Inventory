---
name: maintaining-codebase
description: >-
  On-demand audit of pottery-inventory — outdated deps, dependency
  vulnerabilities, coverage vs. thresholds, type/lint/format drift, dead
  code, TODO/FIXME debt, doc drift vs CLAUDE.md. Reports findings by
  severity, fixes only safe things, never bypasses the gate.
---

# Maintaining pottery-inventory

Run this checklist when asked to audit the codebase, before onboarding a new
contributor, or periodically as hygiene. Report findings grouped by
severity (breaking / risky / cosmetic); fix only the safe, mechanical ones
inline (formatting, non-breaking dep bumps) and list the rest for the user
to decide on.

## Checklist

1. **Dependencies**
   - `npm outdated` — note major-version gaps, especially for `next`,
     `react`, `@supabase/*`, `@anthropic-ai/sdk` (breaking-change-prone).
   - `npm audit` — flag any high/critical advisory; don't run
     `npm audit fix --force` unattended, it can silently downgrade or
     replace packages.

2. **Coverage vs. threshold**
   - `npm run test:coverage` — confirm all four metrics (statements,
     branches, functions, lines) still clear the 90% floor set in
     `vitest.config.ts`. If a file's real coverage has drifted up, that's a
     ratchet opportunity — raise the threshold to lock in the gain (never
     lower it). If it's dropped below 90%, that's a build-breaking finding,
     not a cosmetic one.

3. **Type / lint / format drift**
   - `npm run typecheck`, `npm run lint`, `npm run format:check` — these
     should already be enforced by `npm run verify` on every commit, so
     drift here usually means the gate was bypassed (`--no-verify`) or the
     rule set changed underneath the repo (e.g. a `next`/`eslint-config-next`
     upgrade adding a new rule, as happened with `react-hooks/set-state-in-
     effect`). Fix formatting automatically (`npm run format`); report lint
     errors for review rather than blindly auto-fixing logic-adjacent rules.

4. **Dead code**
   - Known examples already present as of this writing — check whether they
     still apply, and look for the same pattern elsewhere:
     - `openAdd` in `app/page.tsx` is defined but never called (the "+ Add
       Piece" button is a plain `Link` to `/add`, not a local modal
       trigger).
     - The `onEditPiece` prop on `InventoryMap` and `InventoryTree` is
       declared and destructured but never invoked in either component body
       (only `InventoryCase`'s equivalent is actually wired up).
   - `react-d3-tree` is a dependency (`package.json`) but `InventoryTree.tsx`
     doesn't import it — confirm whether it's still needed before removing.

5. **TODO / FIXME debt**
   - `grep -rn "TODO\|FIXME" app/ components/ lib/` — age them against `git
     blame` if the count is large enough to prioritize.

6. **Doc drift vs. CLAUDE.md**
   - Cross-check `CLAUDE.md`'s claims against actual repo state — it has
     gone stale before (it claimed "no test framework is currently
     installed" while Vitest/Playwright/RTL were already fully configured
     in `package.json`, and claimed CI/hooks existed before they actually
     did). Specifically re-verify: the Common Commands section still
     matches `package.json` scripts, the Folder Structure section matches
     what's on disk, and the skills table lists every file under `skills/`
     and `.claude/skills/`.

7. **Security-adjacent** (full checklist lives in the `security-baseline`
   skill, not duplicated here) — spot-check at minimum: `app/api/generate-
   description/route.ts` has no method/auth/rate-limit check at all, so
   anyone with the URL can trigger a billed Anthropic call — flag this every
   audit until it's addressed, it won't fix itself.

## Reporting

Group findings as:
- **Breaking** — coverage below threshold, lint/type errors, a broken
  build. Fix now if safe, otherwise block and hand off.
- **Risky** — security gaps, major dependency upgrades needed, dead code
  that could confuse a future edit.
- **Cosmetic** — formatting, minor version bumps, doc nits.

Never bypass `npm run verify` to land a "fix" from this audit — if a fix
doesn't pass the gate, it isn't safe to auto-apply.
