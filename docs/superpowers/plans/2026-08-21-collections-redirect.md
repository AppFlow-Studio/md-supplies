# Legacy `/collections/<handle>` Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a registry-driven `/collections/<handle>` → `/category/<slug>` redirect in `proxy.ts` so the ~29 L1-category-level legacy Shopify collection URLs (still linked from Shopify's own auto-generated sitemap and external backlinks) land on this app's real route in one hop, instead of 404ing.

**Architecture:** One new matcher function in `proxy.ts`, `redirectLegacyCollectionUrl()`, built on a lookup table keyed by every `L1CategoryDef`'s `tag` **and** `collectionHandle` (both forms appear as live Shopify collection handles in the audit data) mapping to `getCategorySlug(l1)` — the same function every other public category URL in this app already goes through, so a category whose canonical slug diverges from its raw collection handle (e.g. Apparel: tag `apparel`, collection `capes-gowns`, canonical slug `capes-gowns`) still resolves correctly instead of a naive 1:1 rename. This generalizes and replaces the existing single hand-written `/collections/trocars-trocar-kits` rule. `/collections/occ` gets one adjacent, explicit line reusing the same "one canonical OCC route" decision the existing `/category/occ` rule already encodes. Everything else under `/collections/*` (roughly 660 distinct subcategory/attribute-level Shopify collection handles found in the audit, e.g. `/collections/25g-hypodermic-needles`) is deliberately left alone — those need live product-tag data to resolve to a parent category/subcategory pair, which this edge-middleware fix does not attempt to guess.

**Tech Stack:** Next.js middleware (`proxy.ts`, Edge runtime), Vitest (`__tests__/proxy.test.ts`), existing `lib/category-tree.ts` registry.

**Spec:** `docs/audits/2026-08-21-seo-audit-triage.md`, Finding 3 (also cross-references the 2026-08-12 audit's Finding F3 divergent-handle caveat, quoted below).

## Global Constraints

- Every redirect in `proxy.ts` is a single 301 hop — no chains. The new function must not sit behind (or feed into) any other redirect branch that could double-hop it.
- Any code that mints a public category URL must go through `getCategorySlug()`, never a raw `collectionHandle` or `tag` string rename — this is the exact bug F3 of the 2026-08-12 audit fixed elsewhere in this codebase (`lib/category-tree.ts:232-249`'s own doc comment), and this plan must not reintroduce it.
- Every response `proxy()` returns must carry the CSP nonce via the existing `withCsp()` helper — redirects included, not just pass-through.
- Query strings must survive the hop (`url.search = request.nextUrl.search`), matching the existing `/category/occ` and `/collections/trocars-trocar-kits` rules.
- No live Storefront API / network calls from `proxy.ts` — it is Edge middleware and today has zero external data fetching; this fix must stay registry-only (`CATEGORY_TREE_L1`, a static in-repo constant).
- `npm test` must stay at 100% passing and `npx tsc --noEmit` clean, matching this branch's existing zero-regression bar (`docs/launch/2026-08-20-final-qa-evidence.md`).

---

### Task 1: Generalize the `/collections/<handle>` redirect in `proxy.ts`

**Files:**
- Modify: `proxy.ts:1-6` (imports), `proxy.ts:263-273` (removes the single-collection special case, replaced by the new generic function + call site)
- Test: `__tests__/proxy.test.ts:380-393` (the two existing trocars-collection tests move into a new, dedicated describe block alongside new coverage)

**Interfaces:**
- Consumes: `CATEGORY_TREE_L1: readonly L1CategoryDef[]` and `getCategorySlug(l1: Pick<L1CategoryDef, 'collectionHandle'>): string`, both already exported from `lib/category-tree.ts` (no changes to that file).
- Produces: `redirectLegacyCollectionUrl(pathname: string, request: NextRequest, nonce: string): Response | null`, a new (unexported, module-private) function in `proxy.ts`, called from `proxy()` the same way `redirectLegacyProductHandle()` already is.

- [ ] **Step 1: Write the failing tests**

Open `__tests__/proxy.test.ts`. Delete the two existing tests at lines 380-392 (`'redirects the legacy Shopify collection URL...'` and `'redirects a nested path beneath the legacy collection URL...'`) from inside the `describe('proxy — new 301 entries (backlink recovery)', ...)` block — they move into a new block below, alongside new coverage for the generalized behavior. Add this new `describe` block immediately after that one closes (i.e. right before `describe('proxy — path normalization (pass-through for unknown)', ...)` which currently starts at line 395):

```ts
describe('proxy — legacy Shopify /collections/<handle> → /category/<slug> (2026-08-21 audit Finding 3)', () => {
  it('redirects the legacy Shopify collection URL to the canonical category route, preserving query params', () => {
    const res = proxy(req('/collections/trocars-trocar-kits', '?variant=51633171923177'))
    expect(res?.status).toBe(301)
    const location = new URL(res!.headers.get('Location')!)
    expect(location.pathname).toBe('/category/trocars-trocar-kits')
    expect(location.searchParams.get('variant')).toBe('51633171923177')
  })

  it('redirects a nested path beneath the legacy collection URL in a single hop', () => {
    const res = proxy(req('/collections/trocars-trocar-kits/some-product'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/trocars-trocar-kits/some-product')
  })

  it('redirects a plain collection handle that matches its own canonical slug', () => {
    const res = proxy(req('/collections/gloves'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/gloves')
  })

  it('resolves a tag-name collection URL to its divergent canonical slug (Apparel: tag "apparel", collection "capes-gowns")', () => {
    const res = proxy(req('/collections/apparel'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/capes-gowns')
  })

  it('resolves the raw collection-handle form of the same divergent category', () => {
    const res = proxy(req('/collections/capes-gowns'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/capes-gowns')
  })

  it('resolves Face Masks through the existing face-coverings → face-masks canonical slug mapping', () => {
    const res = proxy(req('/collections/face-masks'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/face-masks')
  })

  it('preserves query params on a fresh (non-trocars) collection redirect', () => {
    const res = proxy(req('/collections/gloves', '?sort_by=price-ascending'))
    expect(res?.status).toBe(301)
    const location = new URL(res!.headers.get('Location')!)
    expect(location.pathname).toBe('/category/gloves')
    expect(location.searchParams.get('sort_by')).toBe('price-ascending')
  })

  it('redirects /collections/occ to the single canonical OCC route, mirroring /category/occ', () => {
    const res = proxy(req('/collections/occ'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/solutions/occ')
  })

  it('does NOT guess a redirect for a subcategory-level Shopify collection not in the L1 registry', () => {
    expectPassThrough(proxy(req('/collections/25g-hypodermic-needles')))
  })
})
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: the two relocated trocars tests still PASS (behavior unchanged so far — the old special-cased block is still in place). The 6 new tests (`gloves`, `apparel`→`capes-gowns`, `capes-gowns`, `face-masks`, query-preservation, `occ`) FAIL — none of those paths are handled yet. The final "does NOT guess" test passes trivially (everything currently falls through to pass-through) — that's expected; it becomes a real regression guard once Step 3 lands.

- [ ] **Step 3: Add the import**

In `proxy.ts`, add to the top-of-file imports (after the existing `productRedirects` import at line 3):

```ts
import { CATEGORY_TREE_L1, getCategorySlug, type L1CategoryDef } from '@/lib/category-tree'
```

- [ ] **Step 4: Add the lookup table and the matcher function**

In `proxy.ts`, add this immediately after the `LEGACY_PRODUCT_HANDLES` block (after line 41, before the `redirectLegacyProductHandle` function):

```ts
// ─── Legacy Shopify /collections/<handle> URLs → canonical /category/<slug> ──
//
// Shopify's own auto-generated sitemap (sitemap_collections_N.xml, distinct
// from this app's app/sitemap.ts) still lists /collections/<handle> URLs;
// external backlinks use them too. This app only ever serves /category/<slug>
// (2026-08-21 SEO audit triage, Finding 3). Keyed by BOTH `tag` and
// `collectionHandle` because the live crawl hit both forms for the same
// category (e.g. /collections/apparel AND /collections/capes-gowns both
// resolve to the one Apparel page) — resolving through getCategorySlug()
// rather than a raw rename is what correctly sends the "apparel" tag-name
// hit to /category/capes-gowns instead of a nonexistent /category/apparel
// (see lib/category-tree.ts's own doc comment on getCategorySlug, and the
// 2026-08-12 audit's Finding F3 for why a naive rename is the wrong fix here).
// Generalizes (and replaces) the single hand-written trocars-trocar-kits
// rule this file carried since 2026-08-18.
const L1_BY_LEGACY_COLLECTION_HANDLE = new Map<string, L1CategoryDef>()
for (const l1 of CATEGORY_TREE_L1) {
  L1_BY_LEGACY_COLLECTION_HANDLE.set(l1.collectionHandle, l1)
  L1_BY_LEGACY_COLLECTION_HANDLE.set(l1.tag, l1)
}

function redirectLegacyCollectionUrl(pathname: string, request: NextRequest, nonce: string): Response | null {
  const match = pathname.match(/^\/collections\/([^/]+)(\/.*)?$/)
  if (!match) return null
  const [, handle, rest] = match

  // OCC is browsed like a category but has one canonical route outside
  // /category/*, same decision the existing /category/occ rule below encodes.
  if (handle === 'occ') {
    const url = new URL('/solutions/occ', request.url)
    url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }

  const l1 = L1_BY_LEGACY_COLLECTION_HANDLE.get(handle)
  if (!l1) return null // subcategory-level collection — not resolved here, see Global Constraints

  const url = new URL(`/category/${getCategorySlug(l1)}${rest ?? ''}`, request.url)
  url.search = request.nextUrl.search
  return withCsp(NextResponse.redirect(url, 301), nonce)
}
```

- [ ] **Step 5: Wire the function into `proxy()` and remove the old special case**

In `proxy.ts`, delete the old hand-written block (currently lines 263-273):

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

Replace it with:

```ts
  // ── /collections/<handle> → /category/<slug> (2026-08-21 audit Finding 3) ──
  const legacyCollectionRedirect = redirectLegacyCollectionUrl(pathname, request, nonce)
  if (legacyCollectionRedirect) return legacyCollectionRedirect
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: all tests in the file PASS, including all 9 tests in the new `describe('proxy — legacy Shopify /collections/<handle> → /category/<slug>...')` block.

- [ ] **Step 7: Run the full test suite and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: both clean — same 1514/1514 (or current total) passing, zero type errors. This confirms nothing else in the app (sitemap generation, nav building, etc.) depended on the removed block's exact code shape rather than its behavior.

- [ ] **Step 8: Commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "fix(redirects): generalize /collections/<handle> -> /category/<slug> beyond trocars-trocar-kits"
```

---

## Out of scope (explicitly, not an oversight)

- The ~660 non-L1 subcategory/attribute-level Shopify collection handles found in the audit (e.g. `/collections/25g-hypodermic-needles`, `/collections/wheelchairs`, `/collections/10-panel-drug-tests`) are NOT redirected by this plan. Resolving them correctly requires live product-tag data (which L1/L2 a given collection's products actually belong to) that `proxy.ts` cannot look up without a network call — this needs a separate, data-driven pass, not a guess. Flagged in `docs/audits/2026-08-21-seo-audit-triage.md`, Finding 3.
- Findings 1 and 2 of the same triage doc (apex↔www redirect direction; `www` serving sitewide `noindex,nofollow`) are domain/environment configuration, not code, and are being handled separately.
- Finding 4 (orphan legacy product URLs) is a data-diff-then-decide task, not covered here.
