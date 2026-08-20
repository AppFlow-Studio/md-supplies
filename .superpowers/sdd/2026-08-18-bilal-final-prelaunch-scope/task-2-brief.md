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

