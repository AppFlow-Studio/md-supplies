/**
 * Phase 11 — purchasability, kept strictly separate from availability.
 *
 * Catalog audit 2026-08-02: 41 ACTIVE variants have price <= 0 (55 across all
 * statuses). Several are titled "… Order For Pricing", so at least some are
 * deliberately quote-only. A zero-price line must never reach checkout: it
 * would either transact at $0 or be silently dropped.
 *
 * These states are DISTINCT and must not be collapsed into one another:
 *
 *   unpurchasable-price  price <= 0 or missing → "Contact for pricing".
 *                        Says nothing about stock and is NOT a shipping/no-rate
 *                        signal.
 *   out-of-stock         Shopify availableForSale === false.
 *   no-rate              a shipping-resolver outcome; owned by
 *                        lib/shipping-resolver and never inferred from price.
 *
 * Nothing here infers a fulfiller, a rate, or an RX requirement.
 */

export type PurchasableState =
  | { purchasable: true }
  | { purchasable: false; reason: 'price-unavailable' | 'out-of-stock' }

export type PurchasabilityInput = {
  /** Major-unit price (e.g. dollars) as a number, or null/undefined if absent. */
  price?: number | null
  /** Shopify availableForSale for the selected variant. */
  availableForSale?: boolean
}

/** True when a price is a usable, positive, finite amount. */
export function hasUsablePrice(price?: number | null): boolean {
  return typeof price === 'number' && Number.isFinite(price) && price > 0
}

/**
 * Fail-closed: anything we cannot confirm as purchasable is not purchasable.
 * Price is checked FIRST so a zero-price item reads "Contact for pricing"
 * rather than the misleading "Out of Stock".
 */
export function resolvePurchasable(input: PurchasabilityInput): PurchasableState {
  if (!hasUsablePrice(input.price)) return { purchasable: false, reason: 'price-unavailable' }
  if (input.availableForSale === false) return { purchasable: false, reason: 'out-of-stock' }
  return { purchasable: true }
}

export type VariantForDefault = {
  price: { amount: string }
  availableForSale: boolean
}

/**
 * Prefer a variant a shopper can actually buy — availableForSale alone lets a
 * $0/quote-only variant win the default slot (DEV-LAUNCH-12: this must be the
 * single source both the rendered PDP and its Product structured data build
 * from, or the two can show a different price/SKU/availability for the same
 * page — see app/product/[slug]/page.tsx and components/product/ProductView.tsx).
 */
export function getDefaultVariant<T extends VariantForDefault>(variants: T[]): T {
  const purchasable = variants.find(
    (v) => resolvePurchasable({ price: parseFloat(v.price.amount), availableForSale: v.availableForSale }).purchasable,
  )
  return purchasable ?? variants.find((v) => v.availableForSale) ?? variants[0]
}

/** Customer-facing label for a non-purchasable state. */
export function purchasabilityLabel(reason: 'price-unavailable' | 'out-of-stock'): string {
  return reason === 'price-unavailable' ? 'Contact for pricing' : 'Out of Stock'
}

/** Copy for the disabled add-to-cart control. */
export function purchasabilityCta(reason: 'price-unavailable' | 'out-of-stock'): string {
  return reason === 'price-unavailable' ? 'Request pricing' : 'Out of Stock'
}

// ── Cart-level gating ────────────────────────────────────────────────────────

export type CartLineLike = {
  quantity: number
  merchandise: {
    id: string
    title?: string | null
    price?: { amount?: string } | null
    product: { title: string }
  }
}

export type BlockedCartLine = { id: string; title: string; reason: 'price-unavailable' }

/**
 * Lines that must not reach checkout: a zero/missing unit price would either
 * transact at $0 or be silently omitted from the order. Returns the offenders
 * so the cart UI can name them instead of failing mutely.
 *
 * Reads the variant's own `price`, NOT the line's `cost.totalAmount` — a line
 * Shopify simply can't ship to the destination also zeroes out its total
 * while the underlying variant is priced normally, and that is a distinct,
 * fixable-by-address-change problem owned by
 * lib/shopify/cart-lines.ts#unshippableCartLines, not this one (DEV-LAUNCH-09).
 * Collapsing the two here would tell a shopper stuck on a no-rate line to
 * "contact us for pricing," which is not what's wrong.
 */
export function blockedCartLines(lines: CartLineLike[]): BlockedCartLine[] {
  return lines.flatMap((line) => {
    const raw = line.merchandise.price?.amount
    const price = raw == null ? null : Number.parseFloat(raw)
    if (hasUsablePrice(price)) return []
    return [{
      id: line.merchandise.id,
      title: line.merchandise.product.title,
      reason: 'price-unavailable' as const,
    }]
  })
}

/** Customer-facing explanation for a blocked checkout. */
export function blockedCheckoutMessage(blocked: BlockedCartLine[]): string {
  if (blocked.length === 0) return ''
  const names = blocked.map((b) => b.title).join(', ')
  return blocked.length === 1
    ? `${names} is priced on request. Please remove it or contact us for pricing before checking out.`
    : `These items are priced on request: ${names}. Please remove them or contact us for pricing before checking out.`
}
