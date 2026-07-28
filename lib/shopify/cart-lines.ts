import type { Cart } from './types'

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

export interface RequestedLine {
  merchandiseId: string
  quantity: number
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
