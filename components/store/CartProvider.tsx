'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { addToCart, getCart, removeFromCart, updateCartLine } from '@/app/actions/cart'
import type { Cart } from '@/lib/shopify/types'
import { track } from '@/lib/analytics/track'
import {
  buildAddToCartEvent,
  buildRemoveFromCartEvent,
  buildViewCartEvent,
  cartLineToGA4Item,
  cartCurrency,
} from '@/lib/analytics/events'

interface CartContextValue {
  cart: Cart | null
  isOpen: boolean
  lastError: string | null
  /** Resolves true only when Shopify actually added the requested line. */
  addItem(variantId: string, qty: number): Promise<boolean>
  removeItem(lineId: string): Promise<void>
  updateItem(lineId: string, qty: number): Promise<void>
  openCart(): void
  closeCart(): void
  clearError(): void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  // The cart hydrates client-side (the cart_id cookie can't be read during a
  // server render without opting the whole route out of ISR — audit H1).
  // `prev ?? fetched` keeps a cart the user already mutated before this
  // initial fetch resolved.
  useEffect(() => {
    let cancelled = false
    getCart()
      .then((fetched) => {
        if (!cancelled && fetched) setCart((prev) => prev ?? fetched)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const addItem = useCallback(async (variantId: string, qty: number): Promise<boolean> => {
    try {
      setLastError(null)
      const { cart: updated, warning } = await addToCart(variantId, qty)
      setCart(updated)
      setIsOpen(true)
      // Shopify can return a cart without a line we asked for and without an
      // error. The cart is still shown, but the customer is told rather than
      // left to notice the gap at checkout.
      if (warning) setLastError(warning)
      const line = updated.lines.nodes.find((l) => l.merchandise.id === variantId)
      // Report the real outcome so callers never show "Added!" for a line
      // Shopify silently dropped (Phase 11).
      if (!line) return false
      // `qty` (what was just added), not `line.quantity` (the line's new
      // running total) — adding 2 to a line that already held 3 is an
      // add_to_cart of 2, not of 5.
      track(
        buildAddToCartEvent({
          currency: line.cost.totalAmount.currencyCode,
          item: cartLineToGA4Item(line, qty),
        }),
      )
      return !warning
    } catch (err) {
      console.error('[CartProvider] addItem failed:', err)
      setLastError('Failed to add item. Please try again.')
      return false
    }
  }, [])

  const removeItem = useCallback(async (lineId: string) => {
    try {
      setLastError(null)
      // Captured BEFORE the mutation: once Shopify has removed the line there
      // is nothing left to describe. Tracked only after the call succeeds, so
      // a failed removal never reports one.
      const removed = cart?.lines.nodes.find((l) => l.id === lineId) ?? null
      const currency = cart ? cartCurrency(cart) : null
      const updated = await removeFromCart(lineId)
      setCart(updated)
      if (removed && currency) {
        track(
          buildRemoveFromCartEvent({ currency, items: [cartLineToGA4Item(removed)] }),
        )
      }
    } catch (err) {
      console.error('[CartProvider] removeItem failed:', err)
      setLastError('Failed to remove item. Please try again.')
    }
  }, [cart])

  const updateItem = useCallback(async (lineId: string, qty: number) => {
    try {
      setLastError(null)
      const before = cart?.lines.nodes.find((l) => l.id === lineId) ?? null
      const currency = cart ? cartCurrency(cart) : null
      const updated = await updateCartLine(lineId, qty)
      setCart(updated)
      // A quantity change is an add or a removal of the DIFFERENCE. GA4 has no
      // "quantity changed" event, and reporting the whole line would double
      // count against the original add_to_cart.
      if (!before || !currency) return
      const delta = qty - before.quantity
      if (delta === 0) return
      const item = cartLineToGA4Item(before, Math.abs(delta))
      track(
        delta > 0
          ? buildAddToCartEvent({ currency, item })
          : buildRemoveFromCartEvent({ currency, items: [item] }),
      )
    } catch (err) {
      console.error('[CartProvider] updateItem failed:', err)
      setLastError('Failed to update quantity. Please try again.')
    }
  }, [cart])

  const openCart = useCallback(() => {
    setIsOpen(true)
    if (cart && cart.lines.nodes.length > 0) {
      track(
        buildViewCartEvent({
          currency: cartCurrency(cart),
          items: cart.lines.nodes.map((line) => cartLineToGA4Item(line)),
        }),
      )
    }
  }, [cart])

  const closeCart = useCallback(() => setIsOpen(false), [])
  const clearError = useCallback(() => setLastError(null), [])

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        lastError,
        addItem,
        removeItem,
        updateItem,
        openCart,
        closeCart,
        clearError,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
