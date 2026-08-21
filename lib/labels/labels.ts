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
//  - Backorder: gated on the `custom.backorder` boolean ALONE — the merchant's
//    own declaration (mirrored from Juliette's Fordeer list via Izzy), not an
//    inventory inference. Bilal, 2026-08-18 (supersedes DEV-SHIP-04's "always
//    exactly Backorder" rule): `custom.estimated_back_order_restock_date` is
//    appended to the text ONLY when it is a valid, non-expired date — a
//    missing, stale, or unparseable ETA falls back to the plain "Backorder"
//    text. The ETA never creates or shapes Backorder status by itself; the
//    boolean is checked first and independently.
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
// Bilal, 2026-08-20 final decision: exact customer-facing capitalization is
// "RX Only" (not "Rx Only") — reverses H-04 (launch plan 2026-08-13).
// Applies to cards, PDP, Quick Add, and cart; the screen-reader text below
// is unrelated to this capitalization question and is unchanged.
export const RX_ONLY_LABEL_TEXT = 'RX Only'
export const RX_ONLY_ACCESSIBLE_TEXT = 'Prescription required'

/**
 * The "Rx Only" badge renders from RX POLICY, not from tags alone and never
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
 * Truthy Shopify boolean-metafield values ("true"/"1"/"yes"), accepting the
 * raw `{value}` shape, a bare string, or an already-flattened boolean (e.g.
 * from ProductCardData) — so every layer can call this without re-parsing.
 */
export function isBackorderedMetafield(
  raw?: { value: string } | string | boolean | null,
): boolean {
  if (typeof raw === 'boolean') return raw
  const v = typeof raw === 'string' ? raw : raw?.value
  return ['true', '1', 'yes'].includes((v ?? '').trim().toLowerCase())
}

/** A parseable date more than 36h in the past — a stale/expired ETA never renders. */
function isValidNonExpiredEta(value: string, now?: Date): boolean {
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) return false
  // 36-hour grace past the parsed instant: covers a date-only value (which
  // parses as UTC midnight) staying valid through that calendar day in any
  // merchant/customer timezone, without local-timezone math.
  const GRACE_MS = 36 * 60 * 60 * 1000
  return parsed.getTime() + GRACE_MS >= (now ?? new Date()).getTime()
}

/**
 * Backorder label. The `custom.backorder` boolean is the SOLE trigger — the
 * merchant's own declaration (Juliette's Fordeer list, mirrored by Izzy),
 * never an availability/inventory inference and never influenced by an ETA.
 *
 * Bilal, 2026-08-18 (supersedes DEV-SHIP-04's "always exactly Backorder"
 * rule): once the boolean is true, a valid, non-expired
 * `estimatedRestockDate` IS appended to the text; a missing, stale, or
 * unparseable one falls back to the plain "Backorder" text. A date must
 * never by itself create or shape Backorder status — the boolean gate above
 * runs first and independently.
 */
export function resolveBackorderLabel(input: {
  isBackordered?: { value: string } | string | boolean | null
  estimatedRestockDate?: string | null
  now?: Date
}): ProductLabel | null {
  if (!isBackorderedMetafield(input.isBackordered)) return null

  const value = input.estimatedRestockDate?.trim()
  const eta = value && isValidNonExpiredEta(value, input.now) ? value : null

  return {
    type: 'backorder',
    // "Backorder", not "Back-ordered" (Bilal's spec / Juliette's guide).
    text: eta ? `Backorder, ships ${eta}` : 'Backorder',
    accessibleText: eta ? `Backorder, ships ${eta}` : 'Backorder',
    priority: 20,
    source: 'metafield',
  }
}

export function resolveProductLabels(input: {
  tags?: string[]
  isBackordered?: { value: string } | string | boolean | null
  estimatedRestockDate?: string | null
  /** `custom.is_rx_only` — union'd with the RX tag, see resolveRxLabel. */
  isRxOnly?: { value: string } | string | null
  now?: Date
}): ProductLabel[] {
  const labels: ProductLabel[] = []
  const rx = resolveRxLabel(input.tags, input.isRxOnly)
  if (rx) labels.push(rx)
  const backorder = resolveBackorderLabel({
    isBackordered: input.isBackordered,
    estimatedRestockDate: input.estimatedRestockDate,
    now: input.now,
  })
  if (backorder) labels.push(backorder)
  return labels.sort((a, b) => a.priority - b.priority)
}
