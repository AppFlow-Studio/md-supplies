import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'
import { SHIPPING_CLASS_BADGE_LABEL } from '@/lib/shipping-resolver/copy'

interface Props {
  shippingDisplay: ShippingDisplay | null
  className?: string
}

export function ShippingBadge({ shippingDisplay, className = '' }: Props) {
  if (!shippingDisplay) return null
  const label = SHIPPING_CLASS_BADGE_LABEL[shippingDisplay.class]
  if (!label) return null

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-teal-500 text-white ${className}`}
    >
      {label}
    </span>
  )
}
