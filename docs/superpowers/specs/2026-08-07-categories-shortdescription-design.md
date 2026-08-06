# DEV-LAUNCH-03: Categories hub short descriptions

**Date:** 2026-08-07
**Ticket:** DEV-LAUNCH-03 (Final Launch Configuration & Implementation Plan) — P0 launch gate

## Problem

`app/categories/page.tsx` renders a category card description only when the
live Shopify collection `description` is nonempty (`col?.description && ...`).
Several of the 25 launch categories have blank Shopify descriptions, so their
cards render with no description text, which looks unfinished.

## Decision

Add a required `shortDescription: string` field to `L1CategoryDef` in
`lib/category-tree.ts`, populated with the 25 approved verbatim descriptions
from the ticket's Appendix A, keyed by the registry's canonical `tag` (not by
Shopify `collectionHandle`).

- **Testing category resolution:** registry `tag` is `testing`;
  `collectionHandle` (routing/Shopify lookup) is `testing-screening`. The new
  field is keyed by `tag`, so `testing` gets the "Testing" hub card copy.
- `buildL1Tiles()` already spreads `L1CategoryDef` into `L1Tile`, so
  `tile.shortDescription` is available with no further plumbing.
- `app/categories/page.tsx`'s "Browse All Categories" grid switches from
  `col?.description &&` to unconditionally rendering `tile.shortDescription`.
  The Shopify collection lookup (`col`) is no longer used for hub card
  descriptions; it may still be used elsewhere in the file (e.g. the Popular
  Categories strip's title).
- No new component or separate description file: the registry remains the
  single canonical source, consistent with the ticket's "resolve centrally"
  requirement.

## Alternatives rejected

- A separate `lib/category-descriptions.ts` map keyed by slug: adds
  indirection with no benefit, since the ticket explicitly permits extending
  the registry directly.
- A JSON/CMS-style content file: no localization or non-developer editing
  requirement exists today; unnecessary complexity.

## Testing

Extend `lib/__tests__/category-tree.test.ts` with an assertion that every
entry in `CATEGORY_TREE_L1` has a nonempty `shortDescription`, matching this
repo's existing convention of unit-testing registry data as plain functions
rather than rendering the async Server Component page. This test fails if a
category is ever added to the registry without launch copy.

## Out of scope

- Card visual/height treatment beyond what's needed to keep descriptions
  readable without hiding titles (existing `line-clamp-2` styling stays;
  adjust only if visual QA at 390/768/1024/1440 widths shows a problem).
- DEV-LAUNCH-04 (category images) and DEV-LAUNCH-05 (hub presentation) —
  same card markup, sequenced separately per ticket dependencies.
