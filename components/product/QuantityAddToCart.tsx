'use client'

import { useState } from 'react'
import type { ProductVariant } from '@/types/product'

interface Props {
  selectedVariant: ProductVariant | null
}

export function QuantityAddToCart({ selectedVariant }: Props) {
  const [qty, setQty] = useState(1)

  const available = selectedVariant?.available ?? false

  function decrement() {
    setQty((q) => Math.max(1, q - 1))
  }

  function increment() {
    setQty((q) => q + 1)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val >= 1) setQty(val)
  }

  function handleAddToCart() {
    // Cart integration is out of scope — this is the event hook point
    console.log('Add to cart:', { variantId: selectedVariant?.id, qty })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={decrement}
            aria-label="Decrease quantity"
            className="w-10 h-10 flex items-center justify-center text-navy-900 hover:bg-neutral-100 transition-colors text-lg font-medium"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={handleInput}
            aria-label="Quantity"
            className="w-12 h-10 text-center text-sm font-medium text-navy-900 border-x border-gray-200 bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={increment}
            aria-label="Increase quantity"
            className="w-10 h-10 flex items-center justify-center text-navy-900 hover:bg-neutral-100 transition-colors text-lg font-medium"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={!available || !selectedVariant}
        className={`w-full py-3 px-6 rounded-lg text-sm font-semibold transition-colors ${
          available && selectedVariant
            ? 'bg-navy-900 text-white hover:bg-navy-950'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        {available && selectedVariant ? 'Add to Cart' : 'Unavailable'}
      </button>
    </div>
  )
}
