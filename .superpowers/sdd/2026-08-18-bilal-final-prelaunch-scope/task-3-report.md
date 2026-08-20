# Task 3 Report: Trocar Supplies quick-link, dedicated-entry-point verification, and nav placement

## Correction to the brief's premise (found during Step 1)

The brief assumes the primary nav component consumes `buildCategoryNav()` from
`lib/category-nav.ts`. That is no longer true. A repo-wide grep for
`buildCategoryNav(` (`lib/category-nav.ts:76`) shows it is called **only** from
its own test file (`lib/__tests__/category-nav.test.ts`) — no component in
`components/` or `app/` imports it. `ROADMAP_CATEGORIES` and a few other
exports of `lib/category-nav.ts` (`getAllowedHandles`, `getShopifyHandle`,
`ROADMAP_CATEGORIES` for BunnyCDN placeholders) are still used elsewhere, but
the nav-*building* function itself is dead code with respect to the UI.

The actual live nav is built by `buildCategoryTreeNav()` in
`lib/category-tree.ts:264-280`, consumed by `components/layout/Header.tsx:163`
(`const categoryNav = buildCategoryTreeNav(collections)`). This is the newer,
tag-backbone-sourced registry that superseded `category-nav.ts`'s
Shopify-collection-list-based registry — `lib/category-tree.ts:1-4` says so
explicitly ("ONE registry for the category tree — sourced from live
category:/subcategory: product tags, never from the Shopify collection
list"), and its `navGroup` field comment (`lib/category-tree.ts:47-50`)
confirms nav placement was carried over positionally from the legacy
`ROADMAP_CATEGORIES` split during the E1 nav-wiring migration
(`docs/superpowers/specs/2026-07-17-nav-wiring-design.md`).

I treated `Header.tsx` + `buildCategoryTreeNav` as "the primary nav component"
for the rest of this investigation, since that's what actually renders in
production, and answered the brief's questions against it. I did not touch
`lib/category-nav.ts` (it's out of scope either way, per the brief's own
instruction not to modify `buildCategoryNav()`, and it turned out to be moot).

## Step 1 findings: nav rendering order

**Component:** `components/layout/Header.tsx` (desktop mega-dropdown:
lines 291-334; mobile drawer: lines 490-539).

**(a) Does it re-sort alphabetically?** No.

- `Header.tsx:163` — `const categoryNav = buildCategoryTreeNav(collections)`.
- `Header.tsx:297` (desktop) and `Header.tsx:510` (mobile) —
  `categoryNav.primary.map((cat) => ...)` renders the array directly with no
  intervening `.sort()`. Confirmed via grep: zero `.sort(` calls anywhere in
  `Header.tsx`.
- `buildCategoryTreeNav` (`lib/category-tree.ts:264-280`) builds the array with
  `for (const l1 of CATEGORY_TREE_L1) { ... primary.push(entry) ... }` —
  a straight iteration in `CATEGORY_TREE_L1`'s declared order, no sort. The
  one `.sort(` in `category-tree.ts` (line 212) is inside `buildL2Tree`, for
  ranking subcategory-to-parent boundary assignment — unrelated to L1 nav
  order.
- `CATEGORY_TREE_L1`'s declared order (`lib/category-tree.ts:87-111`) is
  itself **not alphabetical**: Gloves, Wound Care, Needles & Syringes,
  Surgical Sutures, Testing, Exam Room, Respiratory, Mobility, Patient
  Therapy & Rehab, **Surgery & Procedure** (10th), Apparel, Hygiene,
  Disinfectants — a deliberately curated order, confirmed by the file's own
  comment as a "positional copy from the legacy ROADMAP_CATEGORIES split."

Since there is no alphabetization step anywhere in the pipeline, the concept
of "exception to alphabetical order" is moot — nothing sorts Trocar out of
position in the first place.

**(b) Is Surgery & Procedure reachable, and does it land on Trocar?** Yes, confirmed live.

- `CATEGORY_TREE_L1` entry (`lib/category-tree.ts:96`):
  `{ tag: 'surgery-procedure', displayName: 'Surgery & Procedure', collectionHandle: 'trocars-trocar-kits', productSet: 'tag', navGroup: 'primary', ... }`
  — a single handle, no fallback list (unlike `category-nav.ts`'s 5-handle
  `matchedHandles` array for the same category).
- `buildCategoryTreeNav` only emits the entry if `liveHandles.has(l1.collectionHandle)` (`lib/category-tree.ts:272`), and the href is
  `ROUTES.category(getCategorySlug(l1))` (line 274) — `getCategorySlug`
  returns the raw handle here since `trocars-trocar-kits` has no
  `CANONICAL_SLUG_BY_HANDLE` override (`lib/category-tree.ts:239-245`), so the
  link is `/category/trocars-trocar-kits`.
- Confirmed live via the repo's own audit data:
  `audit/live/route-table.md:12` — `` `/category/trocars-trocar-kits` | tag:category:surgery-procedure | 319 `` products.
  Task 2's already-merged report (`.superpowers/sdd/.../task-2-report.md`)
  independently confirms the underlying Shopify collection is live too ("68
  products, 41 active").
- So clicking "Surgery & Procedure" in the primary nav — desktop mega-dropdown
  or mobile drawer — is a single click straight to the Trocar Supplies
  category page, no intermediate landing page.

**Where it sits:** 10th of 13 `primary`-group entries. The mega-dropdown panel
(`Header.tsx:285-333`) renders the entire `primary` list at once in a
`grid-cols-2` grid with no internal scroll — every primary category, Surgery &
Procedure included, is visible the instant the dropdown opens. It is not the
first item, but it is in the always-visible `primary` group (as opposed to
the collapsed "More Categories" column), and its resolution target is the
Trocar collection directly rather than a generic landing page.

## Step 2: code change

**No code change — verified no-op.**

Reasoning: the brief's own trigger for a real code change was "nav IS
alphabetically sorted and Trocar/Surgery & Procedure would be buried." That
condition does not hold: there is no alphabetical sort anywhere in
`Header.tsx` or `buildCategoryTreeNav`/`CATEGORY_TREE_L1`, so nothing forces
Trocar out of a prominent position, and no "exception" rule is needed to
counteract a sort that doesn't exist. Surgery & Procedure already resolves
directly to the Trocar collection and already renders in the always-visible
primary group. Writing a pinned-position special case here would be defending
against a bug that isn't present — exactly what the brief said not to do.
Steps 3/4 (failing test + implementation) were skipped per the brief's
explicit instruction to skip them when Step 1 finds no gap.

## Step 3 findings (brief's Step 5): CategoryPageView breadcrumbs/SEO/canonical/schema

All read from `components/category/CategoryPageView.tsx`,
`app/category/[slug]/page.tsx`, `components/category/CatalogHero.tsx`,
`components/layout/Breadcrumb.tsx`, `lib/seo/metadata.ts`, and
`lib/schema/{collection,breadcrumb}.ts`. This is a shared component/pipeline
used by every category page, verified generically, not Trocar-specific.

- **Delegation confirmed:** `app/category/[slug]/page.tsx:30-34`
  (`generateMetadata`) calls `buildCategoryMetadata(slug, sp)`;
  `app/category/[slug]/page.tsx:36-40` (page body) renders
  `<CategoryPageView slug={slug} sp={sp} />`.

- **Collection description:** rendered in `CatalogHero`'s `description` prop
  (`CategoryPageView.tsx:299`), sourced from the registry's
  `shortDescription` (client-approved copy) with a Shopify-description
  fallback, and rendered by `CatalogHero.tsx:106-110`. A second, longer
  "About {displayName}" block with the full Shopify `descriptionHtml` also
  renders further down the page (`CategoryPageView.tsx:457-470`), suppressed
  only for the 4 tag-sourced proxy categories (Surgery & Procedure included)
  where the Shopify collection's own copy would misdescribe the wider tagged
  set — a deliberate, already-documented exclusion, not a gap.

- **Visible breadcrumbs:** `CategoryPageView.tsx:293` passes
  `breadcrumb={[{ label: displayName }]}` into `CatalogHero`, which renders
  `<Breadcrumb items={breadcrumb} />` at `CatalogHero.tsx:74`.
  `components/layout/Breadcrumb.tsx:6-34` renders a `<nav aria-label="Breadcrumb">`
  with "Home › {displayName}", `aria-current="page"` on the current item.

- **SEO metadata via `buildCategoryMetadata`:** `CategoryPageView.tsx:97-209`
  covers all states — fetch-failure fallback (line 124), filtered/noindex
  (152-163), paginated (165-175), unfiltered page 1 with SEO-database
  override (178-195), and unfiltered page 1 default (197-205) — all routed
  through `buildMetadata()` (`lib/seo/metadata.ts:108-143`), which returns
  `title`, `description`, `robots`, `alternates.canonical`, and OpenGraph tags.

- **Canonical URL:** explicit for filtered/paginated states
  (`CategoryPageView.tsx:157`, `170` — `canonical: \`${base}/category/${slug}...\``);
  for unfiltered page 1, `buildMetadata` derives it itself:
  `lib/seo/metadata.ts:124` —
  `const canonical = input.canonical ?? buildCanonical({ path, strategy: 'self' })`,
  returned as `alternates: { canonical }` at line 140.

- **Structured data:** `CategoryPageView.tsx:472-503`, gated on
  `!isFiltered` (i.e. present on the canonical unfiltered page, which is
  exactly the state reached via the nav quick-link):
  - `buildCollectionPageSchema` (`lib/schema/collection.ts:8-19`) —
    `@type: ['CollectionPage', 'ProductCollection']` with name/url/description/image.
  - `buildBreadcrumbListSchema` (`lib/schema/breadcrumb.ts:8-33`) —
    `BreadcrumbList` with Home + the category, using `SITE_URL`-qualified URLs.
  - A third schema block, `buildCollectionItemListSchema`
    (`lib/schema/collection.ts:32-47`), renders in the sibling
    `components/category/CategoryResults.tsx:180-192` (the product-grid
    component `CategoryPageView` composes) — an `ItemList` of the visible
    products (name + url + position), continuing position across pages. Its
    own comment (`lib/schema/collection.ts:26-31`) explains why there's no
    per-item `Product` schema here: "the full Product schema lives on the
    product page itself," which is the correct pattern per Google's
    guidance for summary/listing pages (an `ItemList` of pointers, not
    duplicated `Product` schema, on the category page).

**No gap found.** Every piece Bilal asked about — description, breadcrumbs,
SEO metadata, canonical, and CollectionPage/Product-adjacent structured
data — is already present and wired generically for all category pages,
Trocar Supplies included.

## Files changed

None. This task was pure verification; no commit was made.

## Self-review findings

- Read `Header.tsx` in full (not excerpted) before concluding it doesn't sort.
- Caught and reported the brief's incorrect premise (that `buildCategoryNav`
  from `category-nav.ts` is what's wired into the UI) rather than silently
  substituting the real component without flagging the discrepancy.
- Verified the "live" claim for `trocars-trocar-kits` against the repo's own
  audit artifact (`audit/live/route-table.md`) and the already-merged Task 2
  report, rather than assuming Task 1/2's prior work implied it.
- Did not write a pinned-position test or implementation, since no
  alphabetical-sort gap exists — resisted "improving" nav ordering anyway.
- Verified structured data by reading the actual schema-builder functions
  (`lib/schema/collection.ts`, `lib/schema/breadcrumb.ts`), not just their
  call sites, to confirm what fields/`@type`s they actually emit.

## Issues or concerns

- Flagging for whoever owns `lib/category-nav.ts`: `buildCategoryNav()` is now
  dead code from the UI's perspective (only its own test exercises it), while
  `ROADMAP_CATEGORIES` and other exports from the same file remain live
  dependencies elsewhere (`lib/category-utils.ts`, `lib/bunnycdn.ts`,
  `app/api/search/predictive/route.ts`, `CategoryPageView.tsx`). This wasn't a
  blocker for this task and I made no change, but it's a latent
  confusion risk for future nav work — a future engineer could reasonably
  "fix" nav ordering in `buildCategoryNav()` and see no effect on the actual
  site, exactly as this task's brief almost did.
- Nothing else outstanding; no code changed, so no test run was required
  beyond the read-only verification above.
