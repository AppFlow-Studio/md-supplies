import Link from 'next/link'

interface Props {
  product: {
    handle: string
    title: string
    image: string
    price: number
  }
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function FeaturedProductCard({ product }: Props) {
  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow"
    >
      <div className="aspect-square w-full overflow-hidden bg-neutral-50">
        <img
          src={product.image}
          alt={product.title}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-navy-900 leading-snug line-clamp-2 group-hover:text-teal-500 transition-colors">
          {product.title}
        </h3>
        <p className="text-sm font-bold text-navy-900">{formatCents(product.price)}</p>
      </div>
    </Link>
  )
}
