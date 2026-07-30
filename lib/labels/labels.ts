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

export type ProductLabelType = 'rx-only' | 'backorder'

export type ProductLabel = {
  type: ProductLabelType
  /** Approved customer-facing text. */
  text: string
  /** Screen-reader text where the visual is abbreviated. */
  accessibleText: string
  /** Lower renders first. */
  priority: number
  source: 'tag' | 'metafield'
}

// RX display tag values observed in the catalog. `compliance:rx-only` is the
// value the RX gate verified (lib/rx-gate.ts); `rx-required` is the older
// display tag still present on products. PENDING IZZY: confirm the canonical
// RX tag and retire the other.
const RX_LABEL_TAGS = ['rx-required', 'compliance:rx-only']

export function resolveRxLabel(tags: string[] | undefined): ProductLabel | null {
  if (!tags?.some((t) => RX_LABEL_TAGS.includes(t))) return null
  return {
    type: 'rx-only',
    text: 'RX Only',
    accessibleText: 'Prescription required',
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
  now?: Date
}): ProductLabel[] {
  const labels: ProductLabel[] = []
  const rx = resolveRxLabel(input.tags)
  if (rx) labels.push(rx)
  const backorder = resolveBackorderLabel({
    estimatedRestockDate: input.estimatedRestockDate,
    availableForSale: input.availableForSale ?? true,
    now: input.now,
  })
  if (backorder) labels.push(backorder)
  return labels.sort((a, b) => a.priority - b.priority)
}
