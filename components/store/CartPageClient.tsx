'use client'

import { useEffect } from 'react'
import { type MouseEvent } from 'react'
import { X, Plus, Minus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { CartToast } from './CartToast'
import { track } from '@/lib/analytics/track'
import { buildViewCartEvent, buildBeginCheckoutEvent } from '@/lib/analytics/events'
import { clientIdFromGaCookie } from '@/lib/analytics/clientId'
import { setCartAttribute } from '@/app/actions/cart'

export function CartPageClient() {
  const { cart, removeItem, updateItem } = useCart()
  const lines = cart?.lines.nodes ?? []

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (cart && cart.lines.nodes.length > 0) {
      track(
        buildViewCartEvent({
          currency: cart.cost.subtotalAmount.currencyCode,
          items: cart.lines.nodes.map((line) => ({
            item_id: line.merchandise.id,
            item_name: line.merchandise.product.title,
            price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
            quantity: line.quantity,
          })),
        }),
      )
    }
  }, [])

  async function handleCheckoutClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!cart) return
    e.preventDefault()
    track(
      buildBeginCheckoutEvent({
        currency: cart.cost.subtotalAmount.currencyCode,
        items: lines.map((line) => ({
          item_id: line.merchandise.id,
          item_name: line.merchandise.product.title,
          price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
          quantity: line.quantity,
        })),
      }),
    )
    try {
      const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/)
      const clientId = match ? clientIdFromGaCookie(decodeURIComponent(match[1])) : null
      if (clientId) await setCartAttribute('ga_client_id', clientId)
    } catch (err) {
      console.error('[CartPageClient] failed to stamp ga_client_id:', err)
    }
    window.location.href = cart.checkoutUrl
  }

  if (lines.length === 0 || !cart) {
    return (
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold mb-8">Your Cart</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <ShoppingCart size={56} className="text-gray-300" />
          <p className="text-gray-500 text-[15px]">Your cart is empty</p>
          <Link href="/" className="text-teal-500 text-[14px] font-semibold hover:underline">
            Continue Shopping
          </Link>
        </div>
        <CartToast />
      </div>
    )
  }

  return (
    <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
      <h1 className="text-navy-900 text-[32px] font-bold mb-8">
        Your Cart ({cart.totalQuantity})
      </h1>
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-12 lg:items-start">
        {/* Line items */}
        <div className="flex flex-col divide-y divide-gray-200">
          {lines.map((line) => {
            const image = line.merchandise.product.images.nodes[0]
            const variantTitle = line.merchandise.title
            const lineTotal = parseFloat(line.cost.totalAmount.amount)

            return (
              <div key={line.id} className="flex gap-4 py-6">
                <div className="w-[72px] h-[72px] bg-neutral-50 shrink-0 overflow-hidden">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.altText ?? line.merchandise.product.title}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${line.merchandise.product.handle}`}
                    className="text-navy-900 text-[14px] font-semibold leading-5 hover:text-teal-500 transition-colors line-clamp-2 block mb-1"
                  >
                    {line.merchandise.product.title}
                  </Link>
                  {variantTitle !== 'Default Title' && (
                    <p className="text-gray-500 text-[12px] tracking-[0.24px]">{variantTitle}</p>
                  )}
                  {line.merchandise.sku && (
                    <p className="text-gray-400 text-[11px] tracking-[0.22px] mb-1">
                      SKU: {line.merchandise.sku}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 h-[32px]">
                      <button
                        type="button"
                        onClick={() =>
                          line.quantity <= 1
                            ? removeItem(line.id)
                            : updateItem(line.id, line.quantity - 1)
                        }
                        className="w-8 h-full flex items-center justify-center text-navy-900 hover:bg-neutral-50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 h-full flex items-center justify-center text-navy-900 text-[14px] border-x border-gray-200">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateItem(line.id, line.quantity + 1)}
                        className="w-8 h-full flex items-center justify-center text-navy-900 hover:bg-neutral-50 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-navy-900 text-[15px] font-semibold">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(line.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors shrink-0 self-start mt-0.5"
                  aria-label={`Remove ${line.merchandise.product.title}`}
                >
                  <X size={16} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div className="mt-8 lg:mt-0 lg:sticky lg:top-6 border border-gray-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="text-navy-900 text-[16px] font-semibold">Order Summary</h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-[15px] tracking-[0.3px]">Subtotal</span>
            <span className="text-navy-900 text-[20px] font-bold">
              ${parseFloat(cart.cost.subtotalAmount.amount).toFixed(2)}
            </span>
          </div>
          <p className="text-gray-500 text-[12px] tracking-[0.24px]">
            Shipping calculated at checkout
          </p>
          <a
            href={cart.checkoutUrl}
            onClick={handleCheckoutClick}
            className="bg-navy-900 text-white h-[52px] flex items-center justify-center text-[15px] font-semibold tracking-[0.3px] uppercase hover:bg-navy-950 transition-colors"
          >
            Proceed to Checkout
          </a>
        </div>
      </div>
      <CartToast />
    </div>
  )
}
