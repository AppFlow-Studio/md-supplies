/**
 * Resolves the shipping message and badge shown on product pages and cards.
 *
 * Pure and total: it never throws, and any missing, invalid or conflicting
 * input degrades to "Shipping calculated at checkout." rather than a blank or
 * an invented number. Shopify computes the real rate at checkout, so this only
 * states what the catalog data can actually support.
 *
 * Signal precedence (first match wins):
 *   1. `custom.shipping_display_class` (free | threshold | paid). An explicit
 *      class always outranks the legacy signals below.
 *   2. Legacy free signals: the `free-shipping` tag or `custom.free_shipping`.
 *      These predate the class metafield and disagree with the delivery-profile
 *      rates on part of the catalog, so they only apply when no class is set.
 *   3. Nothing usable: class `unknown`, fallback message, no badge.
 *
 * Class semantics:
 *   free      unconditionally free for this product.
 *   threshold free at or above a whole-cart subtotal. Needs a parsable positive
 *             `custom.shipping_threshold`; without one no amount can be stated,
 *             so it degrades to `unknown`.
 *   paid      a flat rate applies. With a parsable `custom.shipping_flat_rate`
 *             the message names it as a "from" price, since the exact charge is
 *             destination-dependent; otherwise the copy falls back.
 *   unknown   no resolvable shipping fact, fallback copy only.
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

/** Neutral copy for products whose shipping cannot be resolved from catalog
 *  data. Exact wording is intentional: do not reword without agreement. */
export const SHIPPING_FALLBACK_MESSAGE = 'Shipping calculated at checkout.'

const FREE_BADGE = 'Free Shipping'

/** Class values accepted from the metafield, mapped to canonical names. The
 *  `standard-*` spellings come from the catalog's own vocabulary. */
const CLASS_ALIASES: Record<string, Exclude<ShippingDisplayClass, 'unknown'>> = {
  free: 'free',
  'standard-free': 'free',
  threshold: 'threshold',
  paid: 'paid',
  'standard-paid': 'paid',
}

/** Parses a metafield amount. Returns null unless the value is a plain positive
 *  number ("30", "10.95", " 30 "). Anything else, including "", "$30", "free",
 *  "-5" and "NaN", is invalid input rather than a rate. */
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
      // No usable amount, so there is nothing truthful to state.
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

  // No valid explicit class, so fall back to the legacy free signals.
  if (hasLegacyFreeSignal(signals.tags, signals.freeShipping)) {
    return { displayClass: 'free', message: 'Free shipping', badge: FREE_BADGE }
  }

  return { displayClass: 'unknown', message: SHIPPING_FALLBACK_MESSAGE, badge: null }
}
