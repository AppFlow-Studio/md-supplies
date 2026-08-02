# Environment & Feature-Flag Register

Names and behavior only — **no values**. Every flag fails safe: an unset or
invalid value resolves to the disabled/neutral state, never to a customer-facing
claim or a checkout block.

## Feature flags added or changed by the clean-fix completion pass

| Flag | Default | Enabled when | Safe-failure behavior | Production activation requires |
|---|---|---|---|---|
| `RX_CHECKOUT_ENFORCEMENT` | **disabled** | exactly `"true"` | `resolveGateStatus()` returns `blocked: false` for every cart/account state, so checkout is never blocked. Upload UI, private storage, malware scanning, and the RX Only label continue to work | Written client/compliance decision (plan §9.1) recorded in-repo — see IZ-09 |
| `FORDEER_LABELS_ENABLED` | **disabled** | exactly `"true"` | Provider returns no labels; components render only tag/metafield labels and the resolver-backed shipping badge. If the flag is set without a proven supported retrieval path, the provider **throws loudly** rather than inventing labels | A supported Fordeer headless path or client-approved metafield sync — see IZ-03 |
| `SHIPPING_RESOLVER_ENABLED` | **disabled** (pre-existing) | exactly `"true"` | Every product falls back to "Shipping calculated at checkout." No free-shipping claim can render | Wording/data/QA approval — see IZ-08 |
| `OCC_COLLECTION_HANDLE` | `occ` | any non-empty string | Overrides the canonical OCC collection handle per environment. If the handle resolves to no collection, the OCC page renders a neutral unavailable state — never a tag-scanned fallback | Izzy confirmation of the canonical collection — see IZ-01 |

## Existing environment variables relied on (unchanged)

| Name | Purpose | Safe failure |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | Storefront host | Guarded by `shop-guard` |
| `SHOPIFY_ALLOWED_SHOP_DOMAIN` | The single shop a build may reach | Defaults to the **QA** store, so a forgetful environment cannot fall through to production |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Read-only catalog queries | Fetches fail → neutral/error states |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Server-only RX customer metafields | Absent → RX document state unknown; with enforcement off this cannot block checkout |
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
