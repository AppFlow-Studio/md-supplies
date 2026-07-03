'use client'

import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyQuickAddButton } from './ShopifyQuickAddButton'
import { ProductImage } from '@/components/shared/ProductImage'
import { track } from '@/lib/analytics/track'
import { buildSelectItemEvent, toGA4Item, currencyOf } from '@/lib/analytics/events'

interface Props {
  product: CollectionProduct
  categorySlug?: string
  itemListId?: string
  itemListName?: string
  index?: number
}

export function ShopifyProductCard({ product, categorySlug, itemListId, itemListName, index = 0 }: Props) {
  const variant = product.variants.nodes[0]
  const price = parseFloat(variant?.price.amount ?? product.priceRange.minVariantPrice.amount)
  const compareAt = variant?.compareAtPrice
    ? parseFloat(variant.compareAtPrice.amount)
    : null
  const image = product.images.nodes[0]
  const hasDiscount = compareAt !== null && compareAt > price

  const href = categorySlug
    ? `/category/${categorySlug}/${product.handle}`
    : `/product/${product.handle}`

  function handleSelect() {
    track({
      ...buildSelectItemEvent({
        currency: currencyOf(product),
        itemListId: itemListId ?? 'unknown',
        itemListName: itemListName ?? 'unknown',
        item: toGA4Item(product),
        index,
      }),
    })
  }

  return (
    <div className="group relative bg-white flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden bg-white aspect-square">
        <Link href={href} onClick={handleSelect} className="block w-full h-full">
          <ProductImage
            src={image?.url}
            alt={image?.altText ?? product.title}
            categoryHandle={categorySlug}
          />

          {/* Stock badge — top-left corner */}
          {!product.availableForSale && (
            <span className="absolute top-2 left-2 bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 tracking-[0.2px] uppercase">
              Out of Stock
            </span>
          )}

          {!product.availableForSale && (
            <div className="absolute inset-0 bg-white/60" />
          )}
        </Link>

        {/* Quick add — sibling of the image link, not nested inside it, so clicks never navigate */}
        <ShopifyQuickAddButton product={product} />
      </div>

      {/* Info */}
      <Link href={href} onClick={handleSelect} className="px-[22px] pt-[19px] pb-[22px] flex flex-col">
        <span className="text-[#0086b1] text-[13px] font-semibold tracking-[0.26px] uppercase leading-[25px]">
          {product.vendor}
        </span>
        <p className="text-black text-[14px] font-semibold tracking-[0.28px] leading-5 line-clamp-2 mb-[30px]">
          {product.title}
        </p>
        {(product.tags.includes('free-shipping') || product.tags.includes('rx-required')) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.tags.includes('free-shipping') && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-teal-500 text-white">
                Free Shipping
              </span>
            )}
            {product.tags.includes('rx-required') && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-amber-600 text-white">
                RX Only
              </span>
            )}
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-black text-[18px] font-bold tracking-[0.36px]">
            ${price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-gray-500 text-[14px] line-through tracking-[0.28px]">
              ${compareAt!.toFixed(2)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
