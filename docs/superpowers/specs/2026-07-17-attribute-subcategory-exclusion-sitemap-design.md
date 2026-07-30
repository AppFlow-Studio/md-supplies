# Attribute-Subcategory Exclusion + Sitemap Rebuild on the Tag Registry

## Problem

The Category Tree ticket's Phase 1 + Phase 2 work (`lib/category-tree.ts`, the
All-Categories grid, L2 subcategory pages, boundary redirects, tag-derived
breadcrumbs) is complete and verified. Two pieces of the ticket's own task list
remain open, and they're coupled:

1. **`buildL2Tree()` doesn't distinguish attribute-patterned `subcategory:` values
   from real taxonomy subcategories.** The ticket requires "~114 attribute
   collections + 80 attribute-patterned `subcategory:` values render as facets on
   the parent, never their own tile/route" — but nothing in the codebase
   classifies which live `subcategory:` tags are attribute-patterned.
   `lib/filter-registry.ts` drives facets entirely from metafields/variant
   options (glove size, needle gauge, etc.), never from `subcategory:` tags. As a
   result, `buildL2Tree()` currently builds a real `L2Node` — and Phase 2's route
   renders a real page — for every live `subcategory:` value, attribute-patterned
   or not.

2. **`lib/seo/sitemap.ts` never adopted the tag registry.** `fetchCategoryUrls()`
   still sources L1 URLs from `getAllowedHandles()`
   (`lib/category-nav.ts`'s `ROADMAP_CATEGORIES.matchedHandles`, flattened),
   which includes sub-collection handles like the 4 trocar-size collections and
   Apparel's 7 sub-collections — the same "leaked sub-collection tile" bug Phase 1
   fixed for the `/categories` grid, still live in the sitemap. Separately, there
   are currently **zero** L2 subcategory URLs in the sitemap — Phase 2's pages
   aren't indexed anywhere.

Fixing (2) by naively enumerating every `L2Node` from `buildL2Tree()` would
index the ~80 attribute-patterned subcategory pages that (1) says shouldn't be
routes at all — so (1) must land first, and both are scoped together here.

## Current state of the `subcategory:` tags (verified against a live pull, 2026-07-16, 7,386 active products, 794 distinct values)

A live dump of every `subcategory:` value + product count shows attribute-patterned
tags are consistently a numeric size/gauge/volume modifier stuck onto a base
concept:

| Family | Examples | Pattern |
|---|---|---|
| Needle/lancet gauge | `25g-hypodermic-needles`, `23g-dental-needles`, `21g-lancets`, `28g-lancets`, `20g-iv-catheters` | `^\d+g-` |
| Suture gauge | `4-0-sutures`, `5-0-sutures`, `3-0-sutures`, `0-sutures` | `^\d+-0-sutures$` / `^0-sutures$` |
| Syringe volume | `3cc-syringe`, `10cc-syringe`, `1cc-syringe`, `5cc-syringe`, `6cc-syringe` | `^\d+cc-` |
| Wheelchair width | `manual-wheelchairs-20`, `manual-wheelchairs-18`, `manual-wheelchairs-16`, `manual-wheelchairs-22`, `manual-wheelchairs-24` | `manual-wheelchairs-\d+$` |
| Sharps container volume | `2-gal-sharps` | `^\d+-gal-` |

This matches the ticket's own worked example ("25G Hypodermic Needles, not a
clean `gauge=25` field") and its note that a clean single-dimension facet
abstraction "needs a mapping pass — not launch-blocking; build now only if
cheap, else flag." Building the mapping pass (a unified "Gauge" facet UI, etc.)
stays out of scope; only *excluding these tags from becoming L2 routes* is in
scope here, per the acceptance criterion "no trocar-size/attribute tiles at top
level" extended to its L2 equivalent.

Ambiguous cases (e.g. `12-panel` — a drug-test panel count, arguably a real
product type rather than a facet value) are deliberately **not** pattern-matched
away — false negatives (an attribute tag that still gets a route) are an
acceptable, correctable-later gap; false positives (a real subcategory silently
losing its page) are not.

**Known limitation:** the table above was derived from the top ~250 of 794
distinct `subcategory:` values (sorted by product count) — the long tail
(lower-frequency values) wasn't reviewed. The implementation step must re-run
the live dump against the *full* 794-value list and confirm no additional
pattern family is needed and no existing pattern produces an unintended match,
before the pattern list is considered final — same "confirmed against live
data on \<date\>" bar the rest of the registry's hardcoded tables already meet.

## Approach

Add a small, explicit, documented regex denylist —
`ATTRIBUTE_SUBCATEGORY_PATTERNS` — to `lib/category-tree.ts`, in the same style
as the existing `BOUNDARY_L1_OVERRIDES`/`PRODUCT_CATEGORY_OVERRIDES` tables
(hardcoded, dated, confirmed-against-live-data, not a general classifier).
`buildL2Tree()` filters subcategory tags against it before building nodes, so
matching tags never become routable, indexable, or nav-tabbable.

Then repoint `lib/seo/sitemap.ts` at the registry: swap the L1 URL source from
`getAllowedHandles()` to `CATEGORY_TREE_L1`, and add a new L2 URL source built
from the now-correctly-filtered `buildL2Tree()` output.

## Design

### 1. `lib/category-tree.ts` — attribute-subcategory pattern denylist

```ts
// Attribute-patterned subcategory: values — a numeric size/gauge/volume
// modifier on a base concept (e.g. "25G Hypodermic Needles"). Per the ticket,
// these render as facets on their parent L1 page, never their own tile/route.
// Confirmed against a live tag pull (2026-07-16, 794 distinct subcategory:
// values) — see docs/superpowers/specs/2026-07-17-attribute-subcategory-
// exclusion-sitemap-design.md for the full worked list. Deliberately narrow:
// false negatives (an attribute tag that still gets a route) are acceptable
// and correctable later; false positives (a real subcategory silently losing
// its page) are not, so ambiguous tags (e.g. "12-panel") are left unmatched.
export const ATTRIBUTE_SUBCATEGORY_PATTERNS: readonly RegExp[] = [
  /^\d+g-/,                      // gauge prefix: 25g-hypodermic-needles, 21g-lancets, 20g-iv-catheters
  /^\d+-0-sutures$/,             // suture gauge: 4-0-sutures, 3-0-sutures
  /^0-sutures$/,                 // suture gauge: 0-sutures
  /^\d+cc-/,                     // syringe volume: 3cc-syringe, 10cc-syringe
  /^manual-wheelchairs-\d+$/,    // wheelchair width: manual-wheelchairs-20
  /^\d+-gal-/,                   // sharps volume: 2-gal-sharps
]

export function isAttributeSubcategoryTag(tag: string): boolean {
  return ATTRIBUTE_SUBCATEGORY_PATTERNS.some((p) => p.test(tag))
}
```

In `buildL2Tree()`, skip attribute-patterned tags before they enter
`subParentCounts` (so they never produce a node), but let them continue
contributing to `subProductCounts` only if some other, non-attribute code path
needs the raw count later — actually not needed: since attribute tags never
get a node, `subProductCounts` for them is dead weight. Simplest correct
change: `continue` immediately when `isAttributeSubcategoryTag(sub)` is true,
before either map is touched.

```ts
for (const summary of summaries) {
  const category = resolveCanonicalCategory(summary)
  for (const sub of summary.subcategories) {
    if (isAttributeSubcategoryTag(sub)) continue
    subProductCounts.set(sub, (subProductCounts.get(sub) ?? 0) + 1)
    // ...unchanged
  }
}
```

Effect: attribute-patterned tags disappear from `buildL2Tree()`'s output
entirely — no L2 route (`app/category/[slug]/[product]/page.tsx`'s subcategory
branch falls through to the product-fallback branch, which 404s for a tag
that isn't a real product handle either, same as today for any nonexistent
sub-path), no subcategory tab on the L1 page, and — new in this design — no
sitemap URL. Their product counts still roll up into the parent L1 tile count
via `resolveCanonicalCategory`, unaffected.

### 2. `lib/seo/sitemap.ts` — source L1/L2 URLs from the registry

Replace the `getAllowedHandles()` import and its use in `fetchCategoryUrls()`:

```ts
import { CATEGORY_TREE_L1, fetchProductTagSummaries, buildL2Tree } from '@/lib/category-tree'
```

```ts
async function fetchCategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{
      collections: { nodes: { handle: string; updatedAt: string }[] }
    }>(GET_COLLECTIONS_FOR_SITEMAP, { first: 250 })
    const allowedHandles = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))
    return data.collections.nodes
      .filter((c) => allowedHandles.has(c.handle))
      .map((c) => ({
        url: `${SITE_URL}/category/${c.handle}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        lastModified: new Date(c.updatedAt),
      }))
  } catch {
    return []
  }
}
```

Add a new function for L2 URLs:

```ts
async function fetchSubcategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const summaries = await fetchProductTagSummaries()
    const l2Nodes = buildL2Tree(summaries)
    return l2Nodes
      .map((node) => {
        const l1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)
        if (!l1) return null
        return {
          url: `${SITE_URL}/category/${l1.collectionHandle}/${node.tag}`,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }
      })
      .filter((e): e is SitemapEntry => e !== null)
  } catch {
    return []
  }
}
```

`node.parentTag` is always the canonical parent (never `crossLinkParentTag` —
that field isn't read here), so boundary subcategories emit exactly one URL,
matching the acceptance criterion "each boundary subcategory = exactly one
URL." No `lastModified` on L2 entries — there's no backing Shopify collection
to source a date from, and other non-collection sitemap entries in this file
(partners, industries) already omit it.

This function's `l1` lookup is by `tag`, not `collectionHandle`, so no import
of `getL1ByCollectionHandle` is needed here.

`fetchProductTagSummaries()` is the same call already used by
`app/categories/page.tsx`, the L1 page's subcategory tabs, and the L2 route —
cached 1 hour under the Next `category-tree` fetch tag, so this doesn't add a
new live Shopify round-trip beyond what already happens on every category page
render.

Wire it into `getSitemapUrls()`:

```ts
const [categoryUrls, subcategoryUrls, productUrls, articleUrls] = await Promise.all([
  fetchCategoryUrls(),
  fetchSubcategoryUrls(),
  fetchProductUrls(),
  fetchArticleUrls(),
])

return [
  ...STATIC_URLS,
  ...categoryUrls,
  ...subcategoryUrls,
  ...productUrls,
  ...partnerUrls,
  ...industryUrls,
  ...articleUrls,
]
```

`getL1ByCollectionHandle` import from step 1's list ends up unused by this
final shape (the L1 lookup in `fetchSubcategoryUrls` finds by `tag`, not
`collectionHandle`) — drop it from the import list.

## Out of scope

- No change to `lib/category-nav.ts` or the rendered nav UI (separate
  sub-project, next).
- No facet UI/allowlist work for the attribute-patterned tags beyond excluding
  them from L2 routes — they don't get surfaced as filterable facets by this
  change, they just stop being (incorrectly) routable. Building them out as
  real facets is separate, later Facets-phase scope.
- No unified "Gauge"/"Volume" facet abstraction — explicitly deferred per the
  ticket's own implementation note.
- No change to `GET_COLLECTIONS_FOR_SITEMAP` — still used as-is for L1
  `lastModified`.
- No retroactive cleanup of any subcategory page already indexed under an
  attribute-patterned tag — Google will naturally drop them on next crawl once
  they 404; no explicit redirect/removal step planned.

## Testing

- `lib/__tests__/category-tree.test.ts`:
  - `isAttributeSubcategoryTag` — one case per pattern family (gauge, suture
    gauge incl. bare `0-sutures`, cc volume, wheelchair width, gal volume),
    plus a case proving a real subcategory containing a digit but not matching
    any pattern (e.g. `12-panel`) is *not* excluded.
  - `buildL2Tree` — new case: a summary set containing only an
    attribute-patterned subcategory tag produces zero nodes; a mixed set (one
    attribute tag + one real tag co-occurring on the same category) produces a
    node only for the real tag.
- `lib/seo/__tests__/sitemap.test.ts`:
  - Update the mock setup to also stub the storefront call
    `fetchProductTagSummaries()` sits on top of (`GetAllProductTags`), matching
    the mocking pattern already used in `lib/__tests__/category-tree.test.ts`.
  - L1: sitemap no longer emits URLs for sub-collection handles (e.g. a mocked
    trocar-size handle present in the collections list but absent from
    `CATEGORY_TREE_L1` produces no `/category/<handle>` entry).
  - L2: a real subcategory tag produces a `/category/<l1>/<sub>` entry.
  - Boundary: `exam-tables` produces exactly `/category/seating/exam-tables`
    and never `/category/exam-room/exam-tables`.
  - Attribute: a mocked `25g-hypodermic-needles`-style tag produces no
    sitemap entry.
  - Degrades gracefully: `fetchProductTagSummaries()` throwing still returns
    the rest of the sitemap (existing "degrades gracefully" test pattern,
    extended to cover this new failure path).
