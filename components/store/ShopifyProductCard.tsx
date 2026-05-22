import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import type { CollectionProduct } from '@/lib/shopify/types'

export function ShopifyProductCard({ product }: { product: CollectionProduct }) {
  const variant = product.variants.nodes[0]
  const price = parseFloat(variant?.price.amount ?? product.priceRange.minVariantPrice.amount)
  const compareAt = variant?.compareAtPrice
    ? parseFloat(variant.compareAtPrice.amount)
    : null
  const image = product.images.nodes[0]
  const hasDiscount = compareAt !== null && compareAt > price

  return (
    <Link href={`/product/${product.handle}`} className="group bg-white flex flex-col">
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

        {!product.availableForSale && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-gray-500 text-[13px] font-semibold tracking-[0.26px]">
              Out of Stock
            </span>
          </div>
        )}

        {/* Add to cart hover overlay */}
        {product.availableForSale && (
          <div className="absolute inset-x-0 bottom-0 h-[43px] bg-navy-900 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <ShoppingCart size={14} className="text-white" />
            <span className="text-white text-[12px] font-medium tracking-[0.24px]">
              Add to cart
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-[22px] pt-[19px] pb-[22px] flex flex-col">
        <span className="text-teal-500 text-[13px] font-semibold tracking-[0.26px] uppercase leading-[25px]">
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
  )
}
