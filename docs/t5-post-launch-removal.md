# T5 · Post-Launch App Removal Flag List

Apps flagged for removal after launch. Do NOT remove before launch unless the app
actively breaks the build or blocks checkout/compliance.

| Priority | App | Reason to remove | Replacement | Remove after |
|----------|-----|-----------------|-------------|-------------|
| P1 | **Sitemap NoIndex Pro** | T2 (Next.js) is now the authoritative sitemap/robots owner. The app's output is redundant and could produce duplicate or conflicting sitemap entries if it intercepts the headless domain. | T2 sitemap already in place (`app/sitemap.ts`, `app/robots.ts`) | DNS cutover confirmed + 2 weeks stable |
| P2 | **Fordeer Product Labels** | Headless frontend renders its own `ProductBadges` from live Shopify tags/metafields (T5 fixes applied). Fordeer's theme-injection approach has no effect on the headless frontend. | `ProductBadges` component (already in place) | After confirming all badge types render correctly from tags |
| P3 | **Meteor Mega Menu** | Menu is fetched live via `GET_MENU` → `main-menu` handle. Meteor's visual editor is useful for the content team but the app itself adds no runtime value to the headless frontend. | Manage menu directly in Shopify Navigation | After content team confirms they can manage the menu without the app's UI |
| — | **TrustShop Reviews** | Keep — provides social proof if reviews exist. Remove only if it injects `aggregateRating` schema (verify MANUAL check above). | N/A | Only if schema conflict confirmed |
| — | **Shopify Forms** | Keep — no native headless replacement. Forms are P0 for B2B + contact. | N/A | Never (or until custom form infrastructure is built) |
| — | **Upload-Lift RX** | Keep — required for RX/prescription compliance flow. | N/A | Never (or until RX compliance is restructured) |
| — | **Search & Discovery** | Keep — powers Storefront API `predictiveSearch`. Removing it breaks the search API. | N/A | Never |
| — | **Messaging widget** | Already effectively invisible on headless frontend (no script in layout). Remove from Shopify admin to clean up the app list. | N/A | Any time |
