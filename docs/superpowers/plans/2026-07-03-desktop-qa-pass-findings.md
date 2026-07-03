# Desktop/Laptop QA Pass — Final Findings (2026-07-03)

Ticket: P2 QA/CRO pass across desktop/laptop widths (1280/1366/1440/1536/1920)
and browser zoom (80/100/125/150%), verifying mobile still works. Sign-off
with Temur before the client link goes out.

Continuation of [2026-07-02-desktop-qa-pass-handoff.md](2026-07-02-desktop-qa-pass-handoff.md).
Scope: representative sweep (5 widths × 100% zoom across 7 core pages, zoom
spot-checks at 1280/1920 × 80/125/150%, mobile spot-check at 390px, plus
targeted interaction checks: cart drawer, sort dropdown, header search,
categories mega-dropdown, pagination).

**Status: QA pass complete on local dev. Still blocked on running the same
pass against the Vercel preview (needs P0-1 deployed first) before final
sign-off — see "Outstanding" below.**

## Unrelated blocker fixed (not part of this ticket's scope)

`lib/category-images.ts` had `CATEGORY_IMAGE_CONFIG` declared twice — a
silent merge collision between this branch's own earlier commit and Temur's
"feat: setup the flow" commit, both adding a config with the same name to
the same file. It didn't surface as a git conflict (different line ranges)
but broke the build (`the name 'CATEGORY_IMAGE_CONFIG' is defined multiple
times`), 500ing every single page including the home page. Confirmed with
the user which version to keep: the generated one (derived from
`ROADMAP_CATEGORIES`, can't drift out of sync) over the hand-written one.
Removed the duplicate hand-written block. `npx tsc --noEmit` is clean after
the change.

## Fixes carried over from yesterday's session (re-applied)

Note: the working tree from 2026-07-02 did not persist between sessions (an
environment-level fact discovered this session, not a code issue) — these
two fixes had to be manually reapplied from the handoff doc's description.
Verified functionally identical to what was validated yesterday.

1. **`components/category/CategoryResults.tsx`** (desktop filter `<aside>`)
   and **`app/search/page.tsx`** (search results `<aside>`) — both had
   `sticky top-[140px]` with no height cap, so categories with many
   default-open filter groups (e.g. Gloves) stretched the sidebar past the
   product grid's height, leaving a large dead white gap before "Related
   Categories"/footer. Fixed by adding
   `max-h-[calc(100vh-160px)] overflow-y-auto` so the sidebar scrolls
   independently. Re-confirmed clean at all 5 widths this session (1366,
   1440, 1536 newly reviewed; 1280/1920 re-confirmed).

## This session's review (new since the handoff)

- **Mobile (390px), all 7 pages**: clean. Home, categories, category/gloves,
  PDP, OCC, partners, search all render correctly; no layout breaks.
- **1366/1440/1536 widths**: reviewed and clean (home, category/gloves,
  search closely; PDP/OCC/partners/categories spot-checked at 1440).
  Sidebar fix holds at all three.
- **Zoom spot-checks, all previously-unreviewed combos** (partners, search,
  PDP, categories × 1280/1920 × 80/125/150%): all clean. Breakpoints reflow
  correctly with the corrected effective-viewport emulation method from
  yesterday.
- **Interactions, retested with corrected methodology**:
  - Cart drawer: opens correctly (confirmed empty-state UI, backdrop, close
    button). The first attempt this session showed no drawer in the
    screenshot — root cause was the QA script clicking before
    `waitForLoadState('networkidle')`, i.e. before React hydration
    attached the click handler. Fixed the script (see below); not an app
    bug.
  - Sort dropdown (category page): opens correctly, all 4 sort options
    visible.
  - Header search icon: opens the search overlay correctly.
  - Categories mega-dropdown: opens correctly — but it's a **hover** menu
    (`onMouseEnter`/`onMouseLeave` in `Header.tsx`), not a click target;
    the first automated attempt used `.click()` and saw nothing happen.
    Retested with `.hover()` — two-column category list renders correctly.
  - Pagination (category/gloves, page 2): navigates correctly, `scroll:
    false` correctly prevents the page from jumping to top on page change
    (matches the intentional fix in `665e510`/`80ce67b`). First automated
    attempt appeared to fail silently; retested with an explicit
    `waitForURL` and it navigated fine — was a test-script wait-condition
    issue, not an app bug.

  All four "failures" above were QA-script artifacts (timing/selector/
  interaction-method mismatches), not real bugs — consistent with the
  "Confirmed NOT bugs" pattern already documented in the 07-02 handoff.
  Fixed `qa-sweep.js`'s `interactions` mode to wait for `networkidle`
  before clicking the cart button.

## Still-open item carried over (unchanged, needs asset fix)

**`/partners`: 4 brand logos are invisible (white-on-white SVGs)** — Aspen
Surgical, Bionix, Lumex, TIDI Products. Re-confirmed present at mobile width
too (390px), which reinforces that this is a source-asset problem, not a
viewport-specific rendering bug. Still needs the source SVGs re-exported by
whoever manages the brand asset library (see 07-02 handoff for full
detail). **Flag to Temur/client before sign-off** — this reads as a
"broken image" against the ticket's acceptance criteria.

## Confirmed NOT bugs (from 07-02, still holds — not re-litigated)

- Playwright full-page screenshot stitching artifacts (blank sections,
  duplicated sticky header) — methodology, not app bugs.
- CSS `zoom` vs. real browser zoom viewport math — methodology, fixed in
  the QA script.
- OCC hero intentional edge-bleed at 1280–1440px.
- Stale hardcoded PDP handle in `e2e/routes.spec.ts` / `e2e/visual.spec.ts`
  — still worth a heads-up to whoever owns e2e (separate from this ticket).

## Category hero images (`lib/category-images.ts` / `/categories` grid)

The `/categories` page's "Browse All Categories" grid currently shows gray
placeholder tiles with a single letter instead of photos. This is expected
— per the 07-02 handoff, this is WIP infra not wired up to any consuming
component yet. Not a regression from this session's merge-collision fix
(the fix only removed a duplicate declaration; it did not change whether
the config is consumed anywhere).

## Outstanding before Temur sign-off

1. Re-run this pass (or at minimum the width sweep + interaction checks)
   against the **Vercel preview**, once **P0-1** is deployed — per the
   ticket's dependency note. Everything above was verified against local
   dev only.
2. Get the 4 white-on-white brand logo SVGs fixed at the asset-library
   level (not code) before the client link goes out.
3. Decide whether the `lib/category-images.ts` merge-collision fix (this
   session, keeping the generated block) needs a second look from Temur,
   since it touches his in-progress commit — flagged here for visibility,
   not blocking.

## Screenshots

Regenerated this session in `shots/` (repo-root-relative, gitignored,
ephemeral — regenerate with `qa-sweep.js`, see the 07-02 handoff for full
usage). Not attached to this doc; review directly from `shots/` before
sign-off if a persistent copy is needed.
