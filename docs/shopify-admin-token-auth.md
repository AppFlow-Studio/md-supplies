# Shopify Admin API authentication — client_credentials token exchange

**Added:** DEV-LAUNCH-02 · **Files:** `lib/shopify/admin-token.ts`, `lib/shopify/admin.ts`, `lib/env.server.ts`

## The problem this solves

Shopify's QA custom app doesn't hand out a static `shpat_...` Admin API
token — the only way to get one is to trade a `client_id`/`client_secret`
pair for a token that **expires in ~24 hours** (`grant_type=client_credentials`
against `POST /admin/oauth/access_token`). A static env var can't hold
something that expires. So instead of "read a secret," the Admin path has to
"fetch and refresh a secret." That's the reason for the extra layer below —
everything else in the RX gate is unchanged.

## The four layers

```
.env.local
  SHOPIFY_ADMIN_CLIENT_ID / SHOPIFY_ADMIN_CLIENT_SECRET
        │
        ▼
lib/env.server.ts          — required() getters, throw if missing
        │
        ▼
lib/shopify/admin-token.ts — exchange + cache + refresh
        │  getAdminAccessToken() → string
        ▼
lib/shopify/admin.ts       — adminFetch() builds the actual GraphQL call,
        │                     shop-identity gate
        ▼
lib/rx-gate.ts consumers   — getCustomerRxState(), setCustomerRxDocument()
```

### 1. `lib/env.server.ts` — just validated config

```ts
get shopifyAdminClientId()     { return required('SHOPIFY_ADMIN_CLIENT_ID') },
get shopifyAdminClientSecret() { return required('SHOPIFY_ADMIN_CLIENT_SECRET') },
```

These are lazy getters — nothing throws at import time (so `next build` can
run with an empty CI env), only when something actually reads
`.shopifyAdminClientId`. This module knows nothing about tokens or expiry;
it just hands out the two raw config values.

### 2. `lib/shopify/admin-token.ts` — exchange, cache, refresh

This is where the `client_credentials` exchange happens:

```ts
const res = await fetch(`https://${serverEnv.shopifyStoreDomain}/admin/oauth/access_token`, {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: serverEnv.shopifyAdminClientId,
    client_secret: serverEnv.shopifyAdminClientSecret,
  }),
})
```

Shopify replies with `{ access_token, expires_in }`. Three behaviors sit on
top of that raw exchange, held in two module-level variables (`cached` and
`inFlight`):

- **Caching.** The token + its computed expiry timestamp is stored in
  `cached`. `getAdminAccessToken()` checks `cached.expiresAt > Date.now()`
  first — if the cached token is still good, it's returned with **zero
  network calls**. Since Shopify's token lasts ~24h, this means the exchange
  only happens roughly once a day per running process, not on every RX
  request.
- **Safety margin.** The stored expiry is `expires_in - 60` seconds, not the
  literal value. That 60-second cushion means a request that starts just
  before the "real" expiry can't have its token die mid-flight.
- **Dedup via `inFlight`.** If ten requests hit `getAdminAccessToken()` at
  once while no valid token is cached, only the *first* one starts a real
  exchange (`inFlight ??= exchangeClientCredentials()...`); the other nine
  just await that same in-flight promise instead of firing nine redundant
  exchanges. Once it resolves, `inFlight` is cleared and `cached` is
  populated for everyone after.
- **Failure isn't cached.** If the exchange throws (bad creds, network blip,
  Shopify down), `inFlight` is reset to `null` in the `.catch()` before the
  error propagates. So a transient failure doesn't wedge the process — the
  very next call tries again from scratch, rather than remembering "broken"
  forever.

### 3. `lib/shopify/admin.ts` — where the token actually gets used

`adminFetch()` does `const accessToken = await getAdminAccessToken()` before
building the request, and drops that value into `X-Shopify-Access-Token`.
This function is the single chokepoint every Admin GraphQL call goes
through.

Sitting on top of `adminFetch`, there's a second, independent safety layer —
`assertAuthenticatedShopIdentity()` — which predates this change but is
worth understanding because it composes with the token layer:

```ts
async function assertAuthenticatedShopIdentity(): Promise<void> {
  shopIdentityCheck ??= (async () => {
    const data = await adminFetch<{...}>(SHOP_IDENTITY)   // "who does this token belong to?"
    assertShopDomainAllowed(data.shop?.myshopifyDomain, ...)
  })().catch((err) => { shopIdentityCheck = null; throw err })
  return shopIdentityCheck
}
```

This asks Shopify "which shop does this token actually authenticate
against?" and checks that answer against the shop-guard allowlist
(`lib/shopify/shop-guard.ts`) — the same guard that rejects production
elsewhere in the app. The distinction from the token cache matters:
`assertShopDomainAllowed` is about **which shop** a valid credential belongs
to; `admin-token.ts` is about **whether the credential is still valid at
all**. Two different failure modes, two independent guards, same
fail-closed shape (never cache a failure, so retries can recover).

### 4. The RX gate consumers

`getCustomerRxState()` and `setCustomerRxDocument()` in `admin.ts` call
`adminFetch()` for the actual GraphQL work (reading/writing
`compliance.rx_document` and `compliance.rx_verified` customer metafields).
They never touch tokens directly — by the time a query string reaches them,
`adminFetch` has already resolved a valid token and confirmed shop identity.

## One real request, end to end

A call to `setCustomerRxDocument()` fires up to 4 fetches, in this order:

1. `POST .../admin/oauth/access_token` — **only if** no cached token
2. `POST .../admin/api/2026-04/graphql.json` — `ShopIdentity` query (cached
   in `shopIdentityCheck` after the first successful call per process)
3. `GetCustomerRxState` — read current metafields (TOCTOU check for
   `rx_verified`)
4. `metafieldsSet` — the actual write

On a warm process, steps 1 and 2 are skipped, so most calls are just step 3
→ step 4.

## Test coverage

- `lib/shopify/__tests__/admin-token.test.ts` — layer 2 in isolation
  (exchange, cache reuse, expiry-triggered refresh, concurrent dedup,
  failure-not-cached), with `env.server` and `fetch` both mocked.
- `lib/shopify/__tests__/admin-rx.test.ts` — the integration: asserts the
  token-exchange call happens *before* the identity check, that the
  resulting token lands in the `X-Shopify-Access-Token` header, and that the
  pre-existing shop-identity-gate behavior (production rejection,
  no-identity refusal, failure-not-cached-so-retry-succeeds) still holds
  with the extra call in the sequence.

## Known gap (not blocking, flagged separately)

The QA custom app's `client_credentials` grant returns a token scoped wider
than the code comment claims (`read_customers`/`write_customers` only) — the
actual `scope` field also includes `write_discounts`, `write_orders`,
`write_products`, `write_fulfillments`, and others unrelated to the RX gate.
Nothing in this codebase exercises the extra scope, but the app itself is
over-provisioned. See `docs/launch/DEV-LAUNCH-02-config.md` for the full
verification record and the follow-up to narrow it.
