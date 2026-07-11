import Link from 'next/link'
import { Package } from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { ProductImage } from '@/components/shared/ProductImage'

interface Props {
  product: {
    handle: string
    title:  string
    image:  string
    price:  number
  }
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function FeaturedProductCard({ product }: Props) {
  return (
    <Link
      href={ROUTES.product(product.handle)}
      className="group flex flex-col h-full overflow-hidden bg-white border border-gray-100 hover:border-teal-400 hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-50 flex items-center justify-center">
        {product.image ? (
          <ProductImage
            src={product.image}
            alt={product.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain transition-transform duration-300 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-300">
            <Package size={36} strokeWidth={1.5} />
            <span className="text-[11px] uppercase tracking-widest">No image</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-[13px] font-semibold text-navy-900 leading-snug line-clamp-2 group-hover:text-teal-500 transition-colors duration-200">
          {product.title}
        </h3>
        <p className="text-[14px] font-bold text-navy-900 mt-auto">
          {formatCents(product.price)}
        </p>
      </div>
    </Link>
  )
}
