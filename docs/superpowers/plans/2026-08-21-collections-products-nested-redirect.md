# Legacy `/collections/<c>/products/<p>` Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a URL shape `proxy.ts`'s `/collections/<handle>` redirect doesn't handle: Shopify's real product-within-collection URL, `/collections/<collection>/products/<handle>`, currently 301s to a 3-segment `/category/<slug>/products/<handle>` path this app has no route for (a second, broken hop) instead of landing on the canonical `/product/<handle>` route.

**Architecture:** One targeted addition to the existing `redirectLegacyCollectionUrl()` function in `proxy.ts` (added in the prior `2026-08-21-collections-redirect` plan): detect the literal `/products/<handle>` segment inside the part of the path after the collection handle, and — since this app has no route that preserves the collection context for a product URL — resolve the handle straight to the canonical root `/product/<handle>` route, reusing the exact same two lookup mechanisms (`PRODUCT_REDIRECTS`, `LEGACY_PRODUCT_HANDLES`) the file already uses for every other legacy product-handle redirect, rather than inventing a third resolution path. This check runs before the existing `occ`/L1-registry lookups in the same function, since it doesn't depend on the collection handle being known at all — a `/collections/<anything>/products/<handle>` hit resolves the same way regardless of whether `<anything>` is a registered category.

**Tech Stack:** Next.js middleware (`proxy.ts`, Edge runtime), Vitest (`__tests__/proxy.test.ts`).

**Spec:** No separate design doc — this gap was found during the final whole-plan code review of `docs/superpowers/plans/2026-08-21-collections-redirect.md` (commits `c817afe`/`546a284`), which explicitly confirmed it as non-regressive (inherited unchanged from the old hand-written `trocars-trocar-kits`-only rule that plan's Task 1 generalized and replaced — that old rule had exactly the same gap, just for one collection instead of 25) and recommended it as a small follow-up plan rather than folding it into that plan's fix wave. This document is that follow-up.

## Global Constraints

- Every redirect in `proxy.ts` is a single 301 hop — no chains. The new check must resolve directly to a final `/product/<handle>` target, never to an intermediate path that itself gets redirected again.
- Product handle resolution must reuse the existing `PRODUCT_REDIRECTS` and `LEGACY_PRODUCT_HANDLES` maps — do not add a third lookup mechanism or duplicate their logic.
- Every response `proxy()` returns must carry the CSP nonce via the existing `withCsp()` helper.
- Query strings must survive the hop (`url.search = request.nextUrl.search`), matching every other rule in this file.
- No live Storefront API / network calls from `proxy.ts` — registry/map-only, same as today.
- The existing, pre-existing behavior for a nested `/collections/<c>/<x>` path that does **not** carry a literal `/products/` segment (e.g. `/collections/trocars-trocar-kits/some-product` → `/category/trocars-trocar-kits/some-product`) must keep working exactly as before — this plan only adds handling for the specific `/products/<handle>` shape, it does not change the existing fallback.
- `npm test` must stay at 100% passing and `npx tsc --noEmit` clean.

---

### Task 1: Resolve the `/collections/<c>/products/<p>` shape to the canonical `/product/<p>` route

**Files:**
- Modify: `proxy.ts:65-84` (the full body of `redirectLegacyCollectionUrl`)
- Test: `__tests__/proxy.test.ts:436-449` (adds new cases to the existing `describe('proxy — legacy Shopify /collections/<handle> → /category/<slug> (2026-08-21 audit Finding 3)', ...)` block, right after the "does NOT guess" test and before the closing `})` at line 450)

**Interfaces:**
- Consumes: `PRODUCT_REDIRECTS: Map<string, string>` (`proxy.ts:23-28`, keyed by the exact legacy `/products/<handle>` path, values already rewritten to singular `/product/<canonical>`) and `LEGACY_PRODUCT_HANDLES: Map<string, string>` (`proxy.ts:38-42`, keyed by a bare handle, values a bare canonical handle) — both already defined above `redirectLegacyCollectionUrl` in the file, no new imports needed.
- Produces: no change to `redirectLegacyCollectionUrl`'s signature (`(pathname: string, request: NextRequest, nonce: string) => Response | null`) or its call site in `proxy()` (`proxy.ts:307-308`) — this task only changes the function's internal logic.

- [ ] **Step 1: Write the failing tests**

Open `__tests__/proxy.test.ts`. Inside the existing `describe('proxy — legacy Shopify /collections/<handle> → /category/<slug> (2026-08-21 audit Finding 3)', ...)` block, add these 4 tests immediately after the `'does NOT guess a redirect for a subcategory-level Shopify collection not in the L1 registry'` test (currently ending at line 438) and before the `'every L1 tag AND collection handle redirects...'` sweep test (currently starting at line 440):

```ts
  it('redirects the real Shopify product-within-collection URL shape straight to the canonical /product/<handle>, not a broken 3-segment /category/ path', () => {
    const res = proxy(req('/collections/mobility/products/some-surviving-handle-not-in-any-map'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/product/some-surviving-handle-not-in-any-map')
  })

  it('resolves a consolidated/renamed product handle nested under a collection through PRODUCT_REDIRECTS, same as the root /products/<handle> rule', () => {
    const res = proxy(req('/collections/gloves/products/8-mil-nitrile-industrial-gloves-diamond-textured-green-xl-8104'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe(
      'https://mdsupplies.com/product/8-mil-nitrile-industrial-gloves-diamond-textured-black-small-9101',
    )
  })

  it('resolves a legacy AeroWalk color handle nested under a collection through LEGACY_PRODUCT_HANDLES', () => {
    const res = proxy(req('/collections/mobility/products/aerowalk-ultra-lite-rollator-rolling-walker-blue'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/product/aerowalk-ultra-lite-rollator-rolling-walker')
  })

  it('preserves query params on a nested product-within-collection redirect', () => {
    const res = proxy(req('/collections/gloves/products/some-handle', '?variant=123'))
    expect(res?.status).toBe(301)
    const location = new URL(res!.headers.get('Location')!)
    expect(location.pathname).toBe('/product/some-handle')
    expect(location.searchParams.get('variant')).toBe('123')
  })
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: the existing test at line 392-396 (`'redirects a nested path beneath the legacy collection URL in a single hop'`, `/collections/trocars-trocar-kits/some-product` → `/category/trocars-trocar-kits/some-product`) still PASSES — it's a different URL shape (no `/products/` segment) and must be unaffected by this whole plan. The 4 new tests FAIL: the first one currently redirects to `https://mdsupplies.com/category/mobility/products/some-surviving-handle-not-in-any-map` (the bug this plan fixes) instead of the expected canonical target; the second and third currently redirect to `.../category/gloves/products/...` and `.../category/mobility/products/aerowalk-...-blue` respectively instead of resolving through the product maps; the fourth currently produces `/category/gloves/products/some-handle` instead of `/product/some-handle`.

- [ ] **Step 3: Implement the fix**

In `proxy.ts`, replace the entire body of `redirectLegacyCollectionUrl` (currently lines 65-84) with:

```ts
function redirectLegacyCollectionUrl(pathname: string, request: NextRequest, nonce: string): Response | null {
  const match = pathname.match(/^\/collections\/([^/]+)(\/.*)?$/)
  if (!match) return null
  const [, handle, rest] = match

  // Shopify's real product-within-collection URL shape
  // (/collections/<collection>/products/<handle>) carries an explicit
  // "products" segment before the handle, under ANY collection handle
  // (known L1 or not) — this app has no /category/<slug>/products/<handle>
  // route, so there is no "preserve the collection" destination to send it
  // to. Resolve the handle through the exact same chain the root
  // /products/<handle> rules already use (PRODUCT_REDIRECTS, then
  // LEGACY_PRODUCT_HANDLES, then the bare handle) and land on the canonical
  // /product/<handle> route directly — checked before the occ/registry
  // lookups below since it doesn't depend on either. (Gap found in the
  // 2026-08-21 final review of the /collections/ generalization — inherited
  // unchanged from the old trocars-only rule, not introduced by that change.)
  const productMatch = rest?.match(/^\/products\/([^/]+)$/)
  if (productMatch) {
    const productHandle = productMatch[1]
    const consolidated = PRODUCT_REDIRECTS.get(`/products/${productHandle}`)
    const renamed = LEGACY_PRODUCT_HANDLES.get(productHandle)
    const targetPath = consolidated ?? (renamed ? `/product/${renamed}` : `/product/${productHandle}`)
    const url = new URL(targetPath, request.url)
    url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: all tests in the file PASS, including the 4 new tests and the pre-existing `/collections/trocars-trocar-kits/some-product` test (unaffected).

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: both clean, 1526/1526 (or current total) passing, zero type errors.

- [ ] **Step 6: Commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "fix(redirects): resolve /collections/<c>/products/<p> to canonical /product/<p>"
```

---

## Out of scope (explicitly, not an oversight)

- A `/collections/<c>/products/<handle>` request where `<handle>` is followed by further path segments (e.g. a hypothetical `/reviews` suffix) is not specifically handled — it falls through to the existing `rest`-appending behavior unchanged, same as before this plan. No evidence of this shape in the driving audit data.
- The pre-existing, unrelated CSP-header gap in the `face-coverings` subtree redirect (`proxy.ts`, the block right after the `occ` rule) is a separate, already-flagged bug and is not touched here.
