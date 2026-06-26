import Link from 'next/link'
import Image from 'next/image'
import type { RelatedProduct } from '@/types/product'
import { ROUTES } from '@/lib/routes'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

interface Props {
  products: RelatedProduct[]
}

export function RelatedProducts({ products }: Props) {
  if (products.length === 0) return null

  return (
    <section aria-labelledby="related-products-heading" className="border-t border-gray-200 pt-8">
      <h2 id="related-products-heading" className="text-xl font-semibold text-navy-900 mb-6">
        Related Products
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.handle}
            href={ROUTES.product(product.handle)}
            className="group flex flex-col gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-teal-500 transition-colors"
          >
            <div className="relative aspect-square bg-neutral-50 rounded overflow-hidden">
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-navy-900 group-hover:text-teal-500 transition-colors line-clamp-2 leading-snug">
                {product.title}
              </p>
              <p className="text-sm font-semibold text-navy-900">
                {formatCents(product.price)}
                <span className="font-normal text-gray-500 text-xs"> / box</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
