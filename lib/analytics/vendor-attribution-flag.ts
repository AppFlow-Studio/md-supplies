/**
 * Commercial scope gate for the persistent vendor-attribution layer.
 *
 * MDSupplies' agreed analytics scope covers ordinary campaign and ecommerce
 * measurement: UTM-tagged links, GA4 sessions and campaigns, product activity,
 * cart activity, checkout and purchase. All of that is ACTIVE and is NOT
 * controlled by this flag.
 *
 * A vendor (Jant) additionally asked for a durable attribution layer that sits
 * outside that scope — campaign identity that survives across separate visits
 * over days, independently of GA4's own session attribution, and is written
 * onto the Shopify cart so an order can later be tied deterministically back to
 * one specific vendor email ("which Jant email sold this order?"). That work is
 * built and tested, but must not run in production until the extra scope is
 * funded and approved. Hence: implemented, disabled.
 *
 * Deliberately NOT `NEXT_PUBLIC_`. Both gated paths execute server-side —
 * proxy.ts (the cookie write) and app/actions/cart.ts (the Shopify cart
 * stamping) — so the gate is enforced on the server and there is nothing a
 * visitor can flip from the URL, the console, or browser storage. If a client
 * component ever imported this helper, `process.env` would be undefined in the
 * browser and it would read as disabled, which is the correct failure
 * direction.
 *
 * Fails to DISABLED on anything that is not the exact string 'true' — unset,
 * blank, '0', 'false', 'TRUE', or a typo all leave the feature off. A
 * misconfigured deploy can therefore only ever fail closed, never silently
 * activate unfunded functionality.
 *
 * Kept as one named function rather than inlined `process.env` checks so the
 * commercial boundary has exactly one definition, and so `grep` finds every
 * place that depends on it.
 *
 * To activate after approval: set ENABLE_PERSISTENT_VENDOR_ATTRIBUTION=true in
 * the approved environment and redeploy. No code change is required.
 */
export function isPersistentVendorAttributionEnabled(): boolean {
  return process.env.ENABLE_PERSISTENT_VENDOR_ATTRIBUTION === 'true'
}
