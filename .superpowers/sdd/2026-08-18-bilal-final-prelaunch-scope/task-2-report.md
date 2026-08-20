# Task 2 Report: Redirect legacy `/collections/trocars-trocar-kits` URL

## What I implemented

Added a dedicated `if` block in `proxy.ts`, placed right after the existing OCC redirect block (before the "Category query variants" comment), following the exact same pattern:

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

This is a dedicated block (not a `REDIRECT_ENTRIES` table row) because the flat 301 table doesn't preserve query strings — matching the brief's rationale and the existing OCC redirect (`proxy.ts:220-224`) as the precedent. It also handles the nested-subtree case (`pathname.startsWith(...)`) the same way the face-coverings redirect does, in case any `/collections/trocars-trocar-kits/<product>` links exist.

Both `withCsp(...)` wrapping and `nonce` threading match every other branch in `proxy()`.

## What I tested and test results

Read `__tests__/proxy.test.ts` fully first to learn its established pattern: tests use a local `req(pathname, search, existingCookies)` helper (not a raw `new NextRequest(...)` construction as the brief's sketch suggested) that builds a mock `NextRequest`-shaped object. I used that helper rather than inventing a second construction style.

Added two tests to the `proxy — new 301 entries (backlink recovery)` describe block (same block as the face-coverings redirect, since this is the same category of legacy-URL backlink recovery):

1. `redirects the legacy Shopify collection URL to the canonical category route, preserving query params` — asserts 301, `location.pathname === '/category/trocars-trocar-kits'`, and `variant` query param preserved.
2. `redirects a nested path beneath the legacy collection URL in a single hop` — asserts a nested path (`/collections/trocars-trocar-kits/some-product`) redirects to `/category/trocars-trocar-kits/some-product` in one hop, mirroring the face-coverings subtree test.

## TDD Evidence

**RED** — `npm test -- __tests__/proxy.test.ts` before implementation:

```
 ❯ |node| __tests__/proxy.test.ts (78 tests | 2 failed) 178ms
     × redirects the legacy Shopify collection URL to the canonical category route, preserving query params 14ms
     × redirects a nested path beneath the legacy collection URL in a single hop 2ms

AssertionError: expected 200 to be 301 // Object.is equality
- 301
+ 200
```
Failed for the right reason: no matching entry/block existed yet, so the request fell through to the pass-through branch (200, not 301).

**GREEN** — `npm test -- __tests__/proxy.test.ts` after implementation:

```
 Test Files  1 passed (1)
      Tests  78 passed (78)
```

**Full suite** — `npm test`:

```
 Test Files  146 passed (146)
      Tests  1497 passed (1497)
```
(The "Not implemented: navigation to another Document" lines are pre-existing jsdom console noise from unrelated tests, not failures.)

## Files changed

- `proxy.ts` — added the dedicated redirect block (14 lines).
- `__tests__/proxy.test.ts` — added 2 tests (14 lines) to the existing `proxy — new 301 entries (backlink recovery)` describe block.

Commit: `5333f19` — `feat(redirects): preserve legacy /collections/trocars-trocar-kits URL with a canonical 301`

## Self-review findings

- Implementation fully matches the brief's sketch; only deviation is using the file's own `req()` test helper instead of the brief's raw `NextRequest` sketch, per explicit instruction to match the existing pattern.
- Verified `pathname.startsWith('/collections/trocars-trocar-kits/')` correctly handles nested paths (added a dedicated test for this, beyond what the brief's minimal test asked for) — confirms single-hop behavior for any saved deep links, not just the bare collection URL.
- Verified query string preservation via `url.search = request.nextUrl.search`, identical to the OCC precedent.
- Confirmed `withCsp(...)` and `nonce` are threaded through exactly as every other branch does.
- No other files touched, per task scope.
- Test output is pristine (no failures, no new warnings).

## Issues or concerns

None. The implementation is a straightforward, low-risk addition following an established, already-tested pattern in the same file.
