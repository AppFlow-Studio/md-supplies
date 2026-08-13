import type { Cart, CartLine } from './types'
import { hasUsablePrice } from '@/lib/purchasability'

/**
 * Shopify can return a cart with fewer lines than were requested without
 * raising a userError. The add simply does not appear. Left unchecked the
 * customer sees a cart that looks fine and is quietly missing something they
 * asked for, and any shipping shown for that cart is calculated over the wrong
 * contents.
 *
 * We deliberately do not infer WHY a line is missing. The observed responses do
 * not distinguish an out-of-stock variant from an unpublished one from a
 * delivery-profile gap, so the customer gets one honest message and the server
 * keeps the raw counts for diagnosis.
 */

/**
 * Shown to the customer. States what happened and what to do, and promises no
 * reason. Deliberately not "please try again": a dropped line is usually
 * persistent, so inviting a retry would just repeat the failure.
 */
export const CART_LINE_MISSING_MESSAGE =
  'We could not add that item to your cart. Please review your cart before checking out.'

/**
 * Shown when a line is in the cart but cannot be shipped to the destination.
 *
 * Measured on the QA store 2026-07-28: a product whose delivery profile has no
 * rate for the destination is NOT dropped. The line stays, Shopify returns
 * warning code MERCHANDISE_OUT_OF_STOCK, and the line contributes 0.00 to the
 * subtotal while the rest of the cart stays checkout-ready. In the mixed-cart
 * case the shippable line returned a rate and checkout remained available, so
 * without this check a customer could pay for a cart that cannot deliver one of
 * its items.
 *
 * Shopify's own wording for this is "already sold out", which is wrong and
 * unhelpful: the tested variants had 100 units in stock. The problem is the
 * destination, so the message says that instead of repeating Shopify's.
 */
export const CART_LINE_UNSHIPPABLE_MESSAGE =
  'One or more items cannot be shipped to your address. Please remove them or choose a different address before checking out.'

export interface RequestedLine {
  merchandiseId: string
  quantity: number
}

/**
 * True for a line that is present, wanted, priced normally, and yet
 * contributes nothing to the cart total.
 *
 * A positive quantity with a zero line cost is Shopify's signal that it cannot
 * price the line for this destination. It is the only cart-level signal that
 * survives a plain cart read, because `warnings` is returned on the mutation
 * payload rather than on the Cart itself, so a page that re-reads the cart would
 * otherwise lose the fact entirely.
 *
 * Requiring a usable `merchandise.price` (the variant's own unit price, NOT
 * the line's cost) is what keeps this distinct from a genuinely zero-price
 * product: that case belongs to lib/purchasability.ts#blockedCartLines and
 * must not also show up here with a shipping-flavored message.
 */
function isLineUnshippable(line: CartLine): boolean {
  const rawPrice = line.merchandise.price?.amount
  const price = rawPrice == null ? null : Number(rawPrice)
  return line.quantity > 0 && hasUsablePrice(price) && Number(line.cost?.totalAmount?.amount ?? 0) === 0
}

/**
 * Unshippable lines, named for display. Pure and log-free (no `server-only`
 * import in this module) so cart UI components can call it on every render to
 * keep the checkout-block panel accurate, not just at add-mutation time.
 */
export function unshippableCartLines(cart: Cart): { id: string; title: string }[] {
  return cart.lines.nodes.filter(isLineUnshippable).map((line) => ({
    id: line.merchandise.id,
    title: line.merchandise.product.title,
  }))
}

/**
 * Same detection, for server-side diagnostics right after a mutation.
 *
 * Deliberately not merged into findMissingMerchandise: an absent line and an
 * unshippable line need different messages, and only this one is fixable by
 * the customer changing address.
 */
export function findUnshippableLines(cart: Cart, context: string): string[] {
  const unshippable = unshippableCartLines(cart).map((line) => line.id)
  if (unshippable.length === 0) return []

  console.error(
    `[${context}] cart holds lines that cannot be priced for this destination`,
    JSON.stringify({
      lineCount: cart.lines.nodes.length,
      unshippableMerchandiseIds: unshippable,
      subtotal: cart.cost?.subtotalAmount?.amount,
    }),
  )
  return unshippable
}

/**
 * Merchandise GIDs that were requested but are absent from the returned cart.
 * Empty when everything arrived.
 *
 * Presence, not line count: adding a variant already in the cart merges into
 * the existing line rather than creating a new one, so comparing line totals
 * would report a false miss on a perfectly good merge.
 *
 * Returns rather than throws, because a dropped line still leaves a usable
 * cart. The caller hands back that cart along with the warning instead of
 * failing the whole interaction.
 */
export function findMissingMerchandise(
  cart: Cart,
  requested: RequestedLine[],
  context: string,
): string[] {
  const present = new Set(cart.lines.nodes.map((line) => line.merchandise.id))
  const missing = requested.map((l) => l.merchandiseId).filter((id) => !present.has(id))
  if (missing.length === 0) return []

  // Server-side diagnostics: exactly what was asked for and what came back, so
  // a dropped line can be investigated later without guessing at it.
  console.error(
    `[${context}] cart line mismatch`,
    JSON.stringify({
      requestedCount: requested.length,
      returnedLineCount: cart.lines.nodes.length,
      requested: requested.map((l) => ({ merchandiseId: l.merchandiseId, quantity: l.quantity })),
      returned: cart.lines.nodes.map((l) => ({
        merchandiseId: l.merchandise.id,
        quantity: l.quantity,
      })),
      missingMerchandiseIds: missing,
    }),
  )
  return missing
}
