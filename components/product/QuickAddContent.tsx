'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { ShieldCheck, Truck, RotateCcw, Loader2, Minus, Plus } from 'lucide-react'
import { useCart } from '@/components/store/CartProvider'
import type { ProductCardData } from '@/types/product'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

interface Props {
  product: ProductCardData
  titleId: string
}

export function QuickAddContent({ product, titleId }: Props) {
  const { addItem } = useCart()
  const [isPending, startTransition] = useTransition()

  const allImages = product.images && product.images.length > 0
    ? product.images
    : [product.image]

  const availableVariants = product.variants.filter((v) => v.available)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState(
    availableVariants[0]?.id ?? product.variants[0]?.id ?? '',
  )
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null
  const displayPrice = selectedVariant?.price ?? product.price
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice
  const canAdd = (selectedVariant?.available ?? false) && !isPending
  const savePct =
    compareAtPrice && compareAtPrice > displayPrice
      ? Math.round((1 - displayPrice / compareAtPrice) * 100)
      : null

  function handleAdd() {
    if (!canAdd || !selectedVariantId) return
    startTransition(async () => {
      await addItem(selectedVariantId, qty)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    })
  }

  function handleSelectVariant(id: string) {
    setSelectedVariantId(id)
    setAdded(false)
  }

  return (
    <>
      {/* Left panel — image gallery */}
      <div className="relative bg-[#f9faf9] sm:w-[43%] shrink-0 flex flex-col items-center justify-center gap-3 p-6 sm:overflow-y-auto min-h-[200px]">
        {product.hasFreeShipping && (
          <div className="absolute top-4 left-4 bg-[#006e46] px-3 py-1.5">
            <span className="text-[#f9faf9] text-[13px] font-bold leading-[28px] tracking-[0.26px]">
              FREE SHIPPING
            </span>
          </div>
        )}

        {/* Main image */}
        <div className="relative w-full aspect-square max-w-[340px]">
          <Image
            src={allImages[activeImg]?.url ?? ''}
            alt={allImages[activeImg]?.altText ?? product.title}
            fill
            sizes="(max-width: 640px) 80vw, (max-width: 920px) 40vw, 340px"
            className="object-contain"
          />
        </div>

        {/* Thumbnail strip — only when more than one image */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full max-w-[340px]">
            {allImages.slice(0, 6).map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImg(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={i === activeImg}
                className={`relative size-[64px] shrink-0 overflow-hidden bg-[#f9faf9] transition-colors ${
                  i === activeImg
                    ? 'border-[3px] border-navy-900'
                    : 'border border-gray-200 hover:border-navy-900'
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.altText || `Product image ${i + 1}`}
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — details */}
      <div className="flex-1 overflow-y-auto py-10 px-8 flex flex-col gap-4 min-w-0">
        {/* Vendor */}
        <p className="text-[#0086b1] text-[15px] font-semibold tracking-[0.3px]">
          {product.vendor || product.brand}
        </p>

        {/* Title */}
        <h2
          id={titleId}
          className="text-[25px] font-semibold text-black leading-[30px] tracking-[0.5px]"
        >
          {product.title}
        </h2>

        {/* SKU */}
        {product.sku && (
          <p className="text-[#666664] text-[15px] font-semibold leading-[28px] tracking-[0.3px]">
            SKU: {product.sku}
          </p>
        )}

        {/* In-stock indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`size-[8px] rounded-full shrink-0 ${selectedVariant?.available ? 'bg-green-500' : 'bg-red-400'}`}
          />
          <p className="text-gray-500 text-[13px] tracking-[0.26px]">
            {selectedVariant?.available ? 'In Stock' : 'Out of Stock'}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200" />

        {/* Variant selector */}
        {product.variants.length > 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-[#0f2337] text-[15px] font-semibold leading-[28px] tracking-[0.3px]">
              SELECT UNIT
            </p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const isSelected = v.id === selectedVariantId
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariant(v.id)}
                    disabled={!v.available}
                    className={`flex flex-col items-center justify-center h-[58px] px-3 min-w-[90px] border transition-colors ${
                      isSelected
                        ? 'bg-[rgba(102,102,100,0.1)] border-[#0b172b]'
                        : v.available
                          ? 'border-[rgba(102,102,100,0.5)] hover:border-[#0b172b]'
                          : 'border-[rgba(102,102,100,0.3)] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[#0f2337] text-[14px] font-semibold leading-[28px] tracking-[0.28px]">
                      {v.title}
                    </span>
                    <span className="text-[#666664] text-[13px] font-medium leading-[28px] tracking-[0.26px]">
                      {formatCents(v.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Price row */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-black text-[35px] font-extrabold leading-none tracking-[0.7px]">
            {formatCents(displayPrice)}
          </span>
          {compareAtPrice && compareAtPrice > displayPrice && (
            <>
              <span className="text-gray-500 text-[15px] line-through tracking-[0.3px]">
                {formatCents(compareAtPrice)}
              </span>
              {savePct !== null && (
                <span className="text-[#006e46] text-[13px] font-semibold tracking-[0.26px]">
                  Save {savePct}%
                </span>
              )}
            </>
          )}
        </div>

        {/* Qty stepper + ADD TO CART */}
        <div className="flex gap-3">
          <div className="flex border border-[rgba(102,102,100,0.5)] h-[56px] w-[167px] shrink-0">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="flex-1 flex items-center justify-center text-gray-500 hover:bg-neutral-50 transition-colors"
            >
              <Minus size={16} />
            </button>
            <div className="flex items-center justify-center w-[55px] border-x border-[rgba(102,102,100,0.5)] text-navy-900 text-[18px] font-bold">
              {qty}
            </div>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
              className="flex-1 flex items-center justify-center text-gray-500 hover:bg-neutral-50 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || added}
            className={`flex-1 h-[56px] flex items-center justify-center gap-2 text-[15px] font-semibold tracking-[0.3px] uppercase transition-colors ${
              added
                ? 'bg-[#006e46] text-white cursor-default'
                : canAdd
                  ? 'bg-navy-900 text-white hover:bg-navy-950'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {added ? '✓ Added to Cart' : isPending ? 'Adding…' : canAdd ? 'Add to Cart' : 'Unavailable'}
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex items-center gap-5 flex-wrap pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-[#666664] shrink-0" />
            <span className="text-[#666664] text-[11px] tracking-[0.22px]">QUALITY CERTIFIED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck size={12} className="text-[#666664] shrink-0" />
            <span className="text-[#666664] text-[11px] tracking-[0.22px]">2-3 DAY DELIVERY</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RotateCcw size={12} className="text-[#666664] shrink-0" />
            <span className="text-[#666664] text-[11px] tracking-[0.22px]">30-DAY RETURN</span>
          </div>
        </div>
      </div>
    </>
  )
}
