'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { addToCart, removeFromCart, updateCartLine } from '@/app/actions/cart'
import type { Cart } from '@/lib/shopify/types'
import { track } from '@/lib/analytics/track'
import { buildAddToCartEvent, buildViewCartEvent } from '@/lib/analytics/events'

interface CartContextValue {
  cart: Cart | null
  isOpen: boolean
  addItem(variantId: string, qty: number): Promise<void>
  removeItem(lineId: string): Promise<void>
  updateItem(lineId: string, qty: number): Promise<void>
  openCart(): void
  closeCart(): void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({
  children,
  initialCart,
}: {
  children: ReactNode
  initialCart: Cart | null
}) {
  const [cart, setCart] = useState<Cart | null>(initialCart)
  const [isOpen, setIsOpen] = useState(false)

  const addItem = useCallback(async (variantId: string, qty: number) => {
    try {
      const updated = await addToCart(variantId, qty)
      setCart(updated)
      setIsOpen(true)
      const line = updated.lines.nodes.find((l) => l.merchandise.id === variantId)
      if (line) {
        track(
          {
            ...buildAddToCartEvent({
              currency: line.cost.totalAmount.currencyCode,
              item: {
                item_id: line.merchandise.id,
                item_name: line.merchandise.product.title,
                price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
                quantity: qty,
              },
            }),
          },
        )
      }
    } catch (err) {
      console.error('[CartProvider] addItem failed:', err)
    }
  }, [])

  const removeItem = useCallback(async (lineId: string) => {
    try {
      const updated = await removeFromCart(lineId)
      setCart(updated)
    } catch (err) {
      console.error('[CartProvider] removeItem failed:', err)
    }
  }, [])

  const updateItem = useCallback(async (lineId: string, qty: number) => {
    try {
      const updated = await updateCartLine(lineId, qty)
      setCart(updated)
    } catch (err) {
      console.error('[CartProvider] updateItem failed:', err)
    }
  }, [])

  const openCart = useCallback(() => {
    setIsOpen(true)
    if (cart && cart.lines.nodes.length > 0) {
      track(
        {
          ...buildViewCartEvent({
            currency: cart.cost.subtotalAmount.currencyCode,
            items: cart.lines.nodes.map((line) => ({
              item_id: line.merchandise.id,
              item_name: line.merchandise.product.title,
              price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
              quantity: line.quantity,
            })),
          }),
        },
      )
    }
  }, [cart])

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        addItem,
        removeItem,
        updateItem,
        openCart,
        closeCart: () => setIsOpen(false),
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
