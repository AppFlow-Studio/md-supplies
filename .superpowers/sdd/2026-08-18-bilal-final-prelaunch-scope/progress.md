# SDD ledger — plan: docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md

## Setup

- Working in place on branch `catalog-cro-review-sardor-dev` (user declined an
  isolated worktree — 3 pre-existing uncommitted doc files from prior session
  work remain untouched and out of scope for this plan).
- Baseline verified clean before Task 1: `npm test` → 146/146 files, 1494/1494
  tests passing.
- Spec: Bilal's 2026-08-18 Slack message (pasted into the session, no separate
  spec file) — the plan document itself carries the spec text inline per its
  own "Spec:" header. No separate spec doc to cross-check against.

## Pre-flight conflict scan

| Pair / Task | What's shared | Finding |
|---|---|---|
| Task 1 (filter-registry.ts) vs others | — | No other task touches `lib/filter-registry.ts`. Clean. |
| Task 2 vs Task 10 vs Task 11 | `proxy.ts`, `__tests__/proxy.test.ts` | All three add/read `REDIRECT_ENTRIES`. Plan order (2 → 10 → 11) is correct: Task 11's audit script must run after both hand-written entries exist so it reports on the final state, not a partial one. Serial dispatch (this skill never parallelizes implementers) makes this safe as long as task order is preserved — ruling: preserve plan order exactly, do not reorder for convenience. |
| Task 4 vs Task 6 vs Task 8 | `components/product/ProductView.tsx`, `ProductView.test.tsx` | Three different sections of the same file (You May Also Need block / RETURNS tab / ORDER PACKAGING tab) and its test file. No logical overlap in the sections touched. Serial dispatch means each starts from the prior task's committed HEAD — safe in plan order (4 → 6 → 8). |
| Task 7 vs Task 4/6/8 | `ProductView.test.tsx` (Task 7 Step 3 may add a fixture-based test here) | Task 7 runs after 4 and 6, before 8, in plan order — starts from Task 6's committed state. No conflict as long as order is preserved. |
| Task 5 (cart.ts, types.ts, CartPopup.tsx, CartPageClient.tsx) | — | No other task touches these files. Clean. |
| Task 3 (nav component, TBD file) | — | Task 1 doesn't touch nav; no overlap. The nav file itself is unknown until Task 3's own Step 1 investigates — this is an intentional investigation-gated task, not a plan defect. |
| Task 9 (homepage/search, e2e) | — | No overlap with any other task's files. Clean. |
| Task 12 (docs only) | — | Depends on all prior tasks' outcomes but touches no shared code file. Clean, must run last (already last in plan order). |
| Self-consistency: Task 3 | Conditional steps ("skip if Step 1 finds no gap") | Intentional — the task cannot know ahead of time whether a code change is needed until its own investigation runs. Not a defect; implementer instructed to record the finding either way. |
| Self-consistency: Task 6 | Fixture assumes Shopify bold-mark shape `{ type: 'text', value, bold: true }` | Plan text itself flags this as unverified and instructs the implementer to confirm against real QA data before trusting the fixture (Step 1's parenthetical). Flagged here as a risk to watch in review, not a conflict — ruling: if the implementer's real-data check finds a different mark shape, they are authorized to adjust the fixture/type to match reality; this is expected, not a plan violation. |
| Global Constraints vs all tasks | "no push/PR/deploy without go-ahead" | Every task's Step N commit is `git commit` only, never `git push`. Consistent throughout. |

**Scan result:** no true contradictions found. All shared-file cases are resolved by preserving plan task order (already the dispatch order below) rather than reordering for convenience. One flagged risk (Task 6 mark-shape assumption) is pre-authorized to self-correct against real data.

## Task log

Task 1: complete (commits 75a92d8..3ff3fa2, review clean)
Task 2: complete (commits 3ff3fa2..5333f19, review clean)
Task 3: minor (deferred): nav entry is labeled "Surgery & Procedure" not "Trocar Supplies" — display name is client-approved copy (lib/category-tree.ts:52-56), a client-copy decision not a dev fix; the underlying destination/position are correct (verified: always-visible primary group, direct resolution to /category/trocars-trocar-kits, no alphabetical sort exists anywhere in the nav pipeline).
Task 3: complete (no commits — verification only; brief's premise about which file builds the live nav was wrong, corrected and independently re-verified by reviewer; review clean)
Task 4: minor (deferred): manual browser walkthrough (brief Step 5, both PDP routes/breakpoints) not performed — claude-in-chrome reported "not connected" in this environment. Automated RTL/a11y tests fully cover the link-swap behavior (role, href, focus, no nested button) per reviewer's judgment, but a human/tooled spot-check on a live PDP is still recommended before launch — carry into Task 12's evidence doc checklist.
Task 4: minor (deferred): no axe/jest-axe wired into the vitest component suite for a11y testing (only Playwright e2e has @axe-core/playwright, e.g. e2e/axe.spec.ts) — brief assumed one existed. Worked around correctly with role/focus assertions matching the file's real existing idiom; wiring real axe into vitest is a separate backlog item, not this plan's scope.
Task 4: complete (commits 5333f19..9d1e377, review clean)
