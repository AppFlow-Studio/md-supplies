'use client'

import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyQuickAddButton } from './ShopifyQuickAddButton'
import { ProductImage } from '@/components/shared/ProductImage'
import { track } from '@/lib/analytics/track'
import { buildSelectItemEvent, toGA4Item, currencyOf } from '@/lib/analytics/events'
import { cleanShopifyAlt } from '@/lib/alt-text'
import { ShippingBadge } from '@/components/product/ShippingBadge'
import { resolveProductLabels } from '@/lib/labels/labels'
import { publicBrand } from '@/lib/brand'

interface Props {
  product: CollectionProduct
  categorySlug?: string
  itemListId?: string
  itemListName?: string
  index?: number
  /** Above-the-fold tile: load its image eagerly with fetchpriority="high". */
  imagePriority?: boolean
}

export function ShopifyProductCard({ product, categorySlug, itemListId, itemListName, index = 0, imagePriority = false }: Props) {
  const variant = product.variants.nodes[0]
  const price = parseFloat(variant?.price.amount ?? product.priceRange.minVariantPrice.amount)
  const compareAt = variant?.compareAtPrice
    ? parseFloat(variant.compareAtPrice.amount)
    : null
  const image = product.images.nodes[0]
  const hasDiscount = compareAt !== null && compareAt > price
  const brand = publicBrand(product)

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
            alt={cleanShopifyAlt(image?.altText) ?? product.title}
            categoryHandle={categorySlug}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={imagePriority}
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
        {/* Public brand only (custom.brand_name). `vendor` is the FULFILLING
            vendor and must never be shown as a brand — when no approved brand
            exists the line is omitted entirely (lib/brand.ts). */}
        {brand ? (
          <span className="text-teal-500 text-[13px] font-semibold tracking-[0.26px] uppercase leading-[25px]">
            {brand}
          </span>
        ) : (
          <span className="leading-[25px]" aria-hidden />
        )}
        <p className="text-black text-[14px] font-semibold tracking-[0.28px] leading-5 line-clamp-2 mb-[30px]">
          {product.title}
        </p>
        {/* DEV-LABEL-01: a shipping claim comes ONLY from the resolver-backed
            ShippingBadge — the raw `free-shipping` tag fallback is gone (an
            uncurated tag must never create a shipping promise). RX/backorder
            come from the shared label contract, so card and PDP agree. */}
        {(() => {
          const labels = resolveProductLabels({
            tags: product.tags,
            estimatedRestockDate: product.estimatedRestockDate?.value ?? null,
            availableForSale: product.availableForSale,
          })
          if (!product.shippingDisplay && labels.length === 0) return null
          return (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {product.shippingDisplay && (
                <ShippingBadge shippingDisplay={product.shippingDisplay} />
              )}
              {labels.map((label) => (
                <span
                  key={label.type}
                  aria-label={label.accessibleText}
                  className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded text-white ${
                    label.type === 'rx-only' ? 'bg-amber-600' : 'bg-orange-500'
                  }`}
                >
                  {label.text}
                </span>
              ))}
            </div>
          )
        })()}
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
