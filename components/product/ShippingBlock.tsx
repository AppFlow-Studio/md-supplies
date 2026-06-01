import type { Product } from '@/types/product'

interface Props {
  product: Pick<Product, 'shippingMessage' | 'leadTime'>
}

export function ShippingBlock({ product }: Props) {
  if (!product.shippingMessage && !product.leadTime) return null

  return (
    <section aria-labelledby="shipping-heading" className="border-t border-gray-200 pt-8">
      <h2 id="shipping-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Shipping
      </h2>
      <div className="bg-neutral-50 rounded-lg p-4 flex flex-col gap-2 text-sm">
        {product.shippingMessage && (
          <p className="text-navy-900">{product.shippingMessage}</p>
        )}
        {product.leadTime && (
          <p className="text-gray-500">
            <span className="font-medium text-navy-900">Lead time:</span> {product.leadTime}
          </p>
        )}
      </div>
    </section>
  )
}
