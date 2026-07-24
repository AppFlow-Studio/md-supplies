/**
 * Shipping-display resolver (QA branch — shipping/checkout test campaign).
 *
 * Maps a product's shipping signals (metafields + legacy tag) to the customer-
 * facing shipping message and badge shown on PDP/cards. Pure and total: never
 * throws, and any missing/invalid/conflicting input degrades to the neutral
 * fallback copy — per the directive that unresolved products must show
 * "Shipping calculated at checkout." rather than a blank or a wrong claim.
 *
 * Signal precedence (first match wins):
 *   1. `custom.shipping_display_class` metafield — explicit class set by the
 *      catalog model (free | threshold | paid). An explicit class always
 *      outranks legacy signals.
 *   2. Legacy free signals — the `free-shipping` tag or the
 *      `custom.free_shipping` boolean metafield (production-era signals;
 *      known to disagree with rates-truth on part of the catalog, so they
 *      only apply when no explicit class exists).
 *   3. Nothing usable → class `unknown`, fallback message, no badge.
 *
 * Class semantics:
 *   free      → unconditionally free shipping for this product.
 *   threshold → free at/above a cart-subtotal threshold (whole-cart rule,
 *               e.g. the Dukal $30 profile). Requires a parsable positive
 *               `custom.shipping_threshold`; without one we cannot assert a
 *               number, so the product degrades to `unknown`.
 *   paid      → a flat paid rate applies. If `custom.shipping_flat_rate`
 *               parses, the message names it ("from" — the exact charge is
 *               destination-dependent); otherwise the class stays `paid`
 *               but the message falls back to the neutral copy.
 *   unknown   → no resolvable shipping fact; neutral fallback copy only.
 */

export type ShippingDisplayClass = 'free' | 'threshold' | 'paid' | 'unknown'

export interface ShippingSignals {
  /** Product tags (legacy `free-shipping` signal lives here). */
  tags?: readonly string[] | null
  /** `custom.shipping_display_class` metafield value. */
  displayClass?: string | null
  /** `custom.free_shipping` metafield value ("true"/"false"). */
  freeShipping?: string | null
  /** `custom.shipping_threshold` metafield value (e.g. "30"). */
  threshold?: string | null
  /** `custom.shipping_flat_rate` metafield value (e.g. "10.95"). */
  flatRate?: string | null
}

export interface ShippingDisplay {
  displayClass: ShippingDisplayClass
  /** Customer-facing shipping line for PDP. Never empty. */
  message: string
  /** Short badge label (cards/PDP chip), or null when nothing is assertable. */
  badge: string | null
}

/** Exact copy required for unresolved products (Bilal, 2026-07-22). */
export const SHIPPING_FALLBACK_MESSAGE = 'Shipping calculated at checkout.'

const FREE_BADGE = 'Free Shipping'

/** Class aliases accepted from the metafield, normalized to canonical names.
 *  Includes the catalog model's `standard-*` vocabulary. */
const CLASS_ALIASES: Record<string, Exclude<ShippingDisplayClass, 'unknown'>> = {
  'free': 'free',
  'standard-free': 'free',
  'threshold': 'threshold',
  'paid': 'paid',
  'standard-paid': 'paid',
}

/** Parses a metafield money/number string. Returns null unless it is a plain
 *  positive finite number ("30", "10.95", " 30 "). Anything else — "", "$30",
 *  "free", "-5", "NaN", "1e999" — is invalid input, not a rate. */
function parsePositiveAmount(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** $30 for integers, $10.95 otherwise. */
export function formatAmount(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

/** Legacy production signal: `free-shipping` tag or `custom.free_shipping`
 *  metafield set to true. Only consulted when no explicit class is present. */
export function hasLegacyFreeSignal(
  tags: readonly string[] | null | undefined,
  freeShipping: string | null | undefined,
): boolean {
  if (Array.isArray(tags) && tags.includes('free-shipping')) return true
  return typeof freeShipping === 'string' && freeShipping.trim().toLowerCase() === 'true'
}

export function resolveShippingDisplay(signals: ShippingSignals): ShippingDisplay {
  const rawClass = typeof signals.displayClass === 'string'
    ? signals.displayClass.trim().toLowerCase()
    : ''
  const explicit = CLASS_ALIASES[rawClass]

  if (explicit === 'free') {
    return { displayClass: 'free', message: 'Free shipping', badge: FREE_BADGE }
  }

  if (explicit === 'threshold') {
    const threshold = parsePositiveAmount(signals.threshold)
    if (threshold === null) {
      // A threshold class without a usable threshold number is an unresolved
      // fact — we must not invent an amount.
      return { displayClass: 'unknown', message: SHIPPING_FALLBACK_MESSAGE, badge: null }
    }
    return {
      displayClass: 'threshold',
      message: `Free shipping on orders over ${formatAmount(threshold)}`,
      badge: `Free over ${formatAmount(threshold)}`,
    }
  }

  if (explicit === 'paid') {
    const rate = parsePositiveAmount(signals.flatRate)
    return {
      displayClass: 'paid',
      message: rate === null
        ? SHIPPING_FALLBACK_MESSAGE
        : `Flat-rate shipping from ${formatAmount(rate)}`,
      badge: null,
    }
  }

  // No (valid) explicit class — fall back to the legacy free signals.
  if (hasLegacyFreeSignal(signals.tags, signals.freeShipping)) {
    return { displayClass: 'free', message: 'Free shipping', badge: FREE_BADGE }
  }

  return { displayClass: 'unknown', message: SHIPPING_FALLBACK_MESSAGE, badge: null }
}
