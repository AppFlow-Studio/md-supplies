import Link from 'next/link'
import type { ProductCardData } from '@/types/product'
import { ProductBadges } from './ProductBadges'
import { ProductCardClient } from './ProductCardClient'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

interface Props {
  product: ProductCardData
}

export function ProductCard({ product }: Props) {
  return (
    <article
      className={`group flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white transition-shadow hover:shadow-md ${
        !product.available ? 'opacity-75' : ''
      }`}
    >
      {/* Card link covers image + info */}
      <Link
        href={`/products/${product.handle}`}
        className="flex flex-col flex-1 p-3 gap-3"
        tabIndex={0}
      >
        {/* Image */}
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-50">
          <img
            src={product.image.url}
            alt={product.image.altText}
            width={product.image.width}
            height={product.image.height}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </div>

        {/* Brand · Vendor */}
        <p className="text-xs text-gray-500 truncate">
          {product.brand}
          {product.vendor && product.vendor !== product.brand && (
            <> · {product.vendor}</>
          )}
        </p>

        {/* Title */}
        <h3 className="text-sm font-semibold text-navy-900 leading-snug line-clamp-2 group-hover:text-teal-500 transition-colors">
          {product.title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-navy-900">{formatCents(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-xs text-gray-500 line-through">
              {formatCents(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Badges */}
        <ProductBadges
          isOCC={product.isOCC}
          hasFreeShipping={product.hasFreeShipping}
          available={product.available}
          leadTime={product.leadTime}
        />
      </Link>

      {/* Quick Add — separate from card link */}
      <div className="px-3 pb-3">
        <ProductCardClient product={product} />
      </div>
    </article>
  )
}
