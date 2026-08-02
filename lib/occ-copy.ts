/**
 * Centralized OCC promotional copy (Phase 10).
 *
 * The homepage/industries OCC panel previously read "Dedicated pricing and
 * account support". The desired topic is free-shipping availability, but an
 * UNCONDITIONAL free-shipping promise is a customer-liability claim and the
 * client's OCC shipping policy is not confirmed, so the default below is
 * deliberately qualified ("on qualifying orders").
 *
 * ── DECISION POINT — Bilal / client ──────────────────────────────────────────
 * If the client confirms IN WRITING that EVERY OCC order qualifies for free
 * shipping regardless of cart contents, subtotal, destination and vendor, then
 * and only then replace the default with the unconditional wording:
 *
 *     OCC_PANEL_SUBHEAD = 'Free shipping on OCC orders'
 *
 * Until that confirmation exists, the qualified wording stands. Do not remove
 * the qualifier to "tighten" the copy — the qualifier is the whole point.
 *
 * This is presentational copy only: it never gates a rate, a threshold or a
 * shipping badge. Per-product shipping claims still come exclusively from the
 * shipping resolver's public_display_class (lib/shipping-resolver), which is
 * unaffected by this string and remains disabled in production.
 */

export const OCC_PANEL_HEADING = 'OCC Program'

/** Safe default: qualified, not an unconditional promise. */
export const OCC_PANEL_SUBHEAD = 'Free shipping available on qualifying OCC orders'

export const OCC_PANEL_CTA = 'Shop OCC'
