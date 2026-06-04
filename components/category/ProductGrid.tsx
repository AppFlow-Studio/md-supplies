import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'

interface Props {
  products: CollectionProduct[]
  emptyStateHref: string
  emptyStateMessage?: string
}

export function ProductGrid({
  products,
  emptyStateHref,
  emptyStateMessage = 'No products found.',
}: Props) {

    console.log(products)
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-navy-900 text-[20px] font-semibold">
          {emptyStateMessage}
        </p>
        <p className="text-gray-500 text-[15px]">
          Try adjusting or clearing your filters.
        </p>
        <Link
          href={emptyStateHref}
          className="mt-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] flex items-center hover:bg-neutral-50 transition-colors"
        >
          Clear all filters
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
      {products.map((product) => (
        <ShopifyProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
