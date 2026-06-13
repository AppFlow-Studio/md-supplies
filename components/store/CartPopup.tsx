'use client'

import { X, Plus, Minus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useCart } from './CartProvider'

export function CartPopup() {
  const { cart, isOpen, closeCart, removeItem, updateItem } = useCart()
  const lines = cart?.lines.nodes ?? []
    console.log(cart)
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-[440px] bg-white z-50 flex flex-col shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 shrink-0">
          <span className="text-navy-900 text-[18px] font-semibold tracking-[0.36px]">
            Your Cart ({cart?.totalQuantity ?? 0})
          </span>
          <button
            onClick={closeCart}
            className="text-gray-500 hover:text-navy-900 transition-colors"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Line items */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <ShoppingCart size={48} className="text-gray-300" />
              <p className="text-gray-500 text-[15px] tracking-[0.3px]">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="text-teal-500 text-[14px] font-semibold hover:underline"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-200">
              {lines.map((line) => {
                const image = line.merchandise.product.images.nodes[0]
                const variantTitle = line.merchandise.title
                const lineTotal = parseFloat(line.cost.totalAmount.amount)

                return (
                  <div key={line.id} className="flex gap-4 py-5">
                    {/* Image */}
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

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${line.merchandise.product.handle}`}
                        onClick={closeCart}
                        className="text-navy-900 text-[14px] font-semibold leading-5 hover:text-teal-500 transition-colors line-clamp-2 block mb-1"
                      >
                        {line.merchandise.product.title}
                      </Link>
                      {variantTitle !== 'Default Title' && (
                        <p className="text-gray-500 text-[12px] tracking-[0.24px] mb-3">
                          {variantTitle}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {/* Qty stepper */}
                        <div className="flex items-center border border-gray-200 h-[32px]">
                          <button
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

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(line.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors shrink-0 self-start mt-0.5"
                      aria-label="Remove item"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && cart && (
          <div className="border-t border-gray-200 px-6 py-6 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[15px] tracking-[0.3px]">Subtotal</span>
              <span className="text-navy-900 text-[20px] font-bold">
                ${parseFloat(cart.cost.subtotalAmount.amount).toFixed(2)}
              </span>
            </div>
            <p className="text-gray-500 text-[12px] tracking-[0.24px]">
              Shipping and taxes calculated at checkout
            </p>
            <a
              href={cart.checkoutUrl}
              className="bg-navy-900 text-white h-[52px] flex items-center justify-center text-[15px] font-semibold tracking-[0.3px] uppercase hover:bg-navy-950 transition-colors"
            >
              Proceed to Checkout
            </a>
            <button
              onClick={closeCart}
              className="text-navy-900 text-[14px] font-semibold text-center hover:underline"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
