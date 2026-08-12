# Catalog CRO + SEO/AEO/GEO audit — 2026-08-12

Scope: `/`, `/categories`, the 25 category detail routes, `/industries`, the 5
industry detail routes, `/contact`, `/about`, `/solutions/occ`, `/search`,
robots, sitemap, canonicals, redirects and structured data.

**Out of scope:** `/products/*` content and schema were not redesigned. Product
cards and product links were touched only as the listing experience required.

All numbers below are **measured against the live Storefront API on 2026-08-12**
(QA store, API version 2026-04) — none are copied from a screenshot or a spec
table. Raw evidence:

| Artifact | What it holds |
|---|---|
| `audit/live/facets.json` | Every facet id/label/value-count Search & Discovery publishes per collection |
| `audit/live/tag-vs-collection.json` | `category:` tag total vs Shopify collection total, per category |
| `audit/live/route-audit.json` · `route-table.md` | Per-route product total + rendered facet order (regenerate: `node scripts/audit-live-routes.mjs && node scripts/audit-route-table.mjs`) |
| `audit/live/sitemap.xml` | Rendered production sitemap used for the URL checks below |

---

## 1. Findings that changed behaviour

### F1 — Four category pages served a fraction of their catalogue (critical)

`L1CategoryDef.collectionHandle` doubles as the route slug *and* the artwork
source. For four categories that handle is a narrow "representative"
sub-collection, so the page browsed it directly:

| Route | Displayed | Category actually has | Shortfall |
|---|---:|---:|---:|
| `/category/seating` (Room Furniture) | 8 | 512 | 98.4% |
| `/category/trocars-trocar-kits` (Surgery & Procedure) | 41 | 319 | 87.1% |
| `/category/capes-gowns` (Apparel) | 34 | 152 | 77.6% |
| `/category/face-masks` (Face Masks) | 1 | 35 | 97.1% |

**Fix:** added `productSet: 'tag'` to those four registry entries; they now
browse `category:<tag>`, the same membership source the tiles and L2 pages use.
The other 21 agree with their collection within normal drift and keep the
collection source (and its richer sort keys — `Query.search` accepts only
RELEVANCE and PRICE).

**Follow-on:** those routes must not inherit the proxy collection's SEO fields.
`trocars-trocar-kits` carried `seo.title` *"Trocars & Trocar Kits - 3.2mm,
3.5mm, 4.5mm - FDA Registered"* and a matching About block — a title describing
41 of the 319 products, and an FDA claim that does not hold for the wider set.
Tag-sourced routes now take the registry's display name and approved
description, and the collection About block is suppressed.

### F2 — Eight of 25 category pages were missing from the sitemap (high)

`fetchCategoryUrls` iterated the Storefront collection list (`first: 250`,
unpaginated) and kept whichever handles happened to be in the registry. The
store has more collections than that, so 8 live, indexable, nav-linked
categories never appeared: `needles-syringes`, `surgical-sutures`,
`respiratory`, `disinfectants`, `iv-therapy`, `urology-ostomy`,
`sterilization`, `pharmacy-products`.

**Fix:** the registry now decides which routes exist; Shopify only supplies
`lastmod`. Verified after: 25/25 present, 0 duplicates, 0 query variants.

### F3 — Two indexable URLs for Face Masks (high)

`buildCategoryTreeNav` and the sitemap emitted `/category/face-coverings`
(the Shopify handle) while `lib/seo/categorySeo.ts`, the `/search` category
links and every legacy `.html` redirect target used `/category/face-masks`.
`proxy.ts` 301s the former to the latter — so the sitewide nav linked into a
redirect and the sitemap listed a redirecting URL.

**Fix:** `getCategorySlug()` is now the single source for minting public
category URLs, and every call site goes through it. Verified: 0 occurrences of
`face-coverings` in the rendered sitemap.

### F4 — The filter rail showed 5 of the 13 facets Shopify was publishing (high)

The store's Search & Discovery config already exposed Type, Thickness,
Features, Other Features, Sterility, Use, Color, Certification and Detectable
Drugs, but `lib/filter-registry.ts` had no entry for any of them, so the
default-deny gate silently dropped every one. Gloves rendered Category, Glove
Size, Material, Order Size, Brand Name and Price out of 13 available.

**Fix:** all 20 approved sources registered, with a per-route ordered
allowlist. Gloves now renders, in approved order: Category, Type, Material,
Glove Size, Size, Thickness, Other Features, Sterility, Color, Order Size,
Brand Name, Price, Certification.

`custom.type` was previously withheld on the grounds that it held Material
values on gloves. The live response shows that is fixed: gloves returns Type
with 8 values over 442 products *and* a separate Material facet with 6 values
over 317.

### F5 — The result count had no denominator, and page size was capped at 9

`CategoryResults` fetched `first = currentPage * 9 + 1` **full product
payloads** and sliced client-side. Consequences: no total to display, a hard
page ceiling at Storefront's `first: 250`, and page 20 downloading 181 products
to show 9.

The Storefront API (2026-04) exposes no total on `Collection.products` —
introspected: `ProductConnection` has exactly `edges, filters, nodes,
pageInfo`, and `Collection` has no `productsCount`. `Query.search` *does*
expose `totalCount`.

**Fix:** `lib/catalog/product-index.ts` walks IDs+cursors at 250/page, which
yields the exact total **and** the start cursor for any offset; the display
query then fetches exactly one page. Cost is 1–4 cached requests (largest
category, exam-room at 845, resolves in 4; measured 588–675 ms uncached).

Verified live on `/category/gloves` (445 products): the cursor-derived page-5
first item is byte-identical to item 81 of a brute-force `first: 100` fetch.

### F6 — Facet checkboxes had no accessible name (medium, a11y)

Each value was a bare 16px `role="checkbox"` button wrapped in a `<label>` with
two sibling spans. `<label>` names native form controls, never an ARIA-role
button — so the gloves Brand Name facet announced 26 identical "checkbox, not
checked" rows.

**Fix:** the whole row is the control; label and count are its accessible name.

### F7 — `/category/gloves` H1 named a subset of its own page (medium)

The H1 was "Exam Gloves". The page carries 445 products and its Category facet's
top value is literally `Exam Gloves — 307` — the heading named one facet value
while the grid showed nine more categories. Changed to "Medical Gloves"; the
`<title>` still leads with the dominant query term.

### F8 — Popular Categories hover was invisible (low)

`hover:bg-neutral-50` is `#f9faf9` on a white tile — a 2% change. Added a real
`--color-surface-hover` (`#eceff4`) token with measured contrast (ink-muted
4.62:1, gray-500 4.83:1, navy-900 15.6:1 — all clear AA), plus `focus-visible`
and `motion-reduce`.

### F9 — Industry H1s were ungrammatical (low)

`IndustryLandingPage` rendered `${industry.name} Supplies`, producing
"Pharmacies Supplies" and "Clinics & Doctor's Offices Supplies" as the visible
heading on indexable pages. `Industry.h1` is now explicit per industry.

### F10 — Industry filter rails resolved against the wrong registry (medium)

`facetKey={industry.collectionHandle}` was looked up in the *category* registry,
where none of the five industry slugs exist — so all five fell through to the
bare default set. Industries now have their own registry and `facetKind`.

---

## 2. Route-by-route table

Product totals and facet lists are generated from the live API — see
`audit/live/route-table.md` for the full 30-row table.

**Common to all 30 routes:** server-rendered (H1, description, product links,
breadcrumbs and metadata are in the initial HTML — the layout reads `headers()`
for the CSP nonce, so every route renders per-request); one `<h1>`; absolute
canonical; `CollectionPage` + `ItemList` + `BreadcrumbList` JSON-LD on the
canonical unfiltered page 1 only; hero image present on mobile **and** desktop;
full approved description, unclamped.

**Indexability:** unfiltered page 1 is `index,follow`. `?filter=`, `?sort=`,
`?q=` and `?per_page=` are `noindex,follow` with a canonical to the clean URL,
so faceted combinations cannot multiply in the index. `?page=N` stays indexable
with a self-canonical — those are genuinely distinct product sets and
canonicalising them all to page 1 would misrepresent that.

### Verified programmatically (`lib/__tests__/seo-route-audit.test.ts`)

- exactly 25 categories / 5 indexable industries, unique slugs and display names
- every category resolves a curated (non-fallback) hero image and a focal position
- every industry has an uploaded hero image
- 30 distinct canonical URLs, no duplicates
- no registry route emits a slug the proxy would redirect
- every public slug resolves back to a real Shopify handle
- every one of the 30 routes has an explicit facet-registry entry (none on the bare default)
- `SITE_URL` is absolute https with no localhost / preview host

### Verified against the rendered production build

| Check | Result |
|---|---|
| Sitemap URLs | 8,146 |
| Category L1 routes in sitemap | 25 / 25 |
| Industry routes in sitemap | 5 / 5 |
| Duplicate `<loc>` entries | 0 |
| Query-parameter variants in sitemap | 0 |
| `localhost` / preview hosts in sitemap | 0 |
| Redirecting (`face-coverings`) URLs in sitemap | 0 |
| Cart / account / checkout URLs in sitemap | 0 (two matches are a `carts` subcategory and a utility-cart product) |
| `robots.txt` blocks JS/CSS/images | No — only `/api/`, `/account/`, `/cart`, `/internal/`, `/b2b` |
| `Disallow: /` shipped to production | No |

---

## 3. Data issues code cannot fix

These are Shopify-side. Everything below **fails closed** — the facet is
registered and will appear the moment the data is published, and nothing is
faked from another field in the meantime.

1. **`custom.adulterants` is not published by Search & Discovery on any route.**
   It is in the approved filter table and is required by Testing and Pharmacies.
   Not returned for `testing-screening` or `industry:pharmacy`. Needs the
   metafield definition marked filterable with Storefront access.

2. **`custom.certification` is published on gloves only** (2 values / 50
   products) plus the two largest industry sets. It is approved for all 25
   categories.

3. **`custom.use` and `custom.features` are near-absent.** `use` appears on 8 of
   25 categories and usually with a single value covering 1–3 products.

4. **Room Furniture (`/category/seating`) has almost no attribute data.** 512
   products, but S&D publishes only Category, Order Size, Brand Name and Price
   for the `room-furniture` tag — no Type, Material, Size, Colour or Use. The
   largest category with the thinnest filter set.

5. **Shopify caps facet values at 100.** Wound Care Size, Exam Room Category,
   and the Category/Brand Name/Size/Other Features facets on the two largest
   industries all return exactly 100 — i.e. truncated upstream. The
   facet-scoped search box mitigates but does not remove this.

6. **Facets that are populated but deliberately not on the approved allowlist**
   (dropped by design; listed so the omission is a decision, not an accident):
   Sterility on Exam Room / Hygiene / Disinfectants / Incontinence; Glove Size
   on Surgery & Procedure; Thickness on Housekeeping & Janitorial; Detectable
   Drugs on Urgent Care and Clinics; Glove Size / Needle Gauge / Needle Length
   on Home Health and Pharmacies.

7. **Hero assets are all 4:3** (1200×896 or 2400×1792). The hero crops to a
   wider box, so the vertical anchor matters; `DEFAULT_HERO_FOCAL` is
   `center 58%`, measured from the subject position in the delivered assets
   (mobility ~61%, room-furniture ~63%). A visual pass over all 25 at target
   breakpoints would let per-route overrides replace the shared default.

8. **`/category/face-masks` and `/category/seating` slugs disagree with the
   supplied spec table**, which lists `/category/face-coverings` and
   `/category/seating`. `face-coverings` was kept as a 301 source because the
   repository already carries an explicit canonical migration to `face-masks`
   (`canonicalSlug`, a subtree 301, and every legacy redirect target). Flagging
   rather than silently reverting a shipped migration.
