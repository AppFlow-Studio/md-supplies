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
        className="absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-navy-900 hover:text-white text-navy-900"
      >
        <Plus size={16} />
      </button>
      {isOpen && <QuickAddModal product={cardData} onClose={handleClose} />}
    </>
  )
}
