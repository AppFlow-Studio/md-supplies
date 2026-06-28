# Category Policy Unification

**Date:** 2026-06-25
**Ticket:** P0 · Owner: Izzy · Dependency: import
**DoD:** hub + sitemap + nav all driven by the same roadmap allowlist; §5.5 mismatch report delivered.

## Problem

Priority #1 wired the header, mobile menu, and footer to `buildCategoryNav` (allowlist). Two surfaces were left on the old denylist path:

- `app/categories/page.tsx` (hub) — filters with `EXCLUDED_COLLECTION_HANDLES`, so any non-roadmap Shopify collection leaks through.
- `lib/seo/sitemap.ts` — same denylist pattern, no `lastmod`, no product-count gating.

Additionally, 8 roadmap categories had `matchedHandles: []` because the Shopify collections were not yet confirmed. They now exist.

## Changes

### 1. `lib/category-nav.ts` — fill the 8 empty handles + export `getAllowedHandles`

Fill `matchedHandles` for the 8 previously-empty categories:

| Category | Handle |
|---|---|
| Needles & Syringes | `needles-syringes` |
| Surgical Sutures | `surgical-sutures` |
| Respiratory | `respiratory` |
| Disinfectants | `disinfectants` |
| IV Therapy | `iv-therapy` |
| Urology & Ostomy | `urology-ostomy` |
| Sterilization | `sterilization` |
| Pharmacy Products | `pharmacy-products` |

Add new export:

```ts
export function getAllowedHandles(): Set<string> {
  return new Set(ROADMAP_CATEGORIES.flatMap((c) => c.matchedHandles))
}
```

This is the single policy function consumed by hub, sitemap, and related-categories. `ROADMAP_CATEGORIES` is already consumed by header/footer via `buildCategoryNav` — this completes the unification.

### 2. `app/categories/page.tsx` — allowlist switch

Replace `EXCLUDED_COLLECTION_HANDLES` filter:

```ts
// before
collections = data.collections.nodes.filter(
  (c) => !EXCLUDED_COLLECTION_HANDLES.has(c.handle)
)

// after
import { getAllowedHandles } from '@/lib/category-nav'
const allowed = getAllowedHandles()
collections = data.collections.nodes.filter((c) => allowed.has(c.handle))
```

"Popular Categories" strip becomes the `buildCategoryNav(collections).primary` handles' Shopify data (roadmap-ordered). "Browse All" becomes all allowed+live collections. Shopify titles and images are preserved.

### 3. `lib/shopify/queries/collections.ts` — add `GET_COLLECTIONS_WITH_UPDATED_AT`

New query used only by the sitemap, adds `updatedAt`:

```graphql
query GetCollectionsWithUpdatedAt($first: Int!) {
  collections(first: $first) {
    nodes {
      handle
      updatedAt
    }
  }
}
```

### 4. `lib/seo/sitemap.ts` — allowlist + lastmod

- Replace `isExcludedCollectionHandle` with `getAllowedHandles()` check.
- Switch to `GET_COLLECTIONS_WITH_UPDATED_AT` query.
- Add `lastmod: updatedAt` to each category sitemap entry.
- `brands`/`brands-*` guard remains (forward-looking, not in ROADMAP_CATEGORIES anyway).
- Zero-product, thin, and duplicate-family handles are implicitly excluded because only roadmap-mapped handles pass the allowlist.

### 5. `lib/category-utils.ts` — allowlist for related categories

`getRelatedCategories` adds `getAllowedHandles()` filter after the existing `EXCLUDED_COLLECTION_HANDLES` check, so internal links only surface roadmap-mapped collections:

```ts
const allowed = getAllowedHandles()
return all
  .filter(
    (c) =>
      c.handle !== excludeSlug &&
      !c.handle.startsWith(`${excludeSlug}-`) &&
      !EXCLUDED_COLLECTION_HANDLES.has(c.handle) &&
      allowed.has(c.handle),
  )
  .slice(0, 6)
```

### 6. `scripts/audit-collections.ts` — §5.5 11-section mismatch report

Extend the existing 2-section report to 11 sections. New sections simulate each rendering surface and show what it exposes vs the roadmap allowlist:

| # | Section | Description |
|---|---|---|
| 1 | Roadmap Coverage (§3.1) | existing — mapped/synthesized/unmapped per category |
| 2 | Collection Flags (§4.2) | existing — zero-product, missing-image, SEO, orphan |
| 3 | Nav Primary | handles `buildCategoryNav().primary` would render |
| 4 | Nav More | handles `buildCategoryNav().more` would render |
| 5 | Hub Primary Strip | same set as Nav Primary (roadmap-ordered primary categories) |
| 6 | Hub All Categories | all `getAllowedHandles()` with live Shopify collections |
| 7 | Sitemap Category URLs | same as Hub All (allowed + live) |
| 8 | Related Categories | `getAllowedHandles()` minus `EXCLUDED_COLLECTION_HANDLES` |
| 9 | Orphan Handles | live Shopify collections not in `getAllowedHandles()` and not excluded |
| 10 | Surface Delta | handles present on some surfaces but absent on others |
| 11 | Action Items | unmapped roadmap categories (empty `matchedHandles`) |

Sections 9 and 10 are the "mismatch" delivery — they explicitly call out what a denylist-driven surface would leak that the allowlist blocks.

## Surfaces not needing code changes

- Header, mobile menu, Footer — already use `buildCategoryNav` (allowlist). The §5.5 report documents them as correct.
- Breadcrumbs — path-based, not driven by a collection list; no filter needed.

## Tests to add / update

- `lib/__tests__/category-nav.test.ts` — add test for `getAllowedHandles()` and the 8 newly filled handles.
- `lib/seo/__tests__/sitemap.test.ts` — update the existing `'excludes §2.4 removed...'` test and add test for allowlist-only behavior + lastmod presence.
- `lib/__tests__/category-utils.test.ts` — add test that `getRelatedCategories` does not return non-roadmap handles.

## Acceptance criteria

- Hub renders only roadmap-matched collections; no non-roadmap Shopify collection appears.
- Sitemap category URLs match exactly the set of live roadmap handles; each entry has `lastmod`.
- Related categories block only surfaces roadmap-mapped collections.
- `audit/category-nav-audit-report.md` contains 11 sections; §§ 9–11 show no leaking handles post-fix.
- All roadmap categories now have `matchedHandles` filled in code (the 8 previously empty are filled). Note: the corresponding Shopify collections are pending catalog creation — `buildCategoryNav`'s live-handle gating suppresses them from all surfaces until they exist, so there is no user-facing regression. §11 will clear once the catalog team creates the 8 collections.
