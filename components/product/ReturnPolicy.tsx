import type { Product } from '@/types/product'

interface Props {
  product: Pick<Product, 'returnPolicySummary'>
}

export function ReturnPolicy({ product }: Props) {
  if (!product.returnPolicySummary) return null

  return (
    <section aria-labelledby="return-heading" className="border-t border-gray-200 pt-8">
      <h2 id="return-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Return Policy
      </h2>
      <p className="text-sm text-gray-500 leading-relaxed max-w-prose">
        {product.returnPolicySummary}
      </p>
    </section>
  )
}
