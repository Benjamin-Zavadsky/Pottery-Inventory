---
name: guarding-against-regressions
description: >-
  Use when editing existing behavior or fixing a bug in this repo. Characterize
  current behavior with a test before changing it; bug fixes start with a
  failing test that reproduces the bug; never weaken, skip, or delete a test
  to go green; coverage only ratchets up.
---

# Guarding against regressions — pottery-inventory

## Before changing existing behavior

Read the current implementation and its existing test file in
`__tests__/components/` or `__tests__/unit/` fully before touching either.
If the behavior you're about to change has no test covering it yet, write
one that pins the _current_ behavior first, confirm it passes, then make
your change and update the test deliberately — don't change behavior and
test in the same uncharacterized step.

## Fixing a bug

1. Write a test that reproduces the bug — it should fail against the
   current code.
2. Fix the bug.
3. Confirm the test now passes, and that `npm run test:coverage` still
   clears the 90% threshold (`vitest.config.ts`).

Don't fix a bug by loosening an assertion, adding `.skip`/`.only`, or
deleting the test that caught it. If a test's expectation was itself wrong
(not the code), fix the test deliberately with a comment saying why the old
expectation was incorrect — never silently.

## Coverage only ratchets up

`vitest.config.ts`'s `coverage.thresholds` are the floor, not a target —
they're currently at 90% across all four metrics. If a change legitimately
raises real coverage, raise the threshold to match and lock in the new
floor. Never lower a threshold to make a red build pass; if you truly can't
cover a line without contorting a test around unreachable branches (e.g. a
`?? fallback` guarding a field the TypeScript type already guarantees is
non-null), leave it as the one line of slack in the file's total rather than
touching the global threshold.

## Common regression source in this repo: mock queue order

`__tests__/support/supabaseMock.ts` is queue-based — `queueResult()` calls
are consumed in the exact order the component issues Supabase queries. If
you reorder, add, or remove a Supabase call inside a component (e.g.
change the order `handleSave` uploads a photo vs. inserts the row in
`app/item/[id]/page.tsx`), every test exercising that path will still run
but silently receive the wrong queued result for the wrong query — producing
confusing failures far from the actual change. When editing any function
that talks to Supabase, re-read its existing test's `queueResult()` calls
and their comments before assuming the test still matches call order.

## Never bypass the gate

Don't reach for `--no-verify`, `.skip`, or commenting out a hook to get past
a failure — find out why it's failing. If a pre-commit/pre-push run seems
wrong, run `npm run verify` manually and read the actual failure; the hooks
run nothing the manual command doesn't also run.
