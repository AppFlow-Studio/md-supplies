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
import { buildAddToCartEvent, buildViewCartEvent } from '@/lib/analytics/events'

interface CartContextValue {
  cart: Cart | null
  isOpen: boolean
  lastError: string | null
  addItem(variantId: string, qty: number): Promise<void>
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

  const addItem = useCallback(async (variantId: string, qty: number) => {
    try {
      setLastError(null)
      const updated = await addToCart(variantId, qty)
      setCart(updated)
      setIsOpen(true)
      const line = updated.lines.nodes.find((l) => l.merchandise.id === variantId)
      if (line) {
        track({
          ...buildAddToCartEvent({
            currency: line.cost.totalAmount.currencyCode,
            item: {
              item_id: line.merchandise.id,
              item_name: line.merchandise.product.title,
              price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
              quantity: qty,
            },
          }),
        })
      }
    } catch (err) {
      console.error('[CartProvider] addItem failed:', err)
      setLastError('Failed to add item. Please try again.')
    }
  }, [])

  const removeItem = useCallback(async (lineId: string) => {
    try {
      setLastError(null)
      const updated = await removeFromCart(lineId)
      setCart(updated)
    } catch (err) {
      console.error('[CartProvider] removeItem failed:', err)
      setLastError('Failed to remove item. Please try again.')
    }
  }, [])

  const updateItem = useCallback(async (lineId: string, qty: number) => {
    try {
      setLastError(null)
      const updated = await updateCartLine(lineId, qty)
      setCart(updated)
    } catch (err) {
      console.error('[CartProvider] updateItem failed:', err)
      setLastError('Failed to update quantity. Please try again.')
    }
  }, [])

  const openCart = useCallback(() => {
    setIsOpen(true)
    if (cart && cart.lines.nodes.length > 0) {
      track({
        ...buildViewCartEvent({
          currency: cart.cost.subtotalAmount.currencyCode,
          items: cart.lines.nodes.map((line) => ({
            item_id: line.merchandise.id,
            item_name: line.merchandise.product.title,
            price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
            quantity: line.quantity,
          })),
        }),
      })
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
