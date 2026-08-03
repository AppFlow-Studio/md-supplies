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

// Legacy display tag still present on part of the catalog. Recognised so the
// RX set can only widen — see the union rule in isRxProduct().
export const RX_LEGACY_TAG = 'rx-required'

/**
 * The store's own RX declaration, `custom.is_rx_only`.
 *
 * Catalog audit 2026-08-02 (docs/audits/2026-08-02-catalog-cro): the metafield
 * is true on 501 products while the tag covers only 461 — the tag set is a
 * strict SUBSET. The 40-product gap is all ACTIVE and unambiguously
 * prescription (Xylocaine w/ Epinephrine, Bupivacaine injection, Bacteriostatic
 * Water marked "Physician's License Required"). Keying on the tag alone made
 * them invisible to the gate.
 *
 * Reading this field decides no policy — it consumes a declaration Shopify
 * already carries, and it can only ADD products to the RX set, never remove
 * them. PENDING IZZY: confirm the canonical source and reconcile the two.
 */
export const RX_PRODUCT_METAFIELD = { namespace: 'custom', key: 'is_rx_only' } as const

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
  /** `custom.is_rx_only` when the query selected it (raw metafield or value). */
  isRxOnly?: { value: string } | string | null
}

/** Truthy Shopify boolean-metafield values ("true"/"1"/"yes"). */
function metafieldIsTrue(v: RxProductInput['isRxOnly']): boolean {
  const raw = typeof v === 'string' ? v : v?.value
  return ['true', '1', 'yes'].includes((raw ?? '').trim().toLowerCase())
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

/**
 * RX-flagged per the canonical sources, before exemptions.
 *
 * UNION of the tag and the store's `custom.is_rx_only` metafield: a product is
 * RX if EITHER says so. Union (not intersection) is the fail-safe direction —
 * a disagreement between the two sources can only widen the RX set, never
 * silently drop a prescription item.
 */
export function isRxProduct(product: RxProductInput): boolean {
  const tagged = (product.tags ?? []).some((t) => {
    const v = t.trim().toLowerCase()
    return v === RX_TAG || v === RX_LEGACY_TAG
  })
  return tagged || metafieldIsTrue(product.isRxOnly)
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

/**
 * RX checkout ENFORCEMENT flag — ON by default.
 *
 * HISTORY, because this default was flipped twice and the reason matters:
 * a prior pass read the execution plan's "§9.1 BLOCKED" note as a reason to
 * ship enforcement DISABLED. That was wrong for this business: the RX
 * account/document flow is an existing, deliberately-built compliance control
 * (forced sign-in → document upload → server-side recheck before checkout),
 * and defaulting it off silently removed the gate on prescription items.
 * Bilal confirmed on 2026-08-02 that the flow must be preserved and active.
 *
 * So enforcement is ON unless someone explicitly turns it off, and only the
 * exact string "false" does that. Any other value — unset, empty, typo'd,
 * "0", "no" — leaves the gate ON. The failure direction is deliberate: an
 * over-gated sale is recoverable, an ungated prescription sale is not.
 *
 * The kill-switch exists purely as an emergency rollback if the gate ever
 * misfires in production; it is not a launch toggle.
 *
 * SCOPE: this is the storefront UX gate. It is NOT, and must not be described
 * as, a bypass-proof legal control — a determined user can still reach a
 * checkout URL directly. The bypass-resistant control is the companion Shopify
 * validation app, which is untouched by this flag.
 */
export function isRxEnforcementEnabled(): boolean {
  return process.env.RX_CHECKOUT_ENFORCEMENT !== 'false'
}

export function resolveGateStatus(input: {
  cartHasRx: boolean
  signedIn: boolean
  hasDocument: boolean
  verified: boolean
  /** Defaults to the env flag; injectable for tests. */
  enforcementEnabled?: boolean
}): RxGateStatus {
  const enforcementEnabled = input.enforcementEnabled ?? isRxEnforcementEnabled()
  return {
    cartHasRx: input.cartHasRx,
    signedIn: input.signedIn,
    hasDocument: input.hasDocument,
    verified: input.verified,
    // Never blocks while enforcement is disabled, regardless of cart contents.
    blocked:
      enforcementEnabled && input.cartHasRx && (!input.signedIn || !input.hasDocument),
  }
}
