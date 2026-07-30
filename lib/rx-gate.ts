// RX prescription gate — detection + exemption policy (P0 launch-gate ticket).
//
// This module is the single source of truth for "does this cart need the RX
// gate". The account upload UI, the cart CTA gate, and (later) the
// enforcement validation app companion all key off the same constants.
//
// PENDING IZZY (ticket "BLOCKED — wire on confirm, don't assume"):
//  - Canonical RX source: currently the `compliance:rx-only` product tag
//    (the value verified in the audit's Exel 23G repro). If the canonical
//    source lands as a metafield instead, swap isRxProduct's check here.
//  - Exact metafield ns.key for document + verified flag (RX_METAFIELDS).
//  - Data expression of the insulin-syringe exemption (see isExemptProduct).

export const RX_TAG = 'compliance:rx-only'

// Customer metafields storing the account-level document state. Written
// server-side via the Admin API (lib/shopify/admin.ts), never from the
// browser token.
export const RX_METAFIELDS = {
  namespace: 'compliance',
  documentKey: 'rx_document',
  verifiedKey: 'rx_verified',
} as const

// June client decision: Dynarex products are exempt. Vendor string as it
// appears on Storefront products (matches lib/partners.ts vendorName).
const EXEMPT_VENDORS = new Set(['dynarex'])

// tags/vendor optional defensively: carts created before this fragment
// shipped (or test fixtures) may lack them — a missing field must never
// crash the cart UI. Missing tags ⇒ not RX (the enforcement app, not this
// UX layer, is the compliance control).
export type RxProductInput = {
  tags?: string[]
  vendor?: string
  title?: string
}

/**
 * Insulin syringes are exempt (June client decision), but the ticket forbids
 * building against an assumed data expression — Izzy confirms the field.
 * Scaffold: returns false until the canonical signal is wired.
 * TODO(Izzy): wire the confirmed insulin-syringe exemption signal here.
 */
export function isInsulinSyringeExempt(_product: RxProductInput): boolean {
  return false
}

export function isExemptProduct(product: RxProductInput): boolean {
  if (EXEMPT_VENDORS.has((product.vendor ?? '').trim().toLowerCase())) return true
  return isInsulinSyringeExempt(product)
}

/** RX-flagged product per the canonical source, before exemptions. */
export function isRxProduct(product: RxProductInput): boolean {
  return (product.tags ?? []).some((t) => t.trim().toLowerCase() === RX_TAG)
}

/** An RX line that actually gates checkout = RX-flagged and not exempt. */
export function isGatedRxProduct(product: RxProductInput): boolean {
  return isRxProduct(product) && !isExemptProduct(product)
}

export type RxCartLine = {
  merchandise: { product: RxProductInput }
}

/** True when the cart holds at least one non-exempt RX line. */
export function cartRequiresRxGate(lines: RxCartLine[]): boolean {
  return lines.some((line) => isGatedRxProduct(line.merchandise.product))
}

// ── Gate status shared with the cart UIs ────────────────────────────────────

export type RxGateStatus = {
  /** Cart holds ≥1 non-exempt RX line. */
  cartHasRx: boolean
  /** Customer session present. */
  signedIn: boolean
  /** Account has an RX document on file (uploaded or verified). */
  hasDocument: boolean
  /** Merchant has marked the document verified (enforcement-app signal). */
  verified: boolean
  /**
   * UX gate verdict: block the checkout CTA. Signed-out RX carts block
   * (forced account creation); signed-in carts block until a document is on
   * file. NOTE: UX layer only — the bypass-proof control is the companion
   * validation app reading compliance.rx_verified.
   */
  blocked: boolean
}

export function resolveGateStatus(input: {
  cartHasRx: boolean
  signedIn: boolean
  hasDocument: boolean
  verified: boolean
}): RxGateStatus {
  return {
    ...input,
    blocked: input.cartHasRx && (!input.signedIn || !input.hasDocument),
  }
}
