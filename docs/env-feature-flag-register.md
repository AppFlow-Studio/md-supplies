# Environment & Feature-Flag Register

Names and behavior only — **no values**. Every flag fails safe, where "safe"
means the lower-risk direction for that specific flag: for the claim flags
(`FORDEER_LABELS_ENABLED`, `SHIPPING_RESOLVER_ENABLED`) an unset or invalid
value resolves to the disabled/neutral state, never to a customer-facing
claim. `RX_CHECKOUT_ENFORCEMENT` fails safe the other way — an unset or
invalid value leaves the compliance gate ON, because for a prescription
control the lower-risk failure is over-gating, not under-gating.

## Feature flags added or changed by the clean-fix completion pass

| Flag | Default | Disabled when | Safe-failure behavior | Production activation requires |
|---|---|---|---|---|
| `RX_CHECKOUT_ENFORCEMENT` | **enabled** | exactly `"false"` | Kill-switch only. When set to exactly `"false"`, `resolveGateStatus()` returns `blocked: false` for every cart/account state, so checkout is never blocked. Upload UI, private storage, malware scanning, and the RX Only label continue to work either way. Any other value — unset, empty, typo'd, `"0"`, `"no"` — leaves enforcement ON, because an over-gated sale is recoverable and an ungated prescription sale is not | N/A — this is an existing, deliberately-built compliance control (forced sign-in → document upload → server-side recheck), confirmed active by Bilal 2026-08-02. The flag exists purely as an emergency rollback switch, not a launch toggle — see `lib/rx-gate.ts` |
| `FORDEER_LABELS_ENABLED` | **disabled** | exactly `"true"` | Provider returns no labels; components render only tag/metafield labels and the resolver-backed shipping badge. If the flag is set without a proven supported retrieval path, the provider **throws loudly** rather than inventing labels | A supported Fordeer headless path or client-approved metafield sync — see IZ-03 |
| `SHIPPING_RESOLVER_ENABLED` | **disabled** (pre-existing) | exactly `"true"` | Every product falls back to "Shipping calculated at checkout." No free-shipping claim can render | Wording/data/QA approval — see IZ-08 |
| `OCC_COLLECTION_HANDLE` | `occ` | any non-empty string | Overrides the canonical OCC collection handle per environment. If the handle resolves to no collection, the OCC page renders a neutral unavailable state — never a tag-scanned fallback | Izzy confirmation of the canonical collection — see IZ-01 |

## Existing environment variables relied on (unchanged)

| Name | Purpose | Safe failure |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | Storefront host | Guarded by `shop-guard` |
| `SHOPIFY_ALLOWED_SHOP_DOMAIN` | The single shop a build may reach | Defaults to the **QA** store, so a forgetful environment cannot fall through to production |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Read-only catalog queries | Fetches fail → neutral/error states |
| `SHOPIFY_ADMIN_CLIENT_ID` / `SHOPIFY_ADMIN_CLIENT_SECRET` | Server-only RX customer metafields. Exchanged for a short-lived Admin API access token via the `client_credentials` grant (`lib/shopify/admin-token.ts`), not a static token — the QA custom app doesn't issue one | Absent → RX document state unknown; with enforcement off this cannot block checkout. A failed exchange is never cached, so a transient error is recoverable on retry |
| `RESEND_TO_EMAIL` | Form recipient | Defaults to `support@mdsupplies.com`; a source-tree guard test forbids any other recipient |
| `RESEND_SOURCING_TO_EMAIL` | Sourcing form recipient | Falls back to the approved support address |
| `RX_SCAN_REQUIRED` | Fail-closed malware scanning for RX uploads | Rejects unscanned uploads when required |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin | Metadata/canonicals |
| `NEXT_PUBLIC_IS_STAGING` | Forces noindex on previews | Preview stays out of the index |
| `BUNNYCDN_STORAGE_*` | Category imagery via the same-origin proxy | Image failure → neutral panel (never a letter placeholder) |

## Rollback

Every flag above is additive and defaults to off, so rollback is either
unsetting the variable or reverting the branch. No migrations, no data
backfills, and no Shopify configuration changes are introduced by this work.
