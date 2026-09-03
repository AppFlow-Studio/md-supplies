# DEV-FAV-01 — Customer Favorites: datastore, authorization, verification

Supersedes the earlier P3 "heart button" item (post-launch local-UI-only
scope). Implemented as a durable, account-linked customer feature per the
Sep 1 client meeting.

**Baseline:** `catalog-cro-review` branch, built on `origin/main` @ `59e6a79`.

## Datastore

Favorites are **not** a new datastore. They reuse the exact architecture
DEV-LAUNCH-10 already established for account-linked customer data (the RX
prescription gate, `lib/shopify/admin.ts`): a **Shopify Admin API customer
metafield**, written through a narrowly-scoped Admin token
(`lib/shopify/admin-token.ts`, client-credentials, customers read/write
only). No new service, no new session/auth mechanism, no local database.

- **Client:** `lib/shopify/favorites-admin.ts` — deliberately a *separate*
  Admin client from `lib/shopify/admin.ts`'s RX client (that file's own
  comment: "new Admin needs get their own review, not a ride on this
  client"). Same credential, same shop-identity guard
  (`assertAuthenticatedShopIdentity`, refuses to write if the token doesn't
  authenticate against the allowed shop — QA/production isolation), separate
  request path.
- **Metafield:** `favorites.items` on the `Customer` object, type `json`.
  One metafield holds the whole list — Shopify has no atomic list-mutation
  primitive for `json` metafields, so every write is read-modify-write
  (see "Concurrency" below).
- **Record shape** (`FavoriteRecord`):
  ```ts
  { productId: string; variantId: string | null; createdAt: string; updatedAt?: string }
  ```
  Deliberately minimal, per the ticket's data-model requirement: stable
  Shopify GIDs only. **Title, price, and image are never stored** — the
  account Favorites view resolves them live from `productId` through
  `GET_PRODUCTS_BY_IDS` (`lib/shopify/queries/products.ts`), which reuses
  the exact same `PRODUCT_CARD_FRAGMENT` every collection/search grid uses.
  Pricing/purchasability can never disagree with the rest of the site
  because it is never computed a second time.
- **Identifiers:** product-level (Shopify Product GID), not variant-level —
  this catalog's product experience (PDP, cards, quick add) centers on the
  product with a variant *selector*, not variant-scoped browsing, so
  favoriting follows the product. `variantId` is still recorded (the
  variant selected/visible at favorite time) for future use, but is never
  required for uniqueness or rendering.

## Authorization

- Every read and write goes through server-only code
  (`app/actions/favorites.ts`, `'use server'`) that derives the customer
  from the existing OAuth session (`getSession()` → `customerFetch` against
  the Shopify Customer Account API), **never from a client-supplied customer
  ID**. A request cannot address another customer's favorites by changing an
  ID, because no ID is ever accepted from the client for *whose* favorites
  to touch — only the ID of the product being (un)favorited.
- Unauthenticated access: `toggleFavorite`/`removeFavoriteAction` return
  `{ ok: false }` immediately (no Admin API call at all) when there's no
  session. `getFavoritedProductIds`/`getAccountFavorites` return an empty
  result for a guest, same way.
- CSRF: Server Actions carry Next.js's framework-level Origin/Host check
  (see `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
  "Security") — no bespoke CSRF token needed, matching every other mutation
  in `app/actions/*` (cart, RX upload).
- Analytics never carries a customer ID (`lib/analytics/events.ts`'s
  `buildFavoriteEvent` — `item_id` is the public product GID, same field
  every other GA4 item event already sends).

## Concurrency / idempotency

`lib/shopify/favorites-admin.ts`:
- `addCustomerFavorite`: reads the current list first; a product already
  present is a no-op (no second record, no Admin write at all — verified in
  `lib/shopify/__tests__/favorites-admin.test.ts`).
- `removeCustomerFavorite`: symmetric no-op when the product isn't present.
- The shop-identity guard only runs immediately before an actual write, so
  a duplicate add/remove costs one read and nothing else.
- Client-side, `FavoriteButton` disables itself while a toggle is in flight
  (`useTransition`), and Next.js serializes Server Action dispatch per
  client, so a rapid double-click cannot fire two overlapping toggles from
  one tab.
- **Known limit:** two *different* tabs/devices toggling the same product
  within the same read-modify-write window could race (last write wins).
  Given this is a personal watch-list feature (not inventory/payment state),
  this is an accepted trade-off rather than a blocker — the same
  read-modify-write shape already ships for the RX metafield.

## Guest flow (heart click before login)

1. `FavoriteButton` (signed out) renders as an `<a href="/api/auth/login?…">`
   (full-page nav, same reason the existing Log In/Create Account links on
   the account page are `<a>` — a client-side transition would not carry
   OAuth cookies), carrying `favoriteProductId`, `favoriteVariantId`, and
   `next` (the PDP path) as query params.
2. `app/api/auth/login/route.ts` reads those params **once** and moves them
   into a short-lived (`maxAge: 600s`), `httpOnly`, `sameSite: lax` cookie
   (`SESSION_COOKIES.PENDING_FAVORITE`) — never through the OAuth
   authorize/token round trip itself, and `next` is validated by
   `lib/safe-redirect.ts`'s `safeNextPath` (already used by the token-refresh
   route) before being stored, closing the open-redirect angle.
3. Customer completes the existing hosted Shopify login/create-account flow
   unmodified.
4. `app/api/auth/callback/route.ts`, after a successful token exchange,
   reads and deletes the pending cookie, resolves the customer ID, and
   calls `addCustomerFavorite` (best-effort — a failure here never blocks
   login; the visitor is still signed in and can just click the heart
   again).
5. The browser is redirected to the stored `next` path (the PDP, or
   `/account`), where the heart already renders **filled** because
   `isFavorited` is recomputed server-side from the customer's real data on
   that render — no client-side flag/toast needed to "show the saved
   state."

No sensitive data ever appears in a query string beyond a public product ID
— the same class of data already visible in every `/product/<handle>` URL.

## Product lifecycle edge cases

`GET_PRODUCTS_BY_IDS` (`nodes(ids:)`) returns `null` for anything the
Storefront API can no longer resolve. The Storefront API does not
distinguish "deleted" from "unpublished/archived" in that response, so both
are handled by the same documented rule: **suppressed from the account
Favorites list, and pruned from the stored record**
(`pruneCustomerFavorites`, best-effort, only writes when something actually
changed). A sold-out product is not an orphan — it still resolves, and its
real `availableForSale` is shown honestly via the same `ShopifyProductCard`
every other grid uses (no separate "in stock" claim). A handle change is a
non-issue by construction: the stored key is the product GID, and
`GET_PRODUCTS_BY_IDS` resolves to whatever the *current* canonical handle
is. Product consolidation/replacement (a separate "moved" product) has no
data source in this Storefront API to detect safely, so it is deliberately
**not** attempted — an old favorite for a replaced product simply becomes an
orphan and is pruned, rather than being silently re-pointed at a guess.

## Performance

- Card/search/PDP surfaces fetch the customer's favorited product-ID set
  **once per page** (`getFavoritedProductIds()`, one metafield read) and
  thread it down as a `Set` — never one request per card (see
  `CategoryResults.tsx`, `app/search/page.tsx`,
  `app/product/[slug]/page.tsx`). This is the same batching shape
  `reviewSummaries` already uses on the same grids.
- A guest never touches the Admin API: `getSession()` is a cookie read only,
  checked before any Admin call, on every surface.

## Surfaces implemented

- PDP (`components/product/ProductView.tsx`, next to the title).
- Category and search-result cards — both render through the single shared
  `ShopifyProductCard` (`components/store/ShopifyProductCard.tsx`), so this
  is one implementation point, not three. `favoritedProductIds`/`isSignedIn`
  are optional props: any other `ShopifyProductCard` call site (partner
  listings, industry pages, homepage) that hasn't been wired up simply
  doesn't render the heart — zero risk of a half-authenticated state
  elsewhere.
- Account Favorites page: `/account/favorites`
  (`app/(noindex)/account/favorites/page.tsx`), linked from a new stat tile
  on the account dashboard. Reuses `ProductGrid`/`ShopifyProductCard`
  directly, so image/title/price/availability/PDP-link/quick-add are never a
  second implementation.

## Out of scope (per ticket)

Reviews (`DEV-REVIEWS-01`), marketing-email automation, and any redesign of
the Customer Account system are untouched.

## Testing

- `lib/shopify/__tests__/favorites-admin.test.ts` — idempotent add/remove,
  shop-identity gate, orphan pruning, malformed-metafield safety.
- `app/actions/__tests__/favorites.test.ts` — guest cost avoidance, toggle
  add/remove, orphan drop + prune wiring, Storefront-failure degradation.
- `components/product/__tests__/FavoriteButton.test.tsx` — guest handoff
  link/analytics, accessible labels + `aria-pressed`, optimistic
  update+confirm, rollback on failure, duplicate-click guard.
- `app/api/auth/__tests__/login.test.ts` /
  `app/api/auth/__tests__/callback.test.ts` — pending-cookie handoff,
  open-redirect guard, best-effort failure isolation from login itself.
- Existing suites updated only where they now exercise `getSession()`
  through a page that previously didn't call it
  (`app/search/__tests__/page.test.ts`,
  `components/category/__tests__/CategoryResults.test.tsx`,
  `app/product/__tests__/variant-schema.test.ts`) — each stubs a
  signed-out session, since favorites state isn't what those suites cover.
- Full suite green: `npx vitest run` — 176 files / 1928 tests.

Not covered: a Playwright e2e recording of the full guest → login →
saved-action browser flow (would need a live/mocked Shopify OAuth
provider). The unit/integration tests above cover the same flow's server
logic (cookie set → cookie consumed → redirect) directly.
