'use client'

import { parseCookieHeader, readGaIdentifiers } from './clientId'
import { setCartAttribute } from '@/app/actions/cart'

/**
 * Bridges GA4's identity across the headless → Shopify checkout boundary.
 *
 * The storefront and Shopify checkout are different origins running different
 * tag setups, so the `purchase` event fired inside Shopify's pixel sandbox has
 * no idea who the browsing session belonged to. Cart attributes are the one
 * channel that crosses: the pixel reads them back off `checkout.attributes`
 * (shopify/web-pixel-purchase.js) and replays them into its own gtag config.
 *
 * Both identifiers are needed, not just the client id:
 *
 *  - `ga_client_id` alone ties the purchase to the right USER, but GA4 then
 *    mints a fresh session for it. That session has no campaign parameters, so
 *    it resolves to `(direct)` and the revenue detaches from the `jant`/`email`
 *    session that actually produced it in Traffic Acquisition reporting.
 *  - `ga_session_id` (+ session number) puts the purchase back INSIDE the
 *    originating session, so it inherits that session's source/medium/campaign.
 *
 * This is why campaign attribution on revenue works at all; without the
 * session id the funnel reports a Jant-sourced add_to_cart and a direct
 * purchase.
 *
 * Wholly best-effort. Every failure path is swallowed and the handoff
 * continues — a customer must never be blocked from checking out because an
 * analytics cookie was missing or a Storefront call was slow.
 */
export async function bridgeAnalyticsToCheckout(): Promise<void> {
  try {
    const { clientId, session } = readGaIdentifiers(parseCookieHeader(document.cookie))
    // Serialised into one attribute rather than three: `cartAttributesUpdate`
    // is a network round-trip per call, and these three values are only ever
    // read together by the pixel.
    const parts: string[] = []
    if (clientId) parts.push(`cid=${clientId}`)
    if (session) parts.push(`sid=${session.sessionId}`, `sct=${session.sessionNumber}`)
    if (parts.length === 0) return

    // ga_client_id is kept as its own attribute for backward compatibility:
    // the pixel already in the Shopify admin reads that exact key, and it must
    // keep working until the updated pixel is pasted in (see
    // docs/analytics/README.md's external-configuration checklist).
    if (clientId) await setCartAttribute('ga_client_id', clientId)
    if (session) await setCartAttribute('ga_session', parts.join('&'))
  } catch (err) {
    console.error('[checkout-handoff] analytics bridge failed:', err)
  }
}
