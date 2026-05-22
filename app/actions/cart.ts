'use server'
import 'server-only'

import { cookies } from 'next/headers'
import { storefrontFetch } from '@/lib/shopify/storefront'
import {
  CREATE_CART,
  ADD_CART_LINES,
  UPDATE_CART_LINES,
  REMOVE_CART_LINES,
  GET_CART,
} from '@/lib/shopify/queries/cart'
import type { Cart } from '@/lib/shopify/types'

const CART_COOKIE = 'cart_id'

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
    const data = await storefrontFetch<{ cart: Cart | null }>(GET_CART, { cartId })
    return data.cart
  } catch (err) {
    console.error('[getCart] failed:', err)
    return null
  }
}

async function createCart(variantId: string, quantity: number): Promise<Cart> {
  const jar = await cookies()
  const data = await storefrontFetch<{ cartCreate: { cart: Cart; userErrors: UserError[] } }>(
    CREATE_CART,
    { lines: [{ merchandiseId: variantId, quantity }] },
  )
  assertNoUserErrors(data.cartCreate.userErrors, 'cartCreate')
  const cart = data.cartCreate.cart
  jar.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return cart
}

export async function addToCart(variantId: string, quantity: number): Promise<Cart> {
  const jar = await cookies()
  const cartId = jar.get(CART_COOKIE)?.value

  if (!cartId) return createCart(variantId, quantity)

  try {
    const data = await storefrontFetch<{ cartLinesAdd: { cart: Cart; userErrors: UserError[] } }>(
      ADD_CART_LINES,
      { cartId, lines: [{ merchandiseId: variantId, quantity }] },
    )
    assertNoUserErrors(data.cartLinesAdd.userErrors, 'cartLinesAdd')
    return data.cartLinesAdd.cart
  } catch {
    // Cart may be expired — create a fresh one and clear the stale cookie
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
  )
  assertNoUserErrors(data.cartLinesUpdate.userErrors, 'cartLinesUpdate')
  return data.cartLinesUpdate.cart
}

export async function removeFromCart(lineId: string): Promise<Cart> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) throw new Error('No cart')
  const data = await storefrontFetch<{ cartLinesRemove: { cart: Cart; userErrors: UserError[] } }>(
    REMOVE_CART_LINES,
    { cartId, lineIds: [lineId] },
  )
  assertNoUserErrors(data.cartLinesRemove.userErrors, 'cartLinesRemove')
  return data.cartLinesRemove.cart
}
