# SEO P0 Remediation — Redirect Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every P0 (architecture/indexability/migration-blocker) item from the SEO remediation master plan that is fixable in this repo's code — restore full legacy `/collections/<handle>` coverage (a merge regression, not a gap), fix the `/bariatricproducts` redirect loop, and add a standing no-chain/no-loop regression guardrail so this class of bug (a real redirect silently dropped by a bad merge) cannot recur unnoticed.

**Architecture:** All work is in `proxy.ts` (Edge middleware) plus its test file `__tests__/proxy.test.ts`. No new routes, no Shopify Admin writes, no changes to `lib/category-tree.ts`'s registries (only consumed, never mutated). Two items from the master plan's P0 list (apex↔www redirect direction, sitewide `noindex,nofollow` on `www`) are **not** in this plan — they are Vercel/Cloudflare dashboard config, not code; see `docs/audits/2026-08-seo-remediation/BILAL-HANDOFF.md`.

**Tech Stack:** Next.js 16 Edge middleware (`proxy.ts`), Vitest (`__tests__/proxy.test.ts`), `lib/category-tree.ts` registries (read-only).

**Spec:** `docs/audits/2026-08-seo-remediation/MASTER-PLAN.md` (§§6–13, P0-01 through P0-08), verified against `docs/audits/2026-08-21-seo-audit-triage.md` and this plan's own `docs/audits/2026-08-seo-remediation/BASELINE.md`.

## Global Constraints

- Every redirect `proxy()` returns is a single 301 hop — no chains. New code must not sit behind (or feed into) another redirect branch that could double-hop it.
- Every response `proxy()` returns must carry the CSP nonce via the existing `withCsp()` helper — redirects and 410s included, not just pass-through.
- Query strings must survive every hop (`url.search = request.nextUrl.search`), matching every existing redirect rule in the file.
- No live Storefront API / network calls from `proxy.ts` — it is Edge middleware with zero external data fetching today; every new rule must be registry-only (`CATEGORY_TREE_L1`, `FEATURED_SUBCATEGORIES`, both static in-repo constants from `lib/category-tree.ts`).
- Do not redirect a legacy URL to a route that doesn't exist — every destination in this plan is a route already confirmed live in `lib/category-tree.ts` or `lib/industries.ts`.
- Do not create a blanket rewrite for subcategory-level Shopify collection handles (e.g. `/collections/25g-hypodermic-needles`) — only L1-category-level and featured-subcategory-level legacy collection URLs resolve automatically; anything else must fall through to pass-through, never a guessed 404.
- `npm test` must stay at 100% passing and `npx tsc --noEmit` clean at the end of every task, matching this branch's existing zero-regression bar (`docs/launch/2026-08-20-final-qa-evidence.md`).

---

### Task 1: Rebuild the registry-driven `/collections/<handle>` redirect

**Files:**
- Modify: `proxy.ts:1-6` (imports), `proxy.ts:51-77` (replaces the `LEGACY_COLLECTION_HANDLES` comment block, export, and `redirectLegacyCollection` function), `proxy.ts:299-300` (call site)
- Test: `__tests__/proxy.test.ts:380-436` (replaces the existing trocars/surgery-procedure-only collection tests with full registry coverage)

**Interfaces:**
- Consumes: `CATEGORY_TREE_L1: readonly L1CategoryDef[]`, `FEATURED_SUBCATEGORIES: readonly FeaturedSubcategoryDef[]`, `getCategorySlug(l1: Pick<L1CategoryDef, 'collectionHandle'>): string` — all already exported from `lib/category-tree.ts`, no changes to that file. Also consumes this file's own existing `PRODUCT_REDIRECTS: Map<string, string>` and `LEGACY_PRODUCT_HANDLES: Map<string, string>` (both already defined above this point in `proxy.ts`).
- Produces: `redirectLegacyCollectionUrl(pathname: string, request: NextRequest, nonce: string): Response | null`, replacing the current `redirectLegacyCollection`. Called from `proxy()` the same way the function it replaces is today (`proxy.ts:299`).

**Context (why this is a rebuild, not new work):** commit `213a1b6` (2026-08-21) shipped a registry-driven version of this exact redirect covering all 25 `CATEGORY_TREE_L1` entries; merge commit `e21205c` silently reverted it back to a 2-entry hand-written `Set` (`trocars-trocar-kits`, `surgery-procedure` only) when merging in a parallel branch — see `docs/audits/2026-08-seo-remediation/BASELINE.md` for the full diff evidence. That historical version also would **not** have matched `trocars-trocar-kits` (it's a `FEATURED_SUBCATEGORIES` entry, not `CATEGORY_TREE_L1` — confirmed by reading `lib/category-tree.ts:169-184` and `getCategorySlug`'s implementation, which special-cases only `face-coverings`→`face-masks`). This task does not blindly restore `213a1b6` — it writes fresh tests that cover the case the historical version missed, then implements against them.

- [ ] **Step 1: Write the failing tests**

Open `__tests__/proxy.test.ts`. Delete lines 380–436 (the block from `it('redirects the legacy Shopify collection URL...'` through the `it('never redirects the canonical destinations back out (no loop)'` block, inclusive — everything between the `row 24` test at line 378 and the closing `})` of the parent `describe` at line 437). Replace with:

```ts
  describe('legacy Shopify /collections/<handle> → /category/<slug> (registry-driven, all L1 categories + featured subcategories)', () => {
    it('redirects every L1 tag AND collection handle to that L1s canonical slug', () => {
      for (const l1 of CATEGORY_TREE_L1) {
        for (const key of [l1.tag, l1.collectionHandle]) {
          const res = proxy(req(`/collections/${key}`))
          expect(res?.status, key).toBe(301)
          expect(new URL(res!.headers.get('Location')!).pathname, key)
            .toBe(`/category/${getCategorySlug(l1)}`)
        }
      }
    })

    it('redirects a featured-subcategory collection handle to its own canonical category route', () => {
      for (const sub of FEATURED_SUBCATEGORIES) {
        for (const key of [sub.slug, sub.collectionHandle]) {
          const res = proxy(req(`/collections/${key}`))
          expect(res?.status, key).toBe(301)
          expect(new URL(res!.headers.get('Location')!).pathname, key).toBe(`/category/${sub.slug}`)
        }
      }
    })

    it('preserves the query string on an L1 collection redirect', () => {
      const res = proxy(req('/collections/gloves', '?sort_by=price-ascending'))
      expect(res?.status).toBe(301)
      const location = new URL(res!.headers.get('Location')!)
      expect(location.pathname).toBe('/category/gloves')
      expect(location.searchParams.get('sort_by')).toBe('price-ascending')
    })

    it('preserves the query string on a featured-subcategory collection redirect', () => {
      const res = proxy(req('/collections/trocars-trocar-kits', '?variant=51633171923177'))
      expect(res?.status).toBe(301)
      const location = new URL(res!.headers.get('Location')!)
      expect(location.pathname).toBe('/category/trocars-trocar-kits')
      expect(location.searchParams.get('variant')).toBe('51633171923177')
    })

    it('redirects a nested path beneath an L1 collection URL in a single hop', () => {
      const res = proxy(req('/collections/surgery-procedure/some-product'))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/surgery-procedure/some-product')
    })

    it('resolves a tag-name collection URL to its divergent canonical slug (Apparel: tag "apparel", collection "capes-gowns")', () => {
      const res = proxy(req('/collections/apparel'))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/capes-gowns')
    })

    it('resolves Face Masks through the existing face-coverings → face-masks canonical slug mapping', () => {
      const res = proxy(req('/collections/face-masks'))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/face-masks')

      const res2 = proxy(req('/collections/face-coverings'))
      expect(res2?.status).toBe(301)
      expect(res2?.headers.get('Location')).toBe('https://mdsupplies.com/category/face-masks')
    })

    it('redirects /collections/occ to the single canonical OCC route, mirroring /category/occ', () => {
      const res = proxy(req('/collections/occ'))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/solutions/occ')
    })

    it('does NOT guess a redirect for a subcategory-level Shopify collection not in either registry', () => {
      expectPassThrough(proxy(req('/collections/25g-hypodermic-needles')))
    })

    it('stamps CSP on collection redirects like every other response path', () => {
      for (const path of ['/collections/surgery-procedure', '/collections/trocars-trocar-kits', '/collections/gloves']) {
        const res = proxy(req(path))
        expect(res?.headers.get('Content-Security-Policy'), path).toBeTruthy()
      }
    })

    it('never redirects the canonical destinations back out (no loop)', () => {
      for (const l1 of CATEGORY_TREE_L1) {
        expectPassThrough(proxy(req(`/category/${getCategorySlug(l1)}`)))
      }
      for (const sub of FEATURED_SUBCATEGORIES) {
        expectPassThrough(proxy(req(`/category/${sub.slug}`)))
      }
    })
  })

  describe('legacy /collections/<collection>/products/<handle> → canonical /product/<handle> (single hop, any collection)', () => {
    it('resolves a product nested under an L1 collection handle to its canonical /product/ route', () => {
      const res = proxy(req('/collections/gloves/products/nitrile-exam-gloves-powder-free'))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/product/nitrile-exam-gloves-powder-free')
    })

    it('resolves a product nested under an UNKNOWN collection handle too (the collection segment is discarded, not validated)', () => {
      const res = proxy(req('/collections/25g-hypodermic-needles/products/some-handle'))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/product/some-handle')
    })

    it('routes a consolidated/renamed product handle through the existing PRODUCT_REDIRECTS map, not a naive rename', () => {
      const [{ from }] = PRODUCT_ROWS
      const handle = from.replace(/^\/products\//, '')
      const expected = PRODUCT_REDIRECTS_FOR_TEST.get(from)!
      const res = proxy(req(`/collections/gloves/products/${handle}`))
      expect(res?.status).toBe(301)
      expect(new URL(res!.headers.get('Location')!).pathname).toBe(expected)
    })

    it('resolves a legacy AeroWalk color handle nested under a collection in one hop', () => {
      const res = proxy(req('/collections/mobility/products/aerowalk-ultra-lite-rollator-rolling-walker-blue'))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/product/aerowalk-ultra-lite-rollator-rolling-walker')
    })

    it('preserves the query string on a nested product redirect', () => {
      const res = proxy(req('/collections/gloves/products/nitrile-exam-gloves-powder-free', '?variant=123'))
      expect(res?.status).toBe(301)
      const location = new URL(res!.headers.get('Location')!)
      expect(location.searchParams.get('variant')).toBe('123')
    })
  })
```

Add these two imports at the top of `__tests__/proxy.test.ts`, alongside the existing `productRedirects` import (after line 32):

```ts
import { CATEGORY_TREE_L1, FEATURED_SUBCATEGORIES, getCategorySlug } from '@/lib/category-tree'
```

And add this helper right after the `PRODUCT_ROWS` constant (after line 34) — it mirrors the exact `to.replace(...)` rewrite `proxy.ts` itself applies to `docs/redirects-ready.json`, so the "routes a consolidated/renamed product handle" test above asserts against the same transformed value the app actually serves, not the raw JSON:

```ts
const PRODUCT_REDIRECTS_FOR_TEST = new Map<string, string>(
  PRODUCT_ROWS.map(({ from, to }) => [from, to.replace(/^\/products\//, '/product/')]),
)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: the new "registry-driven, all L1 categories" tests FAIL for every L1 handle except `surgery-procedure` (still hand-written) — `gloves`, `wound-care`, `apparel`, etc. all currently pass through instead of redirecting. The nested `/collections/<c>/products/<p>` tests all FAIL (that resolver doesn't exist yet on this branch). The featured-subcategory and OCC tests continue to PASS (already handled by existing code paths).

- [ ] **Step 3: Add the imports**

In `proxy.ts`, add to the top-of-file imports (after the existing `productRedirects` import at line 3):

```ts
import { CATEGORY_TREE_L1, FEATURED_SUBCATEGORIES, getCategorySlug } from '@/lib/category-tree'
```

- [ ] **Step 4: Replace `LEGACY_COLLECTION_HANDLES` + `redirectLegacyCollection` with the registry-driven version**

In `proxy.ts`, delete the existing block at lines 51–77 (from the `// ─── Legacy /collections/<handle> URLs (P0.7) ───` comment through the closing `}` of `redirectLegacyCollection`) and replace it with:

```ts
// ─── Legacy Shopify /collections/<handle> URLs → canonical /category/<slug> ──
//
// Shopify's own auto-generated sitemap (sitemap_collections_N.xml, distinct
// from this app's app/sitemap.ts) still lists /collections/<handle> URLs for
// every live collection; external backlinks use them too. This app only
// ever serves /category/<slug> (2026-08-21 SEO audit triage, Finding 3).
// Keyed by BOTH `tag` and `collectionHandle` for every CATEGORY_TREE_L1 row
// (e.g. /collections/apparel AND /collections/capes-gowns both resolve to
// the one Apparel page) — resolved through getCategorySlug() rather than a
// raw rename, so the tag-name hit correctly lands on /category/capes-gowns
// instead of a nonexistent /category/apparel (2026-08-12 audit Finding F3).
// Featured subcategories (Trocars & Trocar Kits today) get their own entry
// keyed by both `slug` and `collectionHandle` — they are NOT CATEGORY_TREE_L1
// members (lib/category-tree.ts's own doc comment on FEATURED_SUBCATEGORIES
// explains why), so they need a second source, not a special case bolted onto
// the L1 loop.
//
// 2026-08-24: this registry-driven map previously existed (commit 213a1b6)
// and was silently reverted to a 2-entry hand-written Set by a bad merge
// resolution (e21205c) — see docs/audits/2026-08-seo-remediation/BASELINE.md.
// The no-chain/no-loop sweep test in this file's "global no-chain guardrail"
// describe block exists specifically so that class of regression fails CI
// immediately instead of silently shipping again.
const LEGACY_COLLECTION_SLUG_BY_HANDLE = new Map<string, string>()
for (const l1 of CATEGORY_TREE_L1) {
  const slug = getCategorySlug(l1)
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(l1.tag, slug)
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(l1.collectionHandle, slug)
}
for (const sub of FEATURED_SUBCATEGORIES) {
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(sub.slug, sub.slug)
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(sub.collectionHandle, sub.slug)
}

function redirectLegacyCollectionUrl(pathname: string, request: NextRequest, nonce: string): Response | null {
  const match = pathname.match(/^\/collections\/([^/]+)(\/.*)?$/)
  if (!match) return null
  const [, handle, rest] = match

  // Shopify's real product-within-collection URL shape
  // (/collections/<any-handle>/products/<handle>) carries an explicit
  // "products" segment before the handle, under ANY collection handle
  // (registered or not) — this app has no /category/<slug>/products/<handle>
  // route, so there is no "preserve the collection" destination to send it
  // to. Resolve the product handle through the same maps the root
  // /products/<handle> rules use (PRODUCT_REDIRECTS, then
  // LEGACY_PRODUCT_HANDLES, then the bare handle) and land on the canonical
  // /product/<handle> route directly, in ONE hop — checked before the L1/
  // featured-subcategory/OCC lookups below since it doesn't depend on any of
  // them.
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
  // /category/*, the same decision the existing /category/occ rule below
  // encodes.
  if (handle === 'occ') {
    const url = new URL('/solutions/occ', request.url)
    url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }

  const slug = LEGACY_COLLECTION_SLUG_BY_HANDLE.get(handle)
  if (!slug) return null // subcategory-level collection — not resolved here, see Global Constraints

  const url = new URL(`/category/${slug}${rest ?? ''}`, request.url)
  url.search = request.nextUrl.search
  return withCsp(NextResponse.redirect(url, 301), nonce)
}
```

- [ ] **Step 5: Update the call site**

In `proxy.ts`, find the call site (around line 299, in the `// ── /collections/<handle> → /category/<handle> ──` section of `proxy()`). Replace:

```ts
  const collectionRedirect = redirectLegacyCollection(pathname, request, nonce)
  if (collectionRedirect) return collectionRedirect
```

with:

```ts
  const collectionRedirect = redirectLegacyCollectionUrl(pathname, request, nonce)
  if (collectionRedirect) return collectionRedirect
```

Update the comment block immediately above this call site to describe the registry-driven behavior instead of the old Set-based one (the existing comment references "adding a collection is a one-line change to that set" — no longer true; replace with a one-line note that coverage is now driven by `lib/category-tree.ts` directly, so a new L1 or featured subcategory needs no change here).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: PASS, full file.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no errors).

- [ ] **Step 8: Commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "fix(redirects): restore registry-driven /collections/<handle> coverage lost in e21205c merge

Commit 213a1b6 shipped a full 25-category registry-driven redirect for
/collections/<handle> -> /category/<slug>; merge e21205c silently reverted
it to a 2-entry hand-written Set. Rebuilds it (TDD, not restored verbatim)
covering both CATEGORY_TREE_L1 and FEATURED_SUBCATEGORIES, plus the nested
/collections/<any>/products/<handle> -> /product/<handle> resolver from
the same lost commit."
```

---

### Task 2: Fix the `/bariatricproducts` redirect loop

**Files:**
- Modify: `proxy.ts:107-187` (`REDIRECT_ENTRIES` array)
- Test: `__tests__/proxy.test.ts` (new test in the `describe('proxy — new 301 entries (backlink recovery)', ...)` block, near the other hub-page 301 entries)

**Context:** `Error-Redirect_loop.csv` (2026-08-21 audit) shows `https://www.mdsupplies.com/bariatricproducts` looping: `mdsupplies.com/bariatricproducts` (308) → `www.mdsupplies.com/bariatricproducts` (301) → back to `mdsupplies.com/bariatricproducts` (308), 8,130 inlinks. `/bariatricproducts` is not handled anywhere in `proxy.ts` today — it falls through to pass-through, which is what's hitting the apex↔www loop (Task/finding owned by Bilal — see `BILAL-HANDOFF.md`). A live `Bariatric` L1 category exists (`lib/category-tree.ts:127`, tag `bariatric`, collection handle `bariatric`, route `/category/bariatric`) — that's the correct one-hop destination, matching the master plan's own guidance (§8: "If the intended destination is the Bariatric category, link directly to the final category URL"). This is independent of the apex/www fix: once Bilal's fix lands, a bare `/bariatricproducts` hit on the (now-correct) primary host still needs somewhere to go, and this makes it a real, direct 301 instead of a 404 or a second loop.

**Interfaces:**
- Consumes: nothing new — a plain entry in the existing `REDIRECT_ENTRIES: RedirectEntry[]` array.
- Produces: nothing new — no new exports.

- [ ] **Step 1: Write the failing test**

In `__tests__/proxy.test.ts`, inside `describe('proxy — new 301 entries (backlink recovery)', ...)`, add (near the other hub-page 301 tests, e.g. after the `Medical-Supply-Store.html` test):

```ts
  it('redirects the legacy /bariatricproducts vanity URL to the Bariatric category (2026-08-21 audit: Error-Redirect_loop.csv)', () => {
    const res = proxy(req('/bariatricproducts'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/bariatric')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/proxy.test.ts -t bariatricproducts`
Expected: FAIL — `/bariatricproducts` currently passes through (200, no `Location` header).

- [ ] **Step 3: Add the redirect entry**

In `proxy.ts`, add to `REDIRECT_ENTRIES` (in the "Category / hub pages" group, alongside `/Medical-Supply-Store.html` and `/all-categories.html`):

```ts
  { from: '/bariatricproducts',                                                                     to: '/category/bariatric',                             status: 301 },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/proxy.test.ts -t bariatricproducts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "fix(redirects): resolve /bariatricproducts vanity URL to /category/bariatric

Closes the Error-Redirect_loop.csv finding from the 2026-08-21 audit — the
URL had no destination in proxy.ts at all and was falling into the apex/www
host loop (a separate, infra-side fix — see BILAL-HANDOFF.md). This makes
the app-side hop correct regardless of host-redirect direction."
```

---

### Task 3: Global no-chain / no-loop regression guardrail

**Files:**
- Modify: `__tests__/proxy.test.ts` (new `describe` block, placed after the `'proxy — full product redirect map (programmatic sweep)'` block)

**Context:** Task 1 exists because a real, tested redirect silently vanished in a merge with nothing catching it. Master plan §28 asks for exactly this class of test ("no loop", "no chain > 1"). This task adds one general-purpose sweep, independent of any single redirect rule, so a future merge/rebase that drops or breaks a redirect target fails `npm test` immediately instead of shipping silently.

**Interfaces:**
- Consumes: `REDIRECT_ENTRIES` (already exported from `proxy.ts`), `PRODUCT_REDIRECTS_FOR_TEST` (from Task 1, Step 1), `LEGACY_COLLECTION_SLUG_BY_HANDLE` is NOT exported (module-private by design) — this test re-derives the same target set from `CATEGORY_TREE_L1`/`FEATURED_SUBCATEGORIES` directly rather than reaching into `proxy.ts` internals, so it's testing the same observable behavior Task 1's own tests already assert, from a different angle (breadth, not one rule at a time).
- Produces: nothing — test-only.

- [ ] **Step 1: Write the test**

In `__tests__/proxy.test.ts`, add after the `describe('proxy — full product redirect map (programmatic sweep)', ...)` block closes:

```ts
describe('proxy — global no-chain / no-loop guardrail (regression: e21205c silently dropped a working redirect)', () => {
  it('every static REDIRECT_ENTRIES 301 target is not itself a redirect source (one hop only)', () => {
    for (const entry of REDIRECT_ENTRIES) {
      if (entry.status !== 301) continue
      const targetPath = new URL(entry.to, 'https://mdsupplies.com').pathname
      expectPassThrough(proxy(req(targetPath)))
    }
  })

  it('every L1 category canonical route is not itself a redirect source', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      expectPassThrough(proxy(req(`/category/${getCategorySlug(l1)}`)))
    }
  })

  it('every featured-subcategory canonical route is not itself a redirect source', () => {
    for (const sub of FEATURED_SUBCATEGORIES) {
      expectPassThrough(proxy(req(`/category/${sub.slug}`)))
    }
  })

  it('a sample of consolidated product-redirect targets are not themselves redirect sources', () => {
    // Full 1,285-row sweep already exists in the 'programmatic sweep' block
    // above; this re-checks a bounded sample here so the guardrail block
    // stays fast and legible as one file, not a duplicate of that sweep.
    for (const { from } of PRODUCT_ROWS.slice(0, 50)) {
      const target = PRODUCT_REDIRECTS_FOR_TEST.get(from)!
      expectPassThrough(proxy(req(target)))
    }
  })
})
```

- [ ] **Step 2: Run the full suite**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: PASS, full file (these assertions should already hold given Tasks 1–2 — this step is confirming the guardrail is correct, not fixing new failures. If anything fails here, it means a redirect destination in `REDIRECT_ENTRIES`, the L1 registry, or the featured-subcategory registry is itself a broken/looping target — stop and fix the underlying entry before continuing, do not weaken the test).

- [ ] **Step 3: Commit**

```bash
git add __tests__/proxy.test.ts
git commit -m "test(proxy): add global no-chain/no-loop regression guardrail

General-purpose sweep over REDIRECT_ENTRIES, the L1 category registry, and
the featured-subcategory registry — catches the class of bug Task 1 fixed
(a real redirect silently dropped by a merge) at the CI/test layer instead
of only in a manual audit."
```

---

### Task 4: Final status update

**Files:**
- Modify: `docs/audits/2026-08-seo-remediation/BASELINE.md` (append a "Resolved this plan" section)
- Create: `docs/audits/2026-08-seo-remediation/FINAL-RESULTS.md`

- [ ] **Step 1: Run full verification**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all clean. Record the actual output/pass counts in `FINAL-RESULTS.md`, not a paraphrase.

- [ ] **Step 2: Write `FINAL-RESULTS.md`**

```markdown
# P0 Remediation — Results

**Branch:** catalog-cro-review-sardor-dev
**Starting SHA:** e21205ccdf1bda800e69a4c00d2f710a3d840603
**Final SHA:** <fill in `git rev-parse HEAD` after Task 3's commit>

## What this plan fixed (code)

| Item | Before | After |
|---|---|---|
| `/collections/<handle>` L1-category coverage | 2 of 25 categories (hardcoded Set) | All 25 categories, both `tag` and `collectionHandle` forms, via `lib/category-tree.ts` registry |
| `/collections/<any>/products/<handle>` | Fell through to pass-through (404 downstream) | One-hop 301 to canonical `/product/<handle>`, routed through the existing `PRODUCT_REDIRECTS`/`LEGACY_PRODUCT_HANDLES` maps |
| `/bariatricproducts` | Unhandled — fed the apex/www redirect loop | One-hop 301 to `/category/bariatric` |
| Redirect regression coverage | Per-rule tests only | + a general no-chain/no-loop sweep over all static entries and both category registries |

## What this plan did NOT fix (not code)

Apex↔www redirect direction and sitewide `www` `noindex,nofollow` — both Vercel/Cloudflare dashboard configuration, handed off in `BILAL-HANDOFF.md`. Per the 2026-08-21 triage, these two likely explain the majority of the audit's remaining row counts; re-crawl after they land before scoping the next (P1) plan.

## Verification

<paste `npm test` / `tsc` / `lint` / `build` output summary here>

## Remaining P0 items (master plan §§6-13), not in this plan's scope

- P0-01 hostname normalization — infra (Bilal)
- P0-02 global noindex removal — infra (Bilal)
- P0-07 4XX classification — the ~8,309 broken `/cdn/shop/files/*.jpg` 404s are Shopify Files/product-image data, not app code (2026-08-21 triage, Finding 6); real page-level 404s were tied to the `/collections/` gap this plan closes — re-crawl to confirm what, if anything, remains
- Everything in master-plan P1-P3 — next plan, after a post-Bilal-fix re-crawl
```

- [ ] **Step 3: Commit**

```bash
git add docs/audits/2026-08-seo-remediation/
git commit -m "docs: P0 remediation results and status"
```
