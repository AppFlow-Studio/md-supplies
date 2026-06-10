import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyQuickAddButton } from './ShopifyQuickAddButton'

export function ShopifyProductCard({ product, categorySlug }: { product: CollectionProduct; categorySlug?: string }) {
  const variant = product.variants.nodes[0]
  const price = parseFloat(variant?.price.amount ?? product.priceRange.minVariantPrice.amount)
  const compareAt = variant?.compareAtPrice
    ? parseFloat(variant.compareAtPrice.amount)
    : null
  const image = product.images.nodes[0]
  const hasDiscount = compareAt !== null && compareAt > price

  const stockQty = variant?.quantityAvailable ?? null
  const isLowStock = product.availableForSale && stockQty !== null && stockQty <= 9 && stockQty > 0

  const href = categorySlug
    ? `/category/${categorySlug}/${product.handle}`
    : `/product/${product.handle}`

  return (
    <div className="group relative bg-white flex flex-col">
      <Link href={href} className="flex flex-col">
        {/* Image */}
        <div className="relative overflow-hidden bg-white aspect-square">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.altText ?? product.title}
              className="size-full object-contain"
            />
          ) : (
            <div className="size-full bg-gray-100 flex items-center justify-center">
              <ShoppingCart size={32} className="text-gray-300" />
            </div>
          )}

          {/* Stock badge — top-left corner */}
          {isLowStock && (
            <span className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 tracking-[0.2px] uppercase">
              Low Stock
            </span>
          )}
          {!product.availableForSale && (
            <span className="absolute top-2 left-2 bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 tracking-[0.2px] uppercase">
              Out of Stock
            </span>
          )}

          {!product.availableForSale && (
            <div className="absolute inset-0 bg-white/60" />
          )}
        </div>

        {/* Info */}
        <div className="px-[22px] pt-[19px] pb-[22px] flex flex-col">
          <span className="text-[#0086b1] text-[13px] font-semibold tracking-[0.26px] uppercase leading-[25px]">
            {product.vendor}
          </span>
          <p className="text-black text-[14px] font-semibold tracking-[0.28px] leading-5 line-clamp-2 mb-[30px]">
            {product.title}
          </p>
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
        </div>
      </Link>

      {/* Quick add button — sibling to <Link>, not inside it, so clicks never navigate */}
      <ShopifyQuickAddButton product={product} />
    </div>
  )
}
