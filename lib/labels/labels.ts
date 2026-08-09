// DEV-LABEL-01 — one normalized, server-side label contract for every
// product-label surface (cards, PDP, quick add, cart). Components never
// decide label text or precedence themselves.
//
// Precedence rules (plan §8.3):
//  - Free shipping: NOT produced here. A free-shipping claim may come only
//    from the shipping resolver's public_display_class (ShippingBadge); a
//    raw `free-shipping` catalog tag must never create a shipping promise.
//  - Rx Only: display-only label; checkout enforcement is a separate,
//    separately-flagged concern (lib/rx-gate.ts) and is never triggered by
//    this label.
//  - BackOrder ETA: one authoritative source — the
//    custom.estimated_back_order_restock_date metafield — shared by card and
//    PDP so staff update a single place. Stale (past) parseable dates are
//    suppressed, never shown.
//
// Fordeer: no supported headless retrieval path is proven yet (see
// lib/labels/fordeer-provider.ts). When one is, its provider output
// normalizes into this same ProductLabel shape — components stay unchanged.

export type ProductLabelType = 'rx-only' | 'backorder' | 'promo'

export type ProductLabel = {
  type: ProductLabelType
  /** Approved customer-facing text. */
  text: string
  /** Screen-reader text where the visual is abbreviated. */
  accessibleText: string
  /** Lower renders first. */
  priority: number
  source: 'tag' | 'metafield' | 'metaobject'
}

// RX display tag values observed in the catalog. `compliance:rx-only` is the
// value the RX gate verified (lib/rx-gate.ts); `rx-required` is the older
// display tag still present on products. PENDING IZZY: confirm the canonical
// RX tag and retire the other.
const RX_LABEL_TAGS = ['rx-required', 'compliance:rx-only']

// Single copy source for the RX badge — reused by resolveRxLabel and by any
// surface (e.g. quick add) that only has the boolean `isRx` flag rather than
// the raw tags/metafield this function reads, so the wording can never drift
// between surfaces (DEV-LAUNCH-08).
export const RX_ONLY_LABEL_TEXT = 'RX Only'
export const RX_ONLY_ACCESSIBLE_TEXT = 'Prescription required'

/**
 * The "RX Only" badge renders from RX POLICY, not from tags alone and never
 * from a client-authored label metaobject. `isRxOnly` is the store's own
 * `custom.is_rx_only` declaration; passing it makes this agree with the
 * tag ∪ metafield union that lib/rx-gate.ts uses to gate checkout. Omitting it
 * degrades to the historical tag-only behaviour rather than throwing, so
 * callers that genuinely have no metafield data still work.
 */
export function resolveRxLabel(
  tags: string[] | undefined,
  isRxOnly?: { value: string } | string | null,
): ProductLabel | null {
  const taggedRx = tags?.some((t) => RX_LABEL_TAGS.includes(t)) ?? false
  const raw = typeof isRxOnly === 'string' ? isRxOnly : isRxOnly?.value
  const metafieldRx = ['true', '1', 'yes'].includes((raw ?? '').trim().toLowerCase())
  if (!taggedRx && !metafieldRx) return null
  return {
    type: 'rx-only',
    text: RX_ONLY_LABEL_TEXT,
    accessibleText: RX_ONLY_ACCESSIBLE_TEXT,
    priority: 10,
    source: 'tag',
  }
}

/**
 * Backorder label from the single authoritative metafield. Rules:
 *  - only for products that are not currently purchasable-as-available;
 *  - a parseable date in the past is STALE → no label (no stale promise);
 *  - a parseable future date or non-empty operational text renders as-is;
 *  - empty/missing value → no label (plain out-of-stock handling applies).
 */
export function resolveBackorderLabel(input: {
  estimatedRestockDate: string | null | undefined
  availableForSale: boolean
  now?: Date
}): ProductLabel | null {
  const value = input.estimatedRestockDate?.trim()
  if (!value || input.availableForSale) return null

  const parsed = new Date(value)
  if (!isNaN(parsed.getTime())) {
    const now = input.now ?? new Date()
    // 36-hour grace past the parsed instant: covers a date-only value (which
    // parses as UTC midnight) staying valid through that calendar day in any
    // merchant/customer timezone, without local-timezone math.
    const GRACE_MS = 36 * 60 * 60 * 1000
    if (parsed.getTime() + GRACE_MS < now.getTime()) return null
  }

  return {
    type: 'backorder',
    text: `Back-ordered – ships ${value}`,
    accessibleText: `Back-ordered, estimated to ship ${value}`,
    priority: 20,
    source: 'metafield',
  }
}

export function resolveProductLabels(input: {
  tags?: string[]
  estimatedRestockDate?: string | null
  availableForSale?: boolean
  /** `custom.is_rx_only` — union'd with the RX tag, see resolveRxLabel. */
  isRxOnly?: { value: string } | string | null
  now?: Date
}): ProductLabel[] {
  const labels: ProductLabel[] = []
  const rx = resolveRxLabel(input.tags, input.isRxOnly)
  if (rx) labels.push(rx)
  const backorder = resolveBackorderLabel({
    estimatedRestockDate: input.estimatedRestockDate,
    availableForSale: input.availableForSale ?? true,
    now: input.now,
  })
  if (backorder) labels.push(backorder)
  return labels.sort((a, b) => a.priority - b.priority)
}
