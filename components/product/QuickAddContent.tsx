'use client'

import { useState } from 'react'
import type { ProductCardData } from '@/types/product'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

interface Props {
  product: ProductCardData
  titleId: string
}

export function QuickAddContent({ product, titleId }: Props) {
  const availableVariants = product.variants.filter((v) => v.available)
  const [selectedVariantId, setSelectedVariantId] = useState(
    availableVariants[0]?.id ?? product.variants[0]?.id ?? '',
  )
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null
  const displayPrice = selectedVariant?.price ?? product.price
  const canAdd = selectedVariant?.available ?? false

  function handleAdd() {
    if (!canAdd) return
    // Cart integration hook point
    console.log('Quick add:', { variantId: selectedVariantId, qty })
    setAdded(true)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Product image + title */}
      <div className="flex gap-3 items-start">
        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-neutral-50 border border-gray-200">
          <img
            src={product.image.url}
            alt={product.image.altText}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-navy-900 leading-snug line-clamp-2">
            {product.title}
          </h2>
          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
          <p className="text-sm font-bold text-navy-900">{formatCents(displayPrice)}</p>
        </div>
      </div>

      {/* Variant selector */}
      {product.variants.length > 1 && (
        <div>
          <label htmlFor="quick-add-variant" className="block text-sm font-medium text-navy-900 mb-1.5">
            Variant
          </label>
          <select
            id="quick-add-variant"
            value={selectedVariantId}
            onChange={(e) => { setSelectedVariantId(e.target.value); setAdded(false) }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id} disabled={!v.available}>
                {v.title} — {formatCents(v.price)}{!v.available ? ' (unavailable)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-navy-900 mb-1.5">Quantity</label>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden w-fit">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="w-9 h-9 flex items-center justify-center text-navy-900 hover:bg-neutral-100 transition-colors text-lg font-medium"
          >
            −
          </button>
          <span className="w-10 h-9 flex items-center justify-center text-sm font-medium text-navy-900 border-x border-gray-200">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
            className="w-9 h-9 flex items-center justify-center text-navy-900 hover:bg-neutral-100 transition-colors text-lg font-medium"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={!canAdd || added}
        className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
          added
            ? 'bg-green-600 text-white cursor-default'
            : canAdd
              ? 'bg-navy-900 text-white hover:bg-navy-950'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        {added ? '✓ Added to Cart' : canAdd ? 'Add to Cart' : 'Unavailable'}
      </button>
    </div>
  )
}
