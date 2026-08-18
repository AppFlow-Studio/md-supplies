# Bilal's Final Pre-Launch Scope (Sardor's Section) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every item in Bilal's 2026-08-18 "final pre-launch scope" Slack message that is assigned to Sardor (dev) — Trocar landing page, You May Also Need card fix, packaging-display safety, Free Shipping display verification, full redirect audit, and the remaining known code fixes — without touching Shopify catalog data (that's Izzy's, out of scope here — see Global Constraints).

**Architecture:** No new subsystems. Every task extends an existing, already-audited mechanism in this codebase: the filter-registry allowlist (`lib/filter-registry.ts`), the generic category route (`app/category/[slug]/page.tsx` + `CategoryPageView`), the `proxy.ts` redirect table, the shipping resolver (`lib/shipping-resolver/`), and `ProductView.tsx`'s existing recommendation-card/packaging-tab patterns. Research (see refs below) found the Trocar collection route, its nav entry, and its category-metadata pipeline already exist and are live — this is corrective/completion work on wired infrastructure, not a greenfield build.

**Tech Stack:** Next.js App Router, TypeScript, Vitest (`npm test`), ESLint (flat config), `tsc --noEmit`, Playwright (`npm run test:e2e`), Shopify Storefront API (read-only from this repo).

**Spec:** Bilal's 2026-08-18 7:20 PM Slack message (pasted into the session) — the "@Sardor — storefront, landing page, interactions and deployment" section, items 1-6 plus "Final joint acceptance." Izzy's 2026-08-18 9:40 PM message supplies the Trocar filter registry data referenced throughout (`C:\Users\sarik\Downloads\TROCAR-REGISTRY-41-PRODUCTS.csv`).

## Global Constraints

- **Do not write to Shopify.** No catalog, metafield, price, inventory, or product-status writes from this repo. Izzy's Admin-write tasks (LG-04 audit, Free Shipping metafield writes, bulk-op reconciliation) are explicitly out of scope for this plan — the Admin client in `lib/shopify/admin.ts` is comment-scoped to customer read/write only and has no product/metafield access.
- **Do not remove products, overwrite catalog data, change prices, or break saved links.** Every redirect must land on a real 200. Every product count must match before/after.
- **Preserve manufacturer item codes in parentheses at the end of product titles** and **glove sizing in titles** — never strip either, in any card/list/filter component touched.
- **Preserve natural numeric-then-alphabetical sort** in every filter/category list touched — do not introduce a differently-ordered facet list. `lib/catalog/facet-order.ts`'s `orderFacetValues` is the existing mechanism; reuse it, don't replace it.
- **Never expose raw Shopify tags.** Every new/changed filter goes through `lib/filter-registry.ts`'s allowlist (`APPROVED_METAFIELDS`, `cat()`, `getAllowedFacets`) — never a direct tag facet.
- **Free Shipping is a strict AND-gate**: merchant metafield (`custom.free_shipping`) approval AND a resolver-confirmed $0 rate. A metafield alone never displays the badge. Do not weaken or bypass this in any of the 7 display surfaces.
- **No runtime parsing of product descriptions.** Packaging and shipping/returns data render only from structured metafields, never derived from description text at request time.
- **`custom.shipping_returns` stays hidden when empty; never replaced with generic policy text.**
- **This is TDD work**: write the failing test first, watch it fail for the right reason, then write minimal code to pass. Every task below follows that shape.
- **Do not push, open a PR, or deploy without the user's explicit go-ahead**, even though Bilal is asking for speed — carried forward from the prior session's ground rules.

---

## Task 1: Fix the Trocar Supplies filter registry to match Izzy's approved 8 filter groups

**Files:**
- Modify: `lib/filter-registry.ts:245` (the `trocars-trocar-kits` entry) and its `APPROVED_METAFIELDS` map (`lib/filter-registry.ts:59-122`) if `gloveSize` needs no new entry (it already exists at line 62 — confirm, don't re-add)
- Modify: `lib/__tests__/filter-registry.test.ts` — extend `HOSTILE_FACETS` (lines 43-62) and add a new `it(...)` in the `describe('page-specific facet sets', ...)` block (starts line 105)

**Interfaces:**
- Consumes: `APPROVED_METAFIELDS.material`, `.gloveSize`, `.size`, `.features`, `.otherFeatures`, `.use` (all already defined in `lib/filter-registry.ts`), `cat(...)` helper (line 192), `TAIL` (line 189, already supplies Order Size/Brand Name/Price/Certification)
- Produces: nothing new consumed elsewhere — this is a leaf data fix

The current registry entry is wrong: it lists `M.type, M.material, M.size, M.needleGauge, M.length, M.features, M.otherFeatures, M.sterility, M.use, M.color` — none of `type`, `needleGauge`, `length`, `sterility`, `color` exist on Trocar products per Izzy's verified registry (Trocar has `custom.customer_filter_category`, `custom.order_size`, `custom.brand_name`, `custom.use`, `custom.material`, `custom.size_length_`, `custom.other_features`, `custom.glove_size`, `custom.features` — nothing else), and `gloveSize` is missing entirely even though it's populated on 27/41 products.

- [ ] **Step 1: Write the failing test**

Add these two facet fixtures to `HOSTILE_FACETS` in `lib/__tests__/filter-registry.test.ts` (insert after the `size_length_` line, ~line 59):

```ts
  facet('filter.p.m.custom.features', 'Features'),
  facet('filter.p.m.custom.other_features', 'Other features'),
  facet('filter.p.m.custom.use', 'Use'),
  facet('filter.p.m.custom.brand_name', 'Brand name'),
  facet('filter.p.m.custom.sterility', 'Sterility'),
  facet('filter.p.m.custom.type', 'Type'),
```

Then add a new test inside `describe('page-specific facet sets', ...)`, after the existing IV Therapy test (~line 179):

```ts
  it('Trocar Supplies shows Izzy\'s 8 approved groups only — no type/needle/length/sterility/color', () => {
    const ids = getAllowedFacets('trocars-trocar-kits', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'filter.p.m.custom.material',
        'filter.p.m.custom.glove_size',
        'filter.p.m.custom.size_length_',
        'filter.p.m.custom.features',
        'filter.p.m.custom.other_features',
        'filter.p.m.custom.use',
        'filter.p.m.custom.order_size',
        'filter.p.m.custom.brand_name',
        'filter.v.price',
      ]),
    )
    expect(ids).not.toContain('filter.p.m.custom.type')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
    expect(ids).not.toContain('filter.p.m.custom.needle_length')
    expect(ids).not.toContain('filter.p.m.custom.sterility')
    expect(ids).not.toContain('filter.v.option.color')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/filter-registry.test.ts`
Expected: FAIL — the new test's positive assertions fail because `glove_size`/`features`/`other_features`/`use`/`brand_name` aren't in the current `trocars-trocar-kits` rule list (the current list is `type`/`material`/`size`/`needleGauge`/`length`/`features`/`otherFeatures`/`sterility`/`use`/`color`, so `glove_size`/`brand_name` positive assertions fail, and `type`/`needle_gauge`/`needle_length`/`sterility` negative assertions also fail since they're currently allowed).

- [ ] **Step 3: Write minimal implementation**

In `lib/filter-registry.ts`, replace line 245:

```ts
  'trocars-trocar-kits': cat(M.type, M.material, M.size, M.needleGauge, M.length, M.features, M.otherFeatures, M.sterility, M.use, M.color),
```

with:

```ts
  // Corrected 2026-08-18 per Izzy's verified Trocar registry (41 active
  // products): custom.material, custom.glove_size, custom.size_length_,
  // custom.features, custom.other_features, custom.use are the only
  // populated metafields on this collection — type/needle_gauge/
  // needle_length/sterility/color never existed on Trocar products; this
  // entry previously copied the needles-syringes template by mistake.
  'trocars-trocar-kits': cat(M.material, M.gloveSize, M.size, M.features, M.otherFeatures, M.use),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/filter-registry.test.ts`
Expected: PASS, and the full file's pre-existing tests (including the generic `trocars-trocar-kits` entry in the `category coverage` describe block, line ~383) still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/filter-registry.ts lib/__tests__/filter-registry.test.ts
git commit -m "fix(filters): correct Trocar Supplies facet registry to Izzy's verified metafields"
```

---

## Task 2: Redirect the legacy `/collections/trocars-trocar-kits` URL to the canonical category route

**Files:**
- Modify: `proxy.ts` (`REDIRECT_ENTRIES` array, ~line 57)
- Test: `__tests__/proxy.test.ts`

**Interfaces:**
- Consumes: `REDIRECT_ENTRIES: RedirectEntry[]` shape (`proxy.ts:7-9`), the existing 301-entry pattern (e.g. `proxy.ts:73-78`)

Izzy confirmed the source-of-truth collection is `https://mdsupplies.com/collections/trocars-trocar-kits` — the raw Shopify collection URL, which is not a route this Next app serves (`/category/trocars-trocar-kits` is the live equivalent, confirmed in Task 1 and via `lib/category-nav.ts:36`). Customers have this URL saved; it must 301 in a single hop, preserving query params per Bilal's redirect rules.

- [ ] **Step 1: Write the failing test**

Read `__tests__/proxy.test.ts` first to match its existing test style (it will use `proxy()` directly with a mock `NextRequest`, following the pattern of other 301 tests in that file for entries like `/Medical-Supply-Store.html` → `/categories`). Add:

```ts
it('redirects the legacy Shopify collection URL to the canonical category route, preserving query params', () => {
  const req = new NextRequest('https://mdsupplies.com/collections/trocars-trocar-kits?variant=51633171923177')
  const res = proxy(req)
  expect(res.status).toBe(301)
  const location = new URL(res.headers.get('location')!)
  expect(location.pathname).toBe('/category/trocars-trocar-kits')
  expect(location.searchParams.get('variant')).toBe('51633171923177')
})
```

(Match the actual `NextRequest` construction helper already used elsewhere in the file — do not introduce a second pattern.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/proxy.test.ts`
Expected: FAIL — no matching entry exists yet, so the request falls through to pass-through (200, not 301).

- [ ] **Step 3: Write minimal implementation**

`REDIRECT_ENTRIES`'s flat 301 table does not preserve query params (compare the OCC redirect at `proxy.ts:220-224`, which is handled as a dedicated `if` block specifically because it needs `url.search = request.nextUrl.search`). Add a dedicated block near the OCC one (after line 224, before the "Category query variants" comment at line 226):

```ts
  // ── /collections/trocars-trocar-kits → /category/trocars-trocar-kits ──────
  //
  // Izzy confirmed this is the live Shopify collection URL (68 products, 41
  // active) that customers have saved/linked externally. Preserves ?variant=
  // and any other query string in one hop (Bilal's redirect rules, 2026-08-18).
  if (pathname === '/collections/trocars-trocar-kits' || pathname.startsWith('/collections/trocars-trocar-kits/')) {
    const newPath = pathname.replace('/collections/trocars-trocar-kits', '/category/trocars-trocar-kits')
    const url = new URL(newPath, request.url)
    url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/proxy.test.ts`
Expected: PASS, full file green.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "feat(redirects): preserve legacy /collections/trocars-trocar-kits URL with a canonical 301"
```

---

## Task 3: Trocar Supplies quick-link, dedicated-entry-point verification, and nav placement

**Files:**
- Read first (investigation, no guessing): `components/category/CategoryPageView.tsx` (confirm it already renders collection description, breadcrumbs, SEO metadata via `buildCategoryMetadata`, canonical URL, and `Product`/`CollectionPage` schema — Task 2's research found `app/category/[slug]/page.tsx` delegates entirely to this component and `buildCategoryMetadata`) and the primary nav component that consumes `buildCategoryNav()` from `lib/category-nav.ts` (grep for `buildCategoryNav` usage to find it)
- Modify: whichever nav component renders `primary`/`more` from `buildCategoryNav()` — add the "prominent quick link, exception to alphabetical order" for Trocar Supplies
- Test: the nav component's existing test file (find via the component's own `__tests__/` sibling)

**Interfaces:**
- Consumes: `buildCategoryNav(collections)` → `{ primary: NavEntry[]; more: NavEntry[] }` (`lib/category-nav.ts:76-93`, unchanged)

`lib/category-nav.ts` already lists `trocars-trocar-kits` first in "Surgery & Procedure"'s `matchedHandles` (line 36), and `buildCategoryNav` picks the first **live** handle — so today "Surgery & Procedure" in the primary nav already resolves straight to the Trocar collection (the other 4 matched handles — `disposable-3-2mm-3-5mm-trocars`, `disposable-4-5mm-trocars`, `reusable-3-2mm-3-5mm-trocars`, `reusable-4-5mm-trocars` — are very likely not live Shopify collections; confirm this in Step 1, don't assume). This means the "exception to alphabetical navigation" and "prominent quick link" requirement may already be satisfied by existing nav order (verify: is nav order in the primary/more groups literally alphabetical elsewhere, i.e. would Trocar's position under "Surgery & Procedure" need special-casing, or does `ROADMAP_CATEGORIES`' declared array order already win because nav isn't re-sorted?).

- [ ] **Step 1: Investigate current nav rendering order**

Find the component consuming `buildCategoryNav` (`grep -rn "buildCategoryNav" components/ app/`). Read it fully. Confirm: (a) does it re-sort `primary`/`more` alphabetically, or preserve `ROADMAP_CATEGORIES`' declared array order? (b) is "Surgery & Procedure" currently reachable and does it land on the Trocar collection? Write down the answer as a one-paragraph note in this task's PR description — this determines whether Step 2 is a real code change or a no-op verification.

- [ ] **Step 2: Write the failing test (only if Step 1 found a real gap)**

If nav is alphabetically sorted and Trocar/Surgery & Procedure would fall out of a prominent position, write a test in the nav component's test file asserting "Surgery & Procedure" (or a dedicated "Trocar Supplies" entry, per what Step 1 found) renders within the first N primary entries regardless of alphabetical position. Use the component's existing test patterns — do not invent a new test-rendering approach.

If Step 1 found the current order already satisfies "prominent, exception to alphabetical" (e.g., nav order already follows `ROADMAP_CATEGORIES`' declared array, which is not alphabetized), skip to Step 5 and record this as a verified no-op in the QA evidence doc (Task 12) instead of writing dead code.

- [ ] **Step 3: Run test to verify it fails** (skip if Step 2 was skipped)

Run the nav component's test file. Expected: FAIL for the stated reason.

- [ ] **Step 4: Write minimal implementation** (skip if Step 2 was skipped)

Implement the smallest change that satisfies the new test — likely a pinned-position rule in the nav-rendering component, not in `category-nav.ts` (keep the pure `buildCategoryNav` function generic; pin position where rendering happens).

- [ ] **Step 5: Confirm CategoryPageView already supplies breadcrumbs/SEO/canonical/schema**

Read `buildCategoryMetadata` and the JSX `CategoryPageView` renders for breadcrumbs and structured data. Confirm each of Bilal's asks is present for any category (not Trocar-specific — this is a shared component) with real evidence (function names/line numbers), not assumption. If any piece is missing (e.g., no `CollectionPage` schema block), that becomes a new sub-task — do not silently skip; report it in the Task 12 evidence doc.

- [ ] **Step 6: Commit**

```bash
git add <files touched in Steps 2/4>
git commit -m "feat(nav): prominent Trocar Supplies quick link, exception to alphabetical order"
```
(Only if Steps 2-4 produced a real change. If Step 1/5 were pure verification, no commit — note the finding in Task 12's evidence doc instead.)

---

## Task 4: Fix non-clickable "You May Also Need" product cards

**Files:**
- Modify: `components/product/ProductView.tsx:693-724` (the "More products — overflow scroll row" section)
- Test: `components/product/__tests__/ProductView.test.tsx`, `components/product/__tests__/ProductView.a11y.test.tsx`

**Interfaces:**
- Consumes: `RelatedProductCard` (already defined at `ProductView.tsx:32-73`, already used by "Frequently Bought With" at line 670 and "You May Also Like" at line 686) — takes `{ product: CollectionProduct }`, already renders a full `<Link href={`/product/${product.handle}`}>` wrapping image, title, brand badge, label badges (including the shared Free Shipping resolver claim), and price, with a `group` class for hover states
- Produces: nothing new — reuses the existing component as-is

The bug: the "You May Also Need" section (unlike its two siblings) hand-rolls a bare `<div>` per card (line 707) instead of using `RelatedProductCard` — no `Link`, no keyboard focus, no accessible name. `relatedProducts.slice(4)` items are already typed `CollectionProduct`, the exact type `RelatedProductCard` consumes — this is a pure component-swap, no new data plumbing needed.

- [ ] **Step 1: Write the failing test**

In `components/product/__tests__/ProductView.test.tsx`, find the existing "You May Also Need" / overflow-row test block (search for `relatedProducts.slice(4)` or `'You May Also Need'` in the test file to find where it's already rendered/asserted — there is very likely an existing test asserting the section renders titles/prices; extend it rather than duplicating render setup). Add:

```ts
it('You May Also Need cards are real links to the product page', () => {
  // (reuse this file's existing render setup / relatedProducts fixture with 5+ items)
  const links = screen.getAllByRole('link', { name: /Extra Recommended Item/i })
  expect(links.length).toBeGreaterThan(0)
  expect(links[0]).toHaveAttribute('href', '/product/extra-recommended-item')
})
```

Adjust the fixture product title/handle to match whatever fixture data the existing "You May Also Need" test in this file already uses (read it first — do not invent new fixture names that collide).

In `components/product/__tests__/ProductView.a11y.test.tsx`, add an assertion (using the file's existing `axe` invocation pattern) that the "You May Also Need — scrollable product list" region has zero accessibility violations after the fix, including keyboard operability (existing a11y test file likely already has a helper for tab-order/keyboard checks — reuse it).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx`
Expected: FAIL — `getByRole('link', ...)` finds nothing because the cards are `<div>`s.

- [ ] **Step 3: Write minimal implementation**

Replace `ProductView.tsx:706-720` (the `.slice(4).map(...)` block) with:

```tsx
              {relatedProducts.slice(4).map((item) => (
                <div key={item.id} className="w-[185px] sm:w-[201px] shrink-0">
                  <RelatedProductCard product={item} />
                </div>
              ))}
```

`RelatedProductCard`'s own root is a `<Link className="group flex flex-col bg-neutral-50 flex-1 min-w-[160px]">` (line 39) — the wrapping `<div>` here only carries the fixed scroll-row width (`w-[185px] sm:w-[201px] shrink-0`) that the original hand-rolled markup had, since `RelatedProductCard`'s own `flex-1 min-w-[160px]` is sized for a flex-wrap grid, not a fixed-width scroll row. No nested interactive elements are introduced — `RelatedProductCard` has no button inside its `<Link>` today (confirm this stays true; if a future Quick Add button is ever added inside `RelatedProductCard`, it must not go inside the `<Link>` — flag this as a standing constraint in a comment).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx`
Expected: PASS.

- [ ] **Step 5: Manual verification across both PDP routes and breakpoints**

Using `claude-in-chrome` (load via `ToolSearch` first) or a manual walkthrough: load a product with 5+ related products on both `/product/[slug]` and `/category/[slug]/[product]`, confirm image+title click and Enter/Space-via-keyboard-focus both navigate to the correct PDP, at both a desktop and a 375px-ish mobile viewport. Record the product handle(s) tested in the Task 12 evidence doc.

- [ ] **Step 6: Commit**

```bash
git add components/product/ProductView.tsx components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx
git commit -m "fix(pdp): make You May Also Need cards clickable via existing RelatedProductCard"
```

---

## Task 5: Fix wrong variant image in cart popup and cart page

**Files:**
- Modify: `lib/shopify/queries/cart.ts:14-18` (add `image` to the `ProductVariant` selection inside `merchandise`)
- Modify: `lib/shopify/types.ts:248-277` (`CartLine.merchandise`, add `image?: ProductImage | null`)
- Modify: `components/store/CartPopup.tsx:170`
- Modify: `components/store/CartPageClient.tsx:123`
- Test: `components/store/__tests__/CartPopup.test.tsx`, `components/store/__tests__/CartPageClient.test.tsx`

**Interfaces:**
- Consumes: `ProductImage` type (already imported/used elsewhere in `types.ts`, same shape as `ProductVariant.image` at `types.ts:90`)
- Produces: `CartLine.merchandise.image?: ProductImage | null` — both components read this new field

Confirmed live bug: both components read `line.merchandise.product.images.nodes[0]` — the **product's** first image, not the line's selected variant's own image (e.g. a Blue/White/Grey AeroWalk line in the cart shows whichever color happens to be the product's first image, regardless of which color was added). The GraphQL query never selects a variant-level `image` field today, so the data isn't even available to prefer.

- [ ] **Step 1: Write the failing test**

In `components/store/__tests__/CartPopup.test.tsx`, extend the existing line-item fixture (`merchandise: { ... product: { ..., images: { nodes: [] } } }`, ~line 77-84) to add both a variant-level image and a *different* product-level image, then assert the variant image wins:

```ts
merchandise: {
  id: 'variant-1',
  title: 'Blue',
  sku: 'SKU-1',
  image: { id: 'img-variant', url: 'https://example.com/blue.jpg', altText: 'Blue variant', width: 100, height: 100 },
  price: { amount: '19.99', currencyCode: 'USD' },
  selectedOptions: [{ name: 'Color', value: 'Blue' }],
  product: {
    id: 'prod-1', title: 'Xylocaine Injection', handle: 'xylocaine',
    images: { nodes: [{ id: 'img-product', url: 'https://example.com/grey.jpg', altText: 'Grey (product default)', width: 100, height: 100 }] },
    ...product,
  },
},
```

```ts
it('shows the selected variant\'s own image, not the product\'s first image', () => {
  // ...render with the line above...
  const img = screen.getByAltText('Blue variant')
  expect(img).toHaveAttribute('src', expect.stringContaining('blue.jpg'))
  expect(screen.queryByAltText('Grey (product default)')).not.toBeInTheDocument()
})
```

Add the matching test in `components/store/__tests__/CartPageClient.test.tsx` following that file's existing fixture pattern (same `merchandise.product.images.nodes` shape at line 123's surrounding test setup).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- components/store/__tests__/CartPopup.test.tsx components/store/__tests__/CartPageClient.test.tsx`
Expected: FAIL — both components render the "grey.jpg" product image, not "blue.jpg".

- [ ] **Step 3: Add `image` to the cart GraphQL query**

In `lib/shopify/queries/cart.ts`, inside the `... on ProductVariant` block (after line 18, `sku`, before `price`):

```ts
            id
            title
            sku
            image { id url altText width height }
```

- [ ] **Step 4: Add the field to the `CartLine` type**

In `lib/shopify/types.ts`, inside `CartLine.merchandise` (after `sku: string | null;` at line 251):

```ts
    sku: string | null;
    /** Shopify's own variant-media assignment — same field/shape as
        ProductVariant.image. Null when the variant has no image of its own;
        callers fall back to the product's shared gallery image only then,
        never showing a sibling variant's assigned image. */
    image?: ProductImage | null;
```

- [ ] **Step 5: Fix both components to prefer the variant image**

In `components/store/CartPopup.tsx:170`, replace:

```ts
const image = line.merchandise.product.images.nodes[0]
```

with:

```ts
const image = line.merchandise.image ?? line.merchandise.product.images.nodes[0]
```

Apply the identical change in `components/store/CartPageClient.tsx:123`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- components/store/__tests__/CartPopup.test.tsx components/store/__tests__/CartPageClient.test.tsx`
Expected: PASS. Then run the full suite (`npm test`) to confirm no other test asserting the old `merchandise.product.images` cart shape broke — if one does, update its fixture to match the new (backward-compatible, still-optional) field rather than changing the components back.

- [ ] **Step 7: Commit**

```bash
git add lib/shopify/queries/cart.ts lib/shopify/types.ts components/store/CartPopup.tsx components/store/CartPageClient.tsx components/store/__tests__/CartPopup.test.tsx components/store/__tests__/CartPageClient.test.tsx
git commit -m "fix(cart): show the selected variant's own image, not the product's first image"
```

---

## Task 6: Preserve bold formatting in Vendor Shipping & Returns rich text

**Files:**
- Modify: `lib/policy/rich-text.ts` (add a marks-preserving variant alongside the existing plain-text one)
- Modify: `components/product/ProductView.tsx` (the RETURNS tab's Vendor Shipping & Returns block — find via `shopifyRichTextToPlainParagraphs` usage, imported at line 27)
- Test: `lib/policy/__tests__/rich-text.test.ts`, `components/product/__tests__/ProductView.test.tsx`

**Interfaces:**
- Produces: a new exported type/function in `lib/policy/rich-text.ts`, e.g. `type RichTextSpan = { text: string; bold?: boolean; italic?: boolean }` and `shopifyRichTextToParagraphSpans(raw: string | null | undefined): RichTextSpan[][]` (one inner array per paragraph, matching the existing per-paragraph shape of `shopifyRichTextToPlainParagraphs`)
- Consumes downstream: `ProductView.tsx`'s RETURNS tab renders `RichTextSpan[][]` as `<p>{spans.map(span => span.bold ? <strong>{span.text}</strong> : span.text)}</p>` — bold/italic only, never arbitrary HTML (matches the existing "safe rich-text rendering" constraint from Bilal's message)

`shopifyRichTextToPlainParagraphs` (docstring, `lib/policy/rich-text.ts:19-20`) explicitly strips all inline marks to flat text by design — this is correct for its current caller (`resolveReturnPolicy`'s general policy text, a different, unrelated field) but means bold can never survive for `custom.shipping_returns`. Add a second function rather than changing the existing one's contract, since `resolveReturnPolicy` and any other caller must keep getting flat strings.

- [ ] **Step 1: Write the failing test**

In `lib/policy/__tests__/rich-text.test.ts`, add (matching the file's existing `JSON.stringify({type:'root',children:[...]})` fixture style):

```ts
describe('shopifyRichTextToParagraphSpans', () => {
  it('preserves bold marks within a paragraph as separate spans', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Returns accepted within ' },
          { type: 'text', value: '30 days', bold: true },
          { type: 'text', value: ' of delivery.' },
        ],
      }],
    })
    const paragraphs = shopifyRichTextToParagraphSpans(raw)
    expect(paragraphs).toEqual([
      [
        { text: 'Returns accepted within ', bold: false },
        { text: '30 days', bold: true },
        { text: ' of delivery.', bold: false },
      ],
    ])
  })

  it('degrades malformed/non-JSON input to an empty array, matching the plain-text function', () => {
    expect(shopifyRichTextToParagraphSpans('not json')).toEqual([])
    expect(shopifyRichTextToParagraphSpans(null)).toEqual([])
  })
})
```

(First read the actual Shopify rich-text AST shape for a bold mark — Shopify's `rich_text_field` marks bold text with `"bold": true` on the text leaf node per Shopify's documented schema; confirm this matches what `custom.shipping_returns`'s real QA value actually contains by re-running `scripts/verify-aerowalk-qa-pilot.ts` or a similar read-only query against a QA product known to have bold text, before trusting the fixture shape above blindly.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/policy/__tests__/rich-text.test.ts`
Expected: FAIL — `shopifyRichTextToParagraphSpans` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

In `lib/policy/rich-text.ts`, add alongside the existing code (don't modify `extractText`/`shopifyRichTextToPlainParagraphs`):

```ts
export type RichTextSpan = { text: string; bold: boolean }

function extractSpans(node: ShopifyRichTextNode): RichTextSpan[] {
  if (typeof node.value === 'string') {
    return node.value ? [{ text: node.value, bold: Boolean((node as { bold?: boolean }).bold) }] : []
  }
  if (!node.children) return []
  return node.children.flatMap(extractSpans)
}

/**
 * Same paragraph/list-item flattening as shopifyRichTextToPlainParagraphs,
 * but preserves bold marks as spans instead of discarding them — for the one
 * caller (Vendor Shipping & Returns) that needs safe bold rendering.
 * Italic/links stay stripped to plain text (not requested); only bold is
 * carried through, so the render side stays a narrow, safe <strong>-only path.
 */
export function shopifyRichTextToParagraphSpans(raw: string | null | undefined): RichTextSpan[][] {
  if (!raw) return []
  let root: ShopifyRichTextNode
  try {
    root = JSON.parse(raw)
  } catch {
    return []
  }

  const paragraphs: RichTextSpan[][] = []
  const walk = (node: ShopifyRichTextNode) => {
    if (node.type === 'list' && node.children) {
      node.children.forEach(walk)
      return
    }
    const spans = extractSpans(node)
    if (spans.some((s) => s.text.trim())) paragraphs.push(spans)
  }
  root.children?.forEach(walk)
  return paragraphs
}
```

`ShopifyRichTextNode`'s type at the top of the file doesn't declare `bold` — extend it: add `bold?: boolean` to the type at line 1-5.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/policy/__tests__/rich-text.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the RETURNS tab to render spans with `<strong>`**

Read the exact current RETURNS-tab JSX in `ProductView.tsx` that calls `shopifyRichTextToPlainParagraphs` for `shippingReturns` (grep for `shippingReturns` in the file to find the call site precisely — do not guess the surrounding JSX). Write a failing test in `ProductView.test.tsx` first (fixture with a bold span in `shippingReturns`, assert a `<strong>` element with the bold text is present and the surrounding plain text is not wrapped), watch it fail, then switch that call site from `shopifyRichTextToPlainParagraphs` to `shopifyRichTextToParagraphSpans` and render each paragraph as `<p>{spans.map((s, i) => s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>)}</p>`.

- [ ] **Step 6: Run full ProductView test file, verify green**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx`
Expected: PASS, including all pre-existing Vendor Shipping & Returns tests (hidden-when-empty behavior must be unchanged — verify the empty-string/null case still renders nothing).

- [ ] **Step 7: Commit**

```bash
git add lib/policy/rich-text.ts lib/policy/__tests__/rich-text.test.ts components/product/ProductView.tsx components/product/__tests__/ProductView.test.tsx
git commit -m "feat(pdp): preserve bold formatting in Vendor Shipping & Returns rich text"
```

---

## Task 7: Free Shipping display verification across all 7 surfaces (read-only, no Shopify writes)

**Files:**
- Read/extend: `scripts/report-free-shipping-exceptions.ts` (existing read-only reporting script — confirmed to exist; extend rather than rewrite)
- Read: `lib/shipping-resolver/free-shipping-gate.ts`, `lib/shipping-resolver/resolve.ts`, `lib/shipping-resolver/copy.ts`
- Read/verify: `ProductView.tsx`, `components/product/ShippingBadge.tsx`, `components/product/ShippingBlock.tsx`, `components/store/ShopifyProductCard.tsx`, `components/store/CartPopup.tsx`, `components/store/CartPageClient.tsx`, `components/home/PopularProducts.tsx` — plus confirm Quick Add and the (now-fixed, Task 4) You May Also Need cards independently
- Output: a findings doc, `docs/launch/2026-08-18-free-shipping-verification.md`

**Interfaces:**
- Consumes: whatever public function `free-shipping-gate.ts` exports (read it first — do not assume a name) as the single AND-gate; every surface must call through it, never re-implement the AND logic locally

This task is verification, not implementation — Bilal's OCC/Dukal/Trocar/Kadara *rule content* is Izzy's write, out of scope here (Global Constraints). Sardor's job is confirming every display surface obeys the existing AND-gate and flagging any surface that shows the badge off the metafield alone.

- [ ] **Step 1: Read the AND-gate implementation**

Read `lib/shipping-resolver/free-shipping-gate.ts` fully. Confirm in writing (in the findings doc) that it requires both the merchant metafield AND a resolver-confirmed $0 rate before returning a "show badge" result, with the exact function signature and the two specific checks it performs (quote the lines).

- [ ] **Step 2: Grep every display surface for independent badge logic**

`grep -rn "free_shipping\|freeShipping\|shippingDisplay\|FreeShipping" components/ app/` — for each hit, confirm it either (a) reads a pre-computed `shippingDisplay`/`ShippingDisplay` value that was itself produced by the gate (safe), or (b) independently checks the raw metafield without going through the gate (a bug — flag it explicitly by file:line in the findings doc, do not fix it in this task unless it's a one-line obvious call-site swap; if it's structural, write it up as a separate task and stop).

- [ ] **Step 3: Confirm PDP + Quick Add + You May Also Need render the same resolved value as the category/search card for the same product**

Write a focused test (or extend an existing one) in `ProductView.test.tsx` and the category-card test file asserting that for a fixture product with `shippingDisplay: { eligible: true, confirmed: false }` (gate says no) and one with `{ eligible: true, confirmed: true }` (gate says yes), no surface shows the badge in the first case. Run and confirm pass with the current code (this test should already pass if the resolver is correctly the single source — a fail here means a real bug to fix, following the TDD steps from Task 4-6's pattern).

- [ ] **Step 4: Verify against real QA data for one example per rule**

Using the existing read-only verify-script pattern (`NODE_OPTIONS='--conditions=react-server' npx tsx scripts/<script>.ts` against `.env.local`'s QA store), spot-check: one Dukal product inside OCC (expect badge), one Dukal product outside OCC under $30 (expect no badge), one Trocar Supplies product (expect badge, unless it's one of Izzy's named "3 currently missing the flag" — cross-reference against her list), one Kadara product from the Trocar registry CSV (expect no badge). Record actual observed results, including any merchant-rule-vs-resolver disagreement, in the findings doc — do not fix disagreements (Izzy's writes), just report them precisely (product ID/handle + what was expected vs. observed).

- [ ] **Step 5: Write the findings doc**

`docs/launch/2026-08-18-free-shipping-verification.md` — structured per surface (PDP / category card / search card / Quick Add / You May Also Need / cart popup / cart page / checkout), pass/fail/not-applicable for each, plus the spot-check results from Step 4.

- [ ] **Step 6: Commit**

```bash
git add docs/launch/2026-08-18-free-shipping-verification.md <any test files touched>
git commit -m "docs(shipping): verify Free Shipping AND-gate across all 7 display surfaces"
```

---

## Task 8: Re-confirm packaging display safety rules under the new scope

**Files:**
- Read: `components/product/ProductView.tsx` (ORDER PACKAGING tab)
- Test: `components/product/__tests__/ProductView.test.tsx` (extend existing LG-04 describe block, per the 2026-08-17 session's prior work)

**Interfaces:**
- Consumes: `selectedVariant.innerPackQuantity` / `.packsPerCase` / `.totalOrderQuantity` / `.orderSize` / `.unitsPerOrder` (all pre-existing, per prior session)

Per the prior session's QA evidence doc (`docs/launch/2026-08-17-qa-evidence-and-production-readiness.md`), this was already verified for 3 named products with a passing sibling-leak test. Bilal's new message adds one explicit requirement not yet tested: "If packaging differs and the selected variant lacks its own value, do not display another variant's quantity. Show 'Packaging information unavailable for this option.'" — confirm this exact copy is what's currently shown (the prior doc's browser walkthrough logged the string "Packaging information not available for this product" — **note the wording differs from Bilal's new message**: "for this option" vs. "for this product." Resolve this discrepancy explicitly, don't assume it's a typo in one or the other).

- [ ] **Step 1: Find and quote the exact current fallback copy**

`grep -n "Packaging information" components/product/ProductView.tsx` — read the surrounding code, quote the literal string in this task's notes.

- [ ] **Step 2: Compare against Bilal's exact requested copy**

If the strings differ, this is a product-copy decision, not an obvious bug — do not silently rewrite it. Flag the discrepancy in the Task 12 evidence doc as a one-line question back to Bilal ("current fallback reads '[X]', your message says '[Y]' — confirm before merging'') rather than guessing which is authoritative.

- [ ] **Step 3: Write a test for the "differs + selected variant blank" case if none exists**

Check whether the existing LG-04 test suite already covers a variant with partial packaging data (variant A has values, sibling variant B has none) — the prior session's evidence doc §3 covered "another variant's values don't leak," but confirm a variant with **zero** packaging fields, when its sibling has some, shows the fallback string and not an empty/blank row. If this exact case isn't covered, add it following the existing test file's fixture pattern.

- [ ] **Step 4: Run and confirm green**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx`
Expected: PASS (this task is expected to mostly confirm existing correct behavior, not fix bugs — treat any failure as a real regression worth investigating via systematic-debugging, not a copy-paste fix).

- [ ] **Step 5: Commit** (only if a new test was added)

```bash
git add components/product/__tests__/ProductView.test.tsx
git commit -m "test(pdp): cover fully-blank sibling-variant packaging fallback"
```

---

## Task 9: Investigate and fix the 320px homepage/search overflow

**Files:**
- Investigate first: homepage (`app/page.tsx` or equivalent — locate via `Glob`) and search (`app/search/page.tsx` or equivalent) components
- Test: Playwright, since this is a real-viewport rendering bug, not unit-testable in jsdom

Research found no existing TODO/marker for this — genuinely uninvestigated. Do not guess the cause.

- [ ] **Step 1: Reproduce at 320px**

Using `claude-in-chrome` (load tools via `ToolSearch` first) or Playwright directly, load the homepage and `/search?q=<term>` at a 320px viewport width. Screenshot both. Identify the specific element(s) causing horizontal overflow (use `read_console_messages`/`javascript_tool` to run `document.querySelectorAll('*')` width-vs-viewport diffing, or visually inspect via the screenshot plus `get_page_text`/`read_page` for the DOM structure at the point of overflow).

- [ ] **Step 2: Write a failing Playwright test**

In `e2e/` (matching the existing spec file naming pattern, e.g. `e2e/320px-overflow.spec.ts`), assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (or `window.innerWidth`) at a 320px viewport for both the homepage and a search results page. Run it, confirm it fails and reproduces the exact overflow amount.

- [ ] **Step 3: Fix the specific overflowing element(s)**

Whatever Step 1 identified — likely a fixed-width element, an unwrapped long string, or a flex/grid item without `min-width: 0`. Make the minimal CSS/markup change. Do not touch unrelated responsive breakpoints.

- [ ] **Step 4: Run the Playwright test to verify it passes**

Run: `npm run test:e2e -- e2e/320px-overflow.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add <files touched> e2e/320px-overflow.spec.ts
git commit -m "fix(layout): eliminate 320px horizontal overflow on homepage and search"
```

---

## Task 10: Investigate and fix White/Grey legacy product redirects

**Files:**
- Investigate first: `docs/redirects-ready.json`, `proxy.ts`'s `REDIRECT_ENTRIES`
- Test: `__tests__/proxy.test.ts`

Research found no existing White/Grey-specific redirect code — genuinely uninvestigated, distinct from the AeroWalk Blue/White/Grey *product variants* (which are one live product with three variants, not a redirect concern) referenced in prior session docs. Do not conflate the two.

- [ ] **Step 1: Identify what "White/Grey legacy product redirects" refers to**

Search `docs/redirects-ready.json` for entries containing "White" or "Grey" (case-sensitive, since the file preserves legacy mixed-case paths per `proxy.ts`'s comment at line 170-172). Cross-reference against `proxy.ts:108-111`'s existing hand-written entry (`Drape Sheet White 40 x 60 2-Ply` → `drape-sheets-40-x-60-2-ply-blue-100-cs`, already flagged with an `ACTION: verify ... returns 200 before deploy` comment) — this may be exactly what Bilal means, in which case the task is verifying that ACTION item, not building new redirect logic. Check for a parallel "Grey"/"Gray" variant of the same consolidated-color pattern that might be missing an entry.

- [ ] **Step 2: Verify the destination returns 200**

Query the QA/production storefront (read-only) for `/product/drape-sheets-40-x-60-2-ply-blue-100-cs` and confirm 200. If any parallel Grey/Gray legacy URL exists in `docs/redirects-ready.json` without a corresponding working entry, that's the actual gap.

- [ ] **Step 3: Write a failing test for the gap found**

Follow Task 2's exact test pattern (`__tests__/proxy.test.ts`, `NextRequest` + `proxy()` + assert 301/Location).

- [ ] **Step 4: Implement the fix**

Either remove the stale `ACTION:` comment once verified (no code change, just confirms an existing entry is correct) or add the missing entry following the exact pattern at `proxy.ts:108-111`.

- [ ] **Step 5: Run test, verify pass, commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "fix(redirects): resolve White/Grey legacy product redirect gap"
```

---

## Task 11: Full redirect audit

**Files:**
- Create: `scripts/audit-redirects.ts` (read-only, follows the existing `scripts/verify-*.ts` pattern — `server-only` + `--conditions=react-server`)
- Output: `docs/launch/2026-08-18-redirect-audit-report.md`

**Interfaces:**
- Consumes: `docs/redirects-ready.json`, `proxy.ts`'s exported `REDIRECT_ENTRIES` (export it if not already exported — check first) and `GONE_CATEGORY_SLUGS`

Covers every category Bilal listed: legacy `/products/...`, current `/product/...`, old `/collections/...`, category/subcategory routes, OCC pages, Surgery & Procedure routes, Trocar collection/filtered links, consolidated-product handles, archived color-specific handles, and every prior redirect-registry entry.

- [ ] **Step 1: Write the audit script**

`scripts/audit-redirects.ts`: for every entry in `docs/redirects-ready.json` and every hand-written entry in `proxy.ts#REDIRECT_ENTRIES`, resolve the destination path against the live Storefront API (read-only — for `/product/<handle>` destinations, query the handle; for `/category/<slug>` destinations, confirm the slug resolves via `lib/category-nav.ts`'s `getAllowedHandles()`/live collection check) and record: source, destination, resolved status (200/404/other), whether it's a single hop (destination is not itself a `from` key elsewhere — reuse the existing "no chains" invariant already documented in `proxy.ts:14-17`), and whether canonical URL (if checkable without a full page render) matches the destination.

- [ ] **Step 2: Run the script against QA**

Run: `NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-redirects.ts`
Capture full output.

- [ ] **Step 3: Write the report**

`docs/launch/2026-08-18-redirect-audit-report.md` — a table: source URL → destination URL → status code, one row per entry, plus a summary section calling out every unresolved/broken/chained entry explicitly (do not bury a single failure in an otherwise-green summary).

- [ ] **Step 4: Fix any broken entries found**

For each broken entry, follow the Task 2/10 TDD pattern (failing `proxy.test.ts` test → fix → pass) — do not batch-fix without a test per fix, since a wrong destination is exactly the kind of silent regression this audit exists to catch.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-redirects.ts docs/launch/2026-08-18-redirect-audit-report.md proxy.ts __tests__/proxy.test.ts
git commit -m "test(redirects): add full pre-launch redirect audit script and report"
```

---

## Task 12: Final QA pass — full suite, Playwright, browser walkthrough, evidence doc

**Files:**
- Output: `docs/launch/2026-08-18-final-qa-evidence.md`

- [ ] **Step 1: Run the full automated gate**

```bash
npm test
npx tsc --noEmit
npx eslint .
npm run test:e2e
```

All must be green. Record exact pass counts.

- [ ] **Step 2: Fresh preview walkthrough (real branch, not a stale shared preview)**

Using `claude-in-chrome` or manual walkthrough against `next dev`/a fresh deploy preview of this actual branch:
- Trocar landing page: confirm exactly 41 products render, cross-check against `TROCAR-REGISTRY-41-PRODUCTS.csv`'s product IDs
- Every filter from Task 1 works on desktop and mobile
- OCC and Trocar product/pricing data intact (spot-check a few prices against the CSV's Price min/max columns)
- Old Trocar/OCC/collection/consolidated-product/color-specific URLs redirect correctly (re-run Task 11's audit script against the fresh preview URL)
- The 8 known packaging-variant products (from Bilal's message: SKUs 118216, 118218, 118220, 406, CT-12B, CT-06B, 1137-25, 1137, plus SKU 2655) no longer show incorrect inherited quantities — **note: these SKUs' underlying metafield values are Izzy's write, out of scope for this plan; verify only that the display logic itself (Task 8) correctly shows "unavailable" rather than a leaked sibling value for whichever of these are already in QA, and flag any not yet writable as blocked-on-Izzy, not a dev bug**
- Dukal/OCC, Dukal $30+, Trocar Supplies, Kadara shipping examples (Task 7's findings)
- Every You May Also Need card (Task 4) opens the correct PDP, mobile + keyboard
- Correct variant/image/quantity/shipping rates carry into cart (Task 5) and checkout
- Guest checkout reaches the payment step on desktop and mobile without placing an order

- [ ] **Step 3: Write the evidence doc**

`docs/launch/2026-08-18-final-qa-evidence.md` — mirror the structure of the prior session's `2026-08-17-qa-evidence-and-production-readiness.md`: a table of every item Bilal asked to verify, pass/fail/blocked-on-Izzy, plus exact PR/SHA once the user approves committing (Global Constraints — do not push without explicit go-ahead).

- [ ] **Step 4: Present the evidence doc to the user for review before any push/PR/deploy action**

No commit for this step beyond the doc itself — pushing and opening a PR remain gated on the user's explicit go-ahead per Global Constraints.
