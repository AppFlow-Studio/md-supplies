import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

interface Props {
  shippingDisplay: ShippingDisplay | null
}

export function ShippingBlock({ shippingDisplay }: Props) {
  if (!shippingDisplay) return null
  const text = shippingDisplay.displayCopy ?? shippingDisplay.message

  return (
    <section aria-labelledby="shipping-heading" className="border-t border-gray-200 pt-8">
      <h2 id="shipping-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Shipping
      </h2>
      <div className="bg-neutral-50 rounded-lg p-4 text-sm text-navy-900">
        {text}
      </div>
    </section>
  )
}
