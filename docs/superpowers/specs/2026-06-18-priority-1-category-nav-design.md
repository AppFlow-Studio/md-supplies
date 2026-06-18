# Priority #1 — Roadmap-driven Category Navigation

**Source:** Milestone 2+3 Closeout §2–§3.2 · Priority #1
**Date:** 2026-06-18

## Problem

Nav, footer, the categories hub, and the sitemap each pull raw Shopify
collection data independently, with inconsistent (or missing) exclusion
rules and no mapping to the June 15 Roadmap's approved category taxonomy
(§3.1). Removed categories (Pharmaceuticals, Beds, Bariatric Beds,
Maternity, Office Supplies) and a malformed duplicate Shopify collection
can leak into nav/footer/sitemap/related-categories. Roadmap category
names ("Needles & Syringes", "Surgery & Procedure", "Apparel", ...) don't
match raw Shopify collection titles/handles.

## Decisions made during brainstorming

- **Data source:** keep Shopify collections as the API source; add a
  static fallback mapping file (no Shopify Admin/metafield changes). This
  is explicitly sanctioned by §1.4/§2.1 as the interim approach while
  metafields are finalized. No collaborator-access risk, ships now.
- **Unmapped roadmap categories** (no matching Shopify collection at all):
  omit from rendered nav/footer/sitemap; report them in the audit output
  for the catalog team.
- **Partially-mapped roadmap categories** (no single matching collection,
  but several existing populated sub-collections): synthesize a parent
  entry whose link points at the first matching sub-collection. No new
  "virtual collection" page type.

## Live catalog mapping (§3.1 roadmap name → Shopify reality)

13 Primary + 12 More = 25 approved categories. Checked against the live
Shopify catalog (250 collections, via `scripts/audit-collections.ts`):

| Roadmap category | Group | Status | Matched handle(s) |
|---|---|---|---|
| Gloves | primary | mapped | `gloves` |
| Wound Care | primary | mapped | `wound-care` |
| Needles & Syringes | primary | **unmapped** | — |
| Surgical Sutures | primary | **unmapped** | — |
| Testing | primary | mapped (renamed) | `testing-screening` |
| Exam Room | primary | mapped | `exam-room` |
| Respiratory | primary | **unmapped** | — |
| Mobility | primary | mapped | `mobility` |
| Patient Therapy & Rehab | primary | mapped | `patient-therapy-rehab` |
| Surgery & Procedure | primary | synthesized | `trocars-trocar-kits`, `disposable-3-2mm-3-5mm-trocars`, `disposable-4-5mm-trocars`, `reusable-3-2mm-3-5mm-trocars`, `reusable-4-5mm-trocars` |
| Apparel | primary | synthesized | `capes-gowns`, `caps-headwear`, `coats-jackets`, `footwear`, `medical-scrubs`, `pants-shirts`, `undergarments-wraps` |
| Hygiene | primary | mapped | `hygiene` |
| Disinfectants | primary | **unmapped** | — |
| Home Care | more | mapped | `home-care` |
| Emergency Supplies | more | mapped | `emergency-supplies` |
| Incontinence | more | mapped | `incontinence` |
| IV Therapy | more | **unmapped** | — |
| Urology & Ostomy | more | **unmapped** | — |
| Sterilization | more | **unmapped** | — |
| Dental | more | mapped | `dental` |
| Housekeeping & Janitorial | more | mapped | `housekeeping-janitorial` |
| Bariatric | more | mapped | `bariatric` |
| Room Furniture | more | synthesized | `seating`, `exam-tables` |
| Face Masks | more | mapped (renamed) | `face-coverings` |
| Pharmacy Products | more | **unmapped** | — |

17 mapped/synthesized, 8 unmapped (logged, omitted from rendered nav).

## Components

### `lib/category-nav.ts` (new)

```ts
export type RoadmapCategory = {
  displayName: string
  navGroup: 'primary' | 'more'
  matchedHandles: string[]   // [] = unmapped
}

export const ROADMAP_CATEGORIES: RoadmapCategory[]  // the table above

export type NavEntry = { displayName: string; href: string }

export function buildCategoryNav(
  collections: { handle: string }[],
): { primary: NavEntry[]; more: NavEntry[] }
// Filters ROADMAP_CATEGORIES to those with >=1 matchedHandle present in
// `collections`; href = /category/{first present matched handle}.

export function getUnmappedRoadmapCategories(
  collections: { handle: string }[],
): RoadmapCategory[]
// Returns roadmap categories with zero matched handles present live —
// used by the audit script.
```

### `lib/excluded-categories.ts` (extend)

Add to the existing `EXCLUDED_COLLECTION_HANDLES` set (keep the same
export name — already imported by `app/categories/page.tsx`):

- `office-supplies` (hidden at launch unless approved; no live collection
  today, added as a guard for when one is created)
- `categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays`
  (malformed duplicate collection titled "Categories" — junk, not part of
  the roadmap taxonomy; its real children, the trocar collections, are
  used directly by the Surgery & Procedure synthesis above)

Comment groups: §2.4 removed / hidden-at-launch / junk-duplicate.

### `app/layout.tsx`

Pass the already-fetched `collections` array to `Header` as a new prop
(alongside the existing `Footer` usage).

### `components/layout/Header.tsx`

Accept `collections: SlimCollection[]` prop. Replace the "Categories"
mega-dropdown's raw `categoriesItem.items.map(...)` grid with two grouped
sections from `buildCategoryNav(collections)`: "Categories" (primary) and
"More Categories", keeping the existing "Browse all categories →" link.
Mirror the same replacement in the mobile drawer's Categories section.
Other top-level nav items (Partners, Industries, Blog, OCC, ...) are
unaffected — they continue to come from the Shopify `main-menu`.

### `components/layout/Footer.tsx`

Replace `collections.slice(0, 8)` / `slice(8, 16)` with
`buildCategoryNav(collections).primary` / `.more` under the existing
"Top Categories" / "More Categories" column headers.

### `lib/seo/sitemap.ts`

Replace the local `isExcludedCollectionHandle` (brands-only check) with
the shared `EXCLUDED_COLLECTION_HANDLES` set from
`lib/excluded-categories.ts`.

### `lib/category-utils.ts`

`getRelatedCategories` gains the same `EXCLUDED_COLLECTION_HANDLES`
filter so the "Related Categories" block on category pages can't surface
a removed/hidden collection.

### `app/categories/page.tsx`

No structural change — it already filters with
`EXCLUDED_COLLECTION_HANDLES`, which is now broader.

### `scripts/audit-collections.ts` (rewrite)

Fetch all live collections (adds a `products(first: 1) { nodes { id } }`
check per collection for zero-product detection — local to this script
only; no change to the shared `GET_COLLECTIONS`/`GET_COLLECTIONS_SLIM`
queries or types used elsewhere). Produce a report covering:

- Roadmap coverage: mapped / synthesized / unmapped status per the 25
  §3.1 categories (the table above, generated live rather than
  hand-maintained).
- Per-collection flags: zero-product, missing image, missing SEO
  title/description, excluded-by-rule (and which rule), and
  "exists-in-Shopify-but-unmapped" (live, not excluded, not referenced by
  any roadmap `matchedHandles`, and not a recognized subcategory of one —
  i.e. a genuine catalog orphan from the roadmap's perspective).

Write the report to `audit/category-nav-audit-report.md` (the existing
`audit/AUDIT-REPORT.md` is an unrelated accessibility audit and is left
untouched) and keep console output for quick local runs.

## Out of scope

- Shopify metafield definitions / Admin API writes (deferred per the
  architecture decision above).
- A dedicated "virtual collection" landing page for synthesized
  categories (Apparel, Surgery & Procedure, Room Furniture) — their nav
  entries link to the first real sub-collection instead.
- Zero-product filtering inside Header/Footer/hub rendering — the
  mapped/synthesized handles above are all real, populated collections,
  so this is only needed for the audit report.
- Breadcrumb text normalization to roadmap display names on
  `/category/[slug]` pages (still shows the raw Shopify collection
  title) — not covered by the three acceptance criteria below.

## Acceptance criteria

- Navbar (desktop + mobile) and footer render only the mapped/synthesized
  roadmap categories, correctly split into Categories (primary) / More
  Categories groups, using roadmap display names.
- §2.4 removed categories and the junk duplicate collection never appear
  in nav, footer, hub, sitemap, or related-categories.
- `audit/category-nav-audit-report.md` lists: roadmap coverage
  (mapped/synthesized/unmapped), and per-collection zero-product /
  missing-image / missing-SEO / excluded / unmapped-orphan flags.
