'use client'

import { useState, useRef } from 'react'
import type { CollectionProduct } from '@/lib/shopify/types'
import type { ProductCardData } from '@/types/product'
import { QuickAddModal } from '@/components/product/QuickAddModal'
import {Plus} from "lucide-react";

function toCardData(product: CollectionProduct): ProductCardData {
  const image = product.images.nodes[0]
  const firstVariant = product.variants.nodes[0]
  const price = Math.round(
    parseFloat(firstVariant?.price.amount ?? product.priceRange.minVariantPrice.amount) * 100,
  )
  const compareAtPrice = firstVariant?.compareAtPrice
    ? Math.round(parseFloat(firstVariant.compareAtPrice.amount) * 100)
    : undefined

  return {
    handle: product.handle,
    title: product.title,
    image: {
      url: image?.url ?? '',
      altText: image?.altText ?? product.title,
      width: image?.width ?? 800,
      height: image?.height ?? 800,
    },
    brand: product.vendor,
    vendor: product.vendor,
    price,
    compareAtPrice,
    sku: '',
    available: product.availableForSale,
    hasFreeShipping: product.tags.includes('free-shipping'),
    isRx: product.tags.includes('rx-required'),
    variants: product.variants.nodes.map((v) => ({
      id: v.id,
      title: v.title,
      price: Math.round(parseFloat(v.price.amount) * 100),
      compareAtPrice: v.compareAtPrice
        ? Math.round(parseFloat(v.compareAtPrice.amount) * 100)
        : undefined,
      available: v.availableForSale,
    })),
  }
}

export function ShopifyQuickAddButton({ product }: { product: CollectionProduct }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  if (!product.availableForSale) return null

  const cardData = toCardData(product)

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label={`Quick add ${product.title}`}
        className="absolute bottom-2.5 right-2.5 z-10 w-9 h-9 bg-white rounded-full border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center text-navy-900 transition-colors duration-200 ease-out hover:bg-navy-900 hover:border-navy-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2"
      >
        <Plus size={18} />
      </button>
      {isOpen && <QuickAddModal product={cardData} onClose={handleClose} />}
    </>
  )
}
