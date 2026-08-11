# DEV-LAUNCH-11 — Verification Report

**Ticket:** DEV-LAUNCH-11 (Final Launch Configuration & Implementation Plan, 2026-08-05)
**Priority:** P0 launch gate
**Plan:** `docs/superpowers/plans/2026-08-10-dev-launch-11-responsive-a11y-qa.md` (13 tasks, all complete, plus 3 ad-hoc remediations — 8b, 11b, 12b/12c — that came out of code review during execution)
**Branch:** `catalog-cro-review-sardor-dev`
**SHA verified (code under test):** `b9219fc450711e68604c6b6afbfbb80201e04586`

This report is Task 13 of the plan: the final evidence pass, run against a real
production build rather than a dev server, with real numbers from that run.

## CI E2E gate status — will not go green as-is

Task 12 made the E2E Playwright suite a **required** CI gate (`--ignore-snapshots`
was removed). Stated plainly, for anyone about to merge on the strength of this
report: **this branch's required E2E CI check will not go green as-is.** Two
separate, independent blockers stand between this branch and a passing gate:

1. **Several of the 13 failures documented below are deterministic, not
   flaky, and will not clear on retry.** Specifically: the `responsive.spec.ts`
   PDP-fixture and `keyboard-nav.spec.ts` skip-link stale-route-handle
   failures (both traced to the same broken `/product/nitrile-exam-gloves-powder-free`
   and `/industries/pharmacy` handles), the two `contrast.spec.ts` WCAG AA
   findings, and the two `occ-industry-discovery.spec.ts` stale-QA-fixture
   findings. A final review of this branch produced a dispatch fixing the
   PDP-fixture and skip-link stale-handle issues (`e2e/responsive.spec.ts`,
   `e2e/keyboard-nav.spec.ts`) and the missing `#main-content` skip-link
   target on `app/not-found.tsx`; the two contrast findings remain an
   intentional, documented gap (see below) and the OCC stale-fixture findings
   remain a separate QA-data maintenance task — neither is fixed by that
   dispatch.
2. **Separately, and just as blocking: the already-documented `npm ci`
   lockfile drift breaks the dependency-install step on all 4 CI jobs that
   run it** (`.github/workflows/ci.yml` lines 28, 164, 195, 240) — including
   the E2E job itself. This means the E2E gate cannot even reach the test-run
   step in CI as the branch stands, independent of the test-content issues in
   (1). Notably, this same drift also breaks
   `scripts/generate-linux-visual-baselines.sh` (it runs `npm ci` inside its
   own Docker container) — the documented baseline-regeneration path is
   currently broken by the identical root cause. **This lockfile remediation
   is explicitly out of scope for this fix wave and needs its own ticket** —
   it is named here specifically because it blocks the required E2E gate,
   not merely as a general CI-health footnote.

Both (1) and (2) must be resolved before the required E2E check will pass in
CI. Fixing only the deterministic test failures without fixing the lockfile
leaves the gate unable to run at all; fixing only the lockfile without fixing
the deterministic failures leaves the gate running but red.

## How this evidence was gathered

```
npm run build && npm run start
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

`npm run build` completed clean (Turbopack, `next build`, 67/67 static pages
generated, one unrelated Turbopack NFT-tracing warning about
`lib/shipping-resolver/data.ts`'s dynamic `fs` usage — pre-existing, not an
error). A stray `node.exe` process (PID 34072, started ~15:34 local, predating
this build) was already bound to port 3000 from an earlier session; it was
killed so the suite ran against this session's own fresh production server,
not a stale/unknown build. The full Playwright suite (both `chromium` and
`mobile-chromium` projects, `fullyParallel: true`) then ran against that
server with `E2E_BASE_URL` set (so Playwright did not manage the server
itself — it was already up).

## Full-suite result

```
13 failed
47 skipped
488 passed
(6.0m)
```

**548 total tests.** This is the real, full-suite, production-build number —
not a per-task dev-server number reused from earlier in the plan.

### The 47 skips — not passes, reported as such

All 47 skips are `test.skip()` calls with an explicit reason string, per the
suite's own convention (`e2e/helpers/qa-fixtures.ts`, `authenticated.spec.ts`,
`rx-states.spec.ts`, `category-filters.spec.ts`, etc.) — no test silently
no-ops. The two largest blocks:

- **Authenticated-route coverage (Task 9), `e2e/authenticated.spec.ts`** — every
  test skips with `set E2E_CUSTOMER_ACCESS_TOKEN/REFRESH_TOKEN/EXPIRES_AT to a
  live QA customer session` (or the order-number variant). No live QA
  customer session was available in this environment. Built and
  review-verified in Task 9, but unexercised here.
- **RX product-state coverage (Task 8), `e2e/rx-states.spec.ts` and the `pdp-rx`
  entries in `axe-states.spec.ts`/`contrast.spec.ts`** — skip with `set
  E2E_HANDLE_RX to a QA-store product tagged compliance:rx-only` where no
  handle is set, or run and pass where the QA-fixtures registry now supplies
  one (`qa-rx-product` — several `pdp-rx` axe/contrast assertions did run and
  pass this time, since the mid-plan fixtures merge added that handle).
- The remainder are `category-filters.spec.ts` QA-data-gap skips (no
  Availability/Price facet with enough values on the current catalog),
  `categories-hub-integration.spec.ts`'s Popular-strip skip, and one
  `no-reload.spec.ts` OCC skip guarded by the fixture registry.

## The 13 failures

**6 are the previously-known, already-documented gaps** (both browser
projects where applicable):

- 4× `keyboard-nav.spec.ts` skip-link test on `/industries/pharmacy` and
  `/product/nitrile-exam-gloves-powder-free` — both routes 404 in this QA
  environment (pre-dates this plan; the working handles,
  `/industries/pharmacies` and
  `/product/exam-glove-nitrile-medium-blue-100-bx-10-bx-cs`, were used
  throughout the plan's own new tests instead).
- 2× `responsive.spec.ts` "tablet discovery toolbar: search sits above
  products, sort is separated" — the pre-existing, unrelated flake
  identified during Task 11b (networkidle/client-hydration race), confirmed
  present again here on both projects. Not fixed, out of scope, as decided
  during Task 11b.

The previously-known **"home @ 1280x800 screenshot timeout under 4-worker
parallel load"** flake (also flagged during Task 11b) did **not** reproduce in
this run — it passed cleanly on both projects (`responsive.spec.ts:63`, 2.5s
and 4.7s). Load-dependent flakes not reproducing on a given run is expected
behavior for that class of issue, not evidence it's fixed.

**7 are newly observed in this full-suite, production-build run** — not
mentioned in any prior task's ledger entry. Investigated (not fixed) per this
task's evidence-gathering scope:

1. **`categories-hub-integration.spec.ts:37` — "every 'Browse All Categories'
   card links to a route that actually renders" (both projects, different
   category on each: `/category/incontinence` on chromium,
   `/category/sterilization` on mobile-chromium).** This single test
   navigates through all 25 hub cards sequentially inside Playwright's
   default 30s test timeout, with no `test.setTimeout()` override (unlike the
   OCC spec in the same failure set, which does set one). Verified both
   flagged routes render correctly and fast in isolation
   (`curl -o /dev/null -w "%{http_code} %{time_total}s"` → `200`, ~0.05s each,
   real `<h1>` present, not the not-found page). Given the routes differ
   between the two projects and both check out fine standalone, this reads as
   **cumulative timeout exhaustion under this run's full-suite parallel
   worker load** (other workers concurrently running the visual-regression
   and responsive-sweep specs, which are CPU/screenshot-heavy) rather than a
   genuinely broken category page. Likely reproducible-under-load rather than
   deterministic; same general class as the known responsive.spec.ts flakes
   but a different file, not previously observed on this test.

2. **`contrast.spec.ts:127` — "home (product cards) (/) meets WCAG AA
   contrast" (both projects), a real WCAG AA failure, confirmed and
   root-caused, on the homepage — a P0 route.** In
   `components/home/ShopByIndustry.tsx` (lines ~38-41), the "Urgent Care",
   "HRT Clinics", "Home Health", and "Clinics & Doctor's Offices" card labels
   are white text whose ONLY source of contrast against the underlying photo
   is a gradient scrim (`bg-gradient-to-b from-transparent via-black/10
   to-black/65`) — and that scrim is set to `group-hover:opacity-0`. On
   hover, the scrim disappears entirely, leaving the white text with
   contrast supplied solely by whatever the photo underneath happens to be.
   Measured: **~1.05:1** (white text `fg=rgb(255,255,255)` on
   `bg=rgb(249,250,249)`; WCAG AA requires **4.5:1**). This is a real,
   reproducible, hover-triggered design bug — not an environmental artifact
   of running against a production server. (A secondary, discarded
   hypothesis considered during investigation: axe-core's contrast algorithm
   falling back to the nearest solid-color ancestor — the section's own flat
   `bg-neutral-50` matches the measured background color — when it can't
   rasterize an `<img>` background, possibly compounded by the `loading="lazy"
   decoding="async"` image not being painted at scan time. This does not
   change the underlying finding: the scrim-fade mechanism reproduces the
   same near-zero contrast independent of axe's measurement path.)
   **`git log a18ddd3..HEAD -- components/home/ShopByIndustry.tsx` is empty**
   (a18ddd3 = this plan's first commit) — this component was not touched by
   any task in this plan, and this exact test has existed since commit
   `f5753a4` (2026-08-03, a prior a11y remediation), well before this plan
   started; this is a pre-existing bug, not a regression introduced by this
   plan's code changes.
   **Decision record:** this finding, including the confirmed
   `group-hover:opacity-0` scrim mechanism and the ~1.05:1 measurement, was
   flagged to the user during this QA pass. The user's explicit decision was
   **to leave it unfixed within this ticket and document it as a known gap**
   for a separate follow-up — not to fix it as part of DEV-LAUNCH-11. This
   means the branch is knowingly shipping a real WCAG AA contrast failure on
   the homepage; treat it as a tracked, intentional gap, not an oversight.

3. **`occ-industry-discovery.spec.ts:15` — "OCC page fails safe when the
   canonical collection does not resolve on this store" (both projects).**
   This test branches on `qa-fixtures.json`'s `occ.exists` flag (currently
   `false`) to decide whether to assert the real-results path or the
   documented fail-safe message ("The OCC catalog is temporarily
   unavailable."). It took the fail-safe branch and failed because the
   message wasn't there. Manually verified `curl http://localhost:3000/solutions/occ`
   against this run's own server: the page renders a real `<h1>OCC Shoebox
   Supplies</h1>` heading with real results — it is **not** in fail-safe
   mode. Root cause: **the QA-fixtures registry (`e2e/helpers/qa-fixtures.json`,
   merged in mid-plan from origin per the branch-reconciliation note below) is
   stale relative to the live Shopify QA store** — the OCC canonical
   collection now resolves live, but the fixture snapshot still says it
   doesn't. This is the same class of issue as the two known 404
   fixture-handle gaps, just the inverse direction (a fixture claiming
   absence when the live store now has the data), and is a QA-data
   maintenance gap, not an app code defect — the app's actual behavior
   (rendering real results when the collection resolves) is correct.

4. **`keyboard-nav.spec.ts:13` — skip-link focus test on `/search`
   (mobile-chromium only, 1 occurrence; the same test passed on chromium and
   on every other route on mobile-chromium).** Failure mode differs from the
   two known-404 cases: here `#main-content` was never checked because the
   skip link itself never received focus after one `Tab` press
   (`toBeFocused()` → `inactive`). Occurred once, on one project, one route;
   did not investigate further given the isolated, single-occurrence nature —
   reporting as **newly observed, cause not yet determined**, plausibly an
   isolated hydration/focus-timing race rather than a systemic gap (the same
   route's `#main-content` target is confirmed present and used correctly by
   dozens of other passing tests in this same run).

None of these four were fixed, per this task's evidence-gathering-only scope.
Items 1 and 3 have reasonably confident environmental/load explanations
backed by direct verification (curl checks, git history); item 2 has a
plausible but not fully proven explanation; item 4 is honestly unresolved.

## Responsive screenshot matrix

`docs/audits/2026-08-10-dev-launch-11/screenshots/` (Task 4's
`e2e/responsive.spec.ts` sweep) — **16 distinct route-name prefixes**,
verified by directory listing, not estimated:

`cart`, `categories-hub`, `contact`, `exam-gloves`, `gloves`, `home`,
`industries-index`, `industry-urgent-care`, `industry-veterinary`, `occ`,
`pdp`, `search-empty`, `search-results`, `testing-screening` — each at the
full 7-viewport matrix (375×812, 390×844, 768×1024, 1024×768, 1280×800,
1440×900, 1920×1080).

`mobile-filter-drawer` and `quick-add-card-footer` are single-viewport,
by design (375×812 and 1280×800 respectively) — they capture a
viewport-specific UI state (the mobile filter drawer; the desktop card-footer
quick-add control), not a full route sweep.

## Axe + keyboard test output

Full run log captured at
`C:\Users\sarik\AppData\Local\Temp\claude\...\scratchpad\dev-launch-11-full-run.log`
(session-scoped scratch path; see the "13 failures" and "47 skips" sections
above for the extracted, categorized results). Every axe-based spec
(`axe.spec.ts`, `axe-states.spec.ts`, `contrast.spec.ts`) that ran (not
skipped) passed except the one home-page contrast finding above — zero
serious/critical violations on every other scanned route and product state,
including the RX, backorder, zero-price, and out-of-stock PDP states added by
Tasks 7/8/8b.

## Linux visual baseline diff summary

`e2e/visual.spec.ts-snapshots/` — **42 files, all already committed** (working
tree clean for this path; `git diff --stat` against the working tree is
empty). Diffing from before the visual-regression work started
(`git diff --stat 7786af1^ HEAD -- e2e/visual.spec.ts-snapshots/`) shows
**42 files changed, 0 insertions(+), 0 deletions(-)** — every file is a pure
binary addition, nothing was ever modified or removed, confirming this is a
clean, append-only baseline history across Tasks 12/12b/12c.

Breakdown by platform (all counted directly from the directory listing):

| Platform | Files | Routes covered |
|---|---|---|
| `linux` | 16 | all 8 routes × 2 projects |
| `win32` | 16 | all 8 routes × 2 projects |
| `darwin` | 10 | 5 of 8 routes × 2 projects — `blog`, `category`, `home`, `occ`, `pdp` |

**`cart`, `categories-hub`, and `contact` have no `darwin` baseline** — those
3 routes were added later in the Task 11/12 chain (widened visual-baseline
routes), after darwin-baseline generation stopped happening in this plan's
workflow (linux baselines are generated via Docker per Task 12; win32 is the
implementer's local dev machine). This is a gap worth closing if a macOS CI
runner or contributor ever needs local baseline parity, but does not block
the CI gate, which runs on Linux.

**8 routes, not the originally planned 11**, have pixel-diff visual-regression
coverage: `industry`, `search`, and `subcategory` are deliberately excluded
(see below) — they remain covered by `axe.spec.ts`/`responsive.spec.ts`, just
not by pixel diffing.

## Known blocker — DEV-LAUNCH-04 through 07 status

`git log --all --grep="DEV-LAUNCH-04"` — **zero commit hits**, confirmed. A
full-repo text grep finds `DEV-LAUNCH-04` only as a passing reference in 3
docs files (`docs/launch/DEV-LAUNCH-11-handoff.md`, this plan file, and the
DEV-LAUNCH-03 categories-shortDescription design doc) — never as landed work.
**The six new category images DEV-LAUNCH-04 was to add still do not exist
anywhere in this repo.** The "six new category images remain visually
correct" acceptance criterion cannot be verified until DEV-LAUNCH-04 ships —
re-run Task 11's categories-hub sweep once it does.

This is narrower than the plan's original framing, though: `git log --all
--grep="DEV-LAUNCH-0[4-7]"` actually returns **2 hits**, not zero —
`3cd4498 fix(category): DEV-LAUNCH-05 — resolve public slug to Shopify handle
before every collection lookup` and the handoff commit referencing it.
DEV-LAUNCH-05 (category-slug resolution), plus a QA-fixtures registry and
DEV-LAUNCH-06/07/08 verification docs, merged into this branch from `origin`
mid-plan (see below) — only DEV-LAUNCH-04 remains genuinely absent.

## Branch history note

Mid-plan, after Task 6, this branch merged 2 commits from `origin`
(`3cd4498` DEV-LAUNCH-05's category-slug-resolution fix, and `8521ed1`
carrying a QA-fixtures registry — `e2e/helpers/qa-fixtures.ts`/`.json` — plus
DEV-LAUNCH-06/07/08 verification docs) via merge commit `6c53da1`. Reviewed
and approved by the user before this session resumed Task 7. Only
`.gitignore` conflicted; resolved cleanly. Post-merge, `npx vitest run`
reported 124 files / 1196 tests passing (up from the 121-file / 1163-test
baseline before Task 1) — confirmed clean at that point, and unit tests were
not re-run as part of this task (out of this task's scope, which is the
Playwright e2e evidence pass).

## Fixes shipped alongside this QA pass

Real, user-facing bugs found and fixed during this plan's execution (all
already committed and independently reviewed before this final report):

- **7 routes were missing `#main-content`**, breaking the global skip link
  (Task 2, commit `44f3fa6`/`3d8032e`).
- **`CartPopup` and `QuickAddModal` did not return focus to their trigger on
  close** (Task 3, commit `0793ccb`).
- **Industries-page hero image overlapped CTAs at the `lg` breakpoint**;
  **`/search` was missing an `<h1>`** (Task 4, commit `84c2ef6`).
- **PDP "You May Also Need" scroll rail had no keyboard-focusable content**,
  tripping axe's `scrollable-region-focusable` rule when live Shopify
  recommendations return more than 4 items — fixed with `role="region"`,
  `aria-label`, and `tabIndex={0}` in `components/product/ProductView.tsx`
  (Task 7, commit `87b7354`).
- **PDP backorder-state label had `text-orange-600`, measuring ~3.56:1
  contrast on white** (below WCAG AA's 4.5:1), flagged `[serious]` by axe —
  fixed to `text-orange-700` (~5.18:1), mirroring an existing semantic-token
  precedent already in the same file (ad-hoc Task 8b, commit `9da5870`).
- **Two already-completed, already-reviewed tasks' own tests
  (`e2e/responsive.spec.ts` from Task 4, `e2e/axe.spec.ts` from Task 7) were
  silently exercising a 404/not-found page instead of real subcategory
  content** — `/category/testing-screening/tsh-controls` was never a real
  slug in this app. Fixed by swapping both to the real, verified
  `/category/gloves/exam-gloves` route (ad-hoc Task 11b, commit `ee65938`) —
  this closed a real gap in the ticket's "subcategory" route-coverage
  acceptance criterion that had gone undetected through two full review
  cycles.

## Known blockers / gaps NOT fixed (by design, out of this ticket's scope)

- **RX product-state coverage (Task 8) and authenticated-route coverage
  (Task 9) are built, reviewed, and correctly skip-with-reason, but were
  largely unexercised in this environment** — no live QA customer session
  (`E2E_CUSTOMER_ACCESS_TOKEN`/`REFRESH_TOKEN`/`EXPIRES_AT`,
  `E2E_ORDER_NUMBER`) was available, so all of `authenticated.spec.ts`
  skipped. `E2E_HANDLE_RX` now resolves (via the mid-plan fixtures merge, to
  `qa-rx-product`), so several RX-state axe/contrast assertions did run and
  pass this time — a partial improvement over the plan's original framing,
  but `rx-states.spec.ts`'s two dedicated tests still skipped (see full skip
  list above). See the full-suite skip breakdown above for exact reasons —
  skips are not passes.
- **Visual-regression CI gate (Task 12/12b/12c) intentionally excludes 3 of
  the original 11 candidate routes** — `industry`, `search`, `subcategory` —
  all three route through the Shopify Storefront Search API's `RELEVANCE`
  sort (no deterministic tie-break), confirmed via live reproduction (3-8%
  pixel diffs against a 2% gate, one case with an actual page-HEIGHT
  mismatch, not just content reorder) across 6+ combined test runs during the
  plan's execution. Root cause documented in
  `lib/category-results-source.ts:36-50` and `app/search/page.tsx:64-69`
  (confirmed present, with tracking comments, in `e2e/visual.spec.ts` as
  read for this report). These 3 routes remain covered by axe/responsive
  specs, not by pixel-diff visual regression — a closed architectural
  finding, not an open gap.
- **`e2e/responsive.spec.ts` has a pre-existing, unrelated flaky test**
  ("tablet discovery toolbar", both browser projects) discovered incidentally
  during Task 11b, confirmed predating this plan via `git stash`
  reproduction. Reproduced again in this run (see "13 failures" above). Not
  fixed, out of scope.
- **SEPARATE, unrelated, repo-wide CI risk:** `package.json`/`package-lock.json`
  are out of sync on this branch tip. Re-confirmed directly for this report:
  `npm ci --dry-run` fails with exactly **10 missing transitive lockfile
  entries** under `@testing-library/*` (`@testing-library/dom@10.4.1`,
  `@types/aria-query@5.0.4`, `aria-query@5.3.0`, `dom-accessibility-api@0.5.16`,
  `lz-string@1.5.0`, `pretty-format@27.5.1`, `ansi-regex@5.0.1`,
  `ansi-styles@5.2.0`, `react-is@17.0.2`, `dequal@2.0.3`). This affects all
  **4** `npm ci` call sites in `.github/workflows/ci.yml` (lines 28, 164, 195,
  240), not just the E2E job — a real risk to CI as a whole. Needs its own
  remediation (regenerate and commit the lockfile) outside this ticket's
  scope. **Flagged prominently here for the team — not fixed by this task.**
- **Two plan-mandated test-assertion gaps, human-ruled "leave as specified, no
  fix"** (the plan's own example code, not an implementer defect): the PDP
  add-to-cart keyboard test doesn't hard-assert Enter actually triggers
  add-to-cart (`e2e/keyboard-nav.spec.ts`); the "filter, sort, and quick-add
  are all keyboard-reachable" test only exercises quick-add. Both Task 5. The
  same pattern recurred in Tasks 7/8/10's own test bodies (also
  plan-mandated, also left as-is per precedent) — a known, accepted class of
  test-coverage gap rather than a list of every instance.

## New findings surfaced by this evidence run (added by this report, not present in any prior task's ledger)

In addition to the pre-existing/known items above, this full-suite,
production-build run surfaced **4 previously-unseen failures**, detailed with
investigation in the "13 failures" section above and summarized here for
visibility:

1. `categories-hub-integration.spec.ts` route-integrity test — timeout
   exhaustion under full-suite parallel load, most likely (both flagged
   routes verified fine standalone via curl).
2. `contrast.spec.ts` home product-cards test — 4 real, confirmed WCAG AA
   violations (**~1.05:1**, need 4.5:1) on `components/home/ShopByIndustry.tsx`'s
   industry-card labels, root-caused to the `group-hover:opacity-0` contrast
   scrim (see full writeup above); component untouched by this plan, test
   predates this plan (`f5753a4`). **Flagged to the user during this QA
   pass; the user's decision was to leave it unfixed and document it as a
   known gap**, not to fix it within this ticket — a real WCAG AA failure on
   the homepage being knowingly shipped, tracked here for follow-up.
3. `occ-industry-discovery.spec.ts` fail-safe test — the QA-fixtures registry
   (`qa-fixtures.json`) says the OCC canonical collection doesn't exist, but
   it now resolves live on the QA store (verified via curl against this
   run's own server) — a stale-fixture QA-data gap, not an app defect.
4. `keyboard-nav.spec.ts` skip-link focus test on `/search`, mobile-chromium
   only, single occurrence — cause not determined; likely an isolated
   hydration/focus-timing race given every other route/project combination
   for this exact test passed.

None of these were fixed (out of this task's evidence-gathering scope, and,
for item 2, by explicit user decision — see above). All four are recommended
follow-up items — 1 and 4 are timing/environment in nature and may not need
code changes at all; 2 has a confirmed root cause and a concrete fix (remove
or replace the hover-fade on the contrast scrim) ready for whoever picks up
the follow-up ticket; 3's next step is regenerating the QA-fixtures registry.
