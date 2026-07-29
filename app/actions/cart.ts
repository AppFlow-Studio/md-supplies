'use server'
import 'server-only'

import { cookies } from 'next/headers'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { attachCartShippingDisplay } from '@/lib/shipping-resolver/cart'
import {
  findMissingMerchandise,
  findUnshippableLines,
  CART_LINE_MISSING_MESSAGE,
  CART_LINE_UNSHIPPABLE_MESSAGE,
} from '@/lib/shopify/cart-lines'
import {
  CREATE_CART,
  ADD_CART_LINES,
  UPDATE_CART_LINES,
  REMOVE_CART_LINES,
  GET_CART,
  SET_CART_ATTRIBUTES,
} from '@/lib/shopify/queries/cart'
import type { Cart } from '@/lib/shopify/types'

const CART_COOKIE = 'cart_id'

// Cart data is per-user and cart mutations must never be replayed from the
// shared data cache — every storefrontFetch below opts out of caching.
const NO_STORE = { cache: 'no-store' } as const

type UserError = { message: string }

function assertNoUserErrors(errors: UserError[] | undefined, context: string) {
  if (errors?.length) {
    throw new Error(`${context}: ${errors.map((e) => e.message).join(', ')}`)
  }
}

export async function getCart(): Promise<Cart | null> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) return null
  try {
    const data = await storefrontFetch<{ cart: Cart | null }>(GET_CART, { cartId }, NO_STORE)
    return data.cart ? attachCartShippingDisplay(data.cart) : null
  } catch (err) {
    console.error('[getCart] failed:', err)
    return null
  }
}

/**
 * An add always yields a usable cart. `warning` is non-null when Shopify did
 * not return a line we asked for: the cart is still valid and still shown, but
 * the customer is told the item did not make it.
 *
 * A returned value rather than a thrown error on purpose. Next redacts server
 * action error messages before they reach the browser, so an exception could
 * not carry this wording to the customer.
 */
export type AddToCartResult = { cart: Cart; warning: string | null }

async function createCart(variantId: string, quantity: number): Promise<AddToCartResult> {
  const jar = await cookies()
  const data = await storefrontFetch<{ cartCreate: { cart: Cart; userErrors: UserError[] } }>(
    CREATE_CART,
    { lines: [{ merchandiseId: variantId, quantity }] },
    NO_STORE,
  )
  assertNoUserErrors(data.cartCreate.userErrors, 'cartCreate')
  const cart = data.cartCreate.cart
  // Claim the cart before validating its contents. If a line went missing we
  // still want the customer to own this cart rather than orphan it in Shopify
  // and silently start another one on their next click.
  jar.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  const missing = findMissingMerchandise(cart, [{ merchandiseId: variantId, quantity }], 'cartCreate')
  // A line that arrived but cannot be priced for the destination is a different
  // problem from one that never arrived, and only this one is fixable by the
  // customer. Missing wins when both are true: an absent item is the bigger
  // surprise, and its message does not promise an address change will help.
  const unshippable = findUnshippableLines(cart, 'cartCreate')
  return {
    cart: attachCartShippingDisplay(cart),
    warning: missing.length
      ? CART_LINE_MISSING_MESSAGE
      : unshippable.length
        ? CART_LINE_UNSHIPPABLE_MESSAGE
        : null,
  }
}

export async function addToCart(variantId: string, quantity: number): Promise<AddToCartResult> {
  const jar = await cookies()
  const cartId = jar.get(CART_COOKIE)?.value

  if (!cartId) return createCart(variantId, quantity)

  try {
    const data = await storefrontFetch<{ cartLinesAdd: { cart: Cart; userErrors: UserError[] } }>(
      ADD_CART_LINES,
      { cartId, lines: [{ merchandiseId: variantId, quantity }] },
      NO_STORE,
    )
    assertNoUserErrors(data.cartLinesAdd.userErrors, 'cartLinesAdd')
    const cart = data.cartLinesAdd.cart
    // A missing line is a real answer about this cart, not a sign the cart is
    // gone, so it is reported rather than retried. Rebuilding the cart here
    // would discard everything the customer already had and still not add the
    // item.
    const missing = findMissingMerchandise(cart, [{ merchandiseId: variantId, quantity }], 'cartLinesAdd')
    const unshippable = findUnshippableLines(cart, 'cartLinesAdd')
    return {
      cart: attachCartShippingDisplay(cart),
      warning: missing.length
        ? CART_LINE_MISSING_MESSAGE
        : unshippable.length
          ? CART_LINE_UNSHIPPABLE_MESSAGE
          : null,
    }
  } catch {
    // The cart may be expired: clear the stale cookie and start over.
    jar.delete(CART_COOKIE)
    return createCart(variantId, quantity)
  }
}

export async function updateCartLine(lineId: string, quantity: number): Promise<Cart> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) throw new Error('No cart')
  const data = await storefrontFetch<{ cartLinesUpdate: { cart: Cart; userErrors: UserError[] } }>(
    UPDATE_CART_LINES,
    { cartId, lines: [{ id: lineId, quantity }] },
    NO_STORE,
  )
  assertNoUserErrors(data.cartLinesUpdate.userErrors, 'cartLinesUpdate')
  return attachCartShippingDisplay(data.cartLinesUpdate.cart)
}

export async function removeFromCart(lineId: string): Promise<Cart> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) throw new Error('No cart')
  const data = await storefrontFetch<{ cartLinesRemove: { cart: Cart; userErrors: UserError[] } }>(
    REMOVE_CART_LINES,
    { cartId, lineIds: [lineId] },
    NO_STORE,
  )
  assertNoUserErrors(data.cartLinesRemove.userErrors, 'cartLinesRemove')
  return attachCartShippingDisplay(data.cartLinesRemove.cart)
}

export async function setCartAttribute(key: string, value: string): Promise<Cart> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) throw new Error('No cart')
  const data = await storefrontFetch<{ cartAttributesUpdate: { cart: Cart; userErrors: UserError[] } }>(
    SET_CART_ATTRIBUTES,
    { cartId, attributes: [{ key, value }] },
    NO_STORE,
  )
  assertNoUserErrors(data.cartAttributesUpdate.userErrors, 'cartAttributesUpdate')
  return attachCartShippingDisplay(data.cartAttributesUpdate.cart)
}
