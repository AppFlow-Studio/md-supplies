'use client'

import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyQuickAddButton } from './ShopifyQuickAddButton'
import { ProductImage } from '@/components/shared/ProductImage'
import { track } from '@/lib/analytics/track'
import { buildSelectItemEvent, toGA4Item, currencyOf } from '@/lib/analytics/events'
import { cleanShopifyAlt } from '@/lib/alt-text'
import { ProductLabelBadges } from '@/components/product/ProductLabelBadges'
import { resolveProductLabels } from '@/lib/labels/labels'
import { publicBrand } from '@/lib/brand'
import { hasUsablePrice } from '@/lib/purchasability'

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
        {/* DEF-02/QA-135: this link wraps only the image — the visible title
            lives in the separate info Link below. An explicit aria-label
            guarantees a discernible name for screen readers rather than
            relying on the <img>'s alt text being inherited (fragile: a
            future decorative/empty alt on ProductImage would silently strip
            it). */}
        <Link href={href} onClick={handleSelect} aria-label={product.title} className="block w-full h-full">
          <ProductImage
            src={image?.url}
            alt={cleanShopifyAlt(image?.altText) ?? product.title}
            categoryHandle={categorySlug}
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 50vw, 33vw"
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
      </div>

      {/* Info */}
      <Link href={href} onClick={handleSelect} className="px-3 pt-3 pb-2 sm:px-[22px] sm:pt-[19px] sm:pb-3 flex flex-col flex-1">
        {/* Public brand only (custom.brand_name). `vendor` is the FULFILLING
            vendor and must never be shown as a brand — when no approved brand
            exists the line is omitted entirely (lib/brand.ts). */}
        {brand ? (
          <span className="text-teal-500 text-[12px] sm:text-[13px] font-semibold tracking-[0.26px] uppercase leading-[20px] sm:leading-[25px] line-clamp-1">
            {brand}
          </span>
        ) : (
          <span className="leading-[20px] sm:leading-[25px]" aria-hidden />
        )}
        <p className="text-black text-[13px] sm:text-[14px] font-semibold tracking-[0.28px] leading-[1.35] sm:leading-5 line-clamp-2 mb-3 sm:mb-[30px]">
          {product.title}
        </p>
        {/* DEV-LABEL-01: a shipping claim comes ONLY from the resolver-backed
            ShippingBadge — the raw `free-shipping` tag fallback is gone (an
            uncurated tag must never create a shipping promise). RX/backorder
            come from the shared label contract, so card and PDP agree. Order
            (RX -> Backorder -> Free Shipping) is guaranteed by
            ProductLabelBadges, not by call-site markup order. */}
        <ProductLabelBadges
          className="mb-3"
          labels={resolveProductLabels({
            tags: product.tags,
            isBackordered: product.backorder ?? null,
            estimatedRestockDate: product.estimatedRestockDate?.value ?? null,
            // Same tag ∪ custom.is_rx_only union as the PDP and the cart gate:
            // without it the 40 ACTIVE metafield-only RX products carry no
            // "RX Only" badge on any grid.
            isRxOnly: product.isRxOnly ?? null,
          })}
          shippingDisplay={product.shippingDisplay}
        />
        {/* Price sits at the bottom of the body (mt-auto) so every card in a
            row lines its footer up regardless of title length or label count. */}
        <div className="flex items-baseline gap-2 mt-auto">
          {hasUsablePrice(price) ? (
            <span className="text-black text-[16px] sm:text-[18px] font-bold tracking-[0.36px]">
              ${price.toFixed(2)}
            </span>
          ) : (
            <span className="text-navy-900 text-[15px] font-semibold tracking-[0.3px]">
              Contact for pricing
            </span>
          )}
          {hasUsablePrice(price) && hasDiscount && (
            <span className="text-gray-500 text-[14px] line-through tracking-[0.28px]">
              ${compareAt!.toFixed(2)}
            </span>
          )}
        </div>
      </Link>

      {/* Card footer/action row (Phase 4). The quick-add control lives HERE,
          bottom-right of the whole card — not overlaid on the image, where it
          covered product photography and sat outside the card's own layout. */}
      <div className="px-3 pb-3 sm:px-[22px] sm:pb-[18px] pt-1 flex items-center justify-end">
        <ShopifyQuickAddButton product={product} />
      </div>
    </div>
  )
}
