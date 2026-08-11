import type { ProductLabel } from '@/lib/labels/labels'
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'
import { ShippingBadge } from './ShippingBadge'

// DEV-LABEL-01: the one place that decides label ORDER across every surface
// (cards, PDP, quick add, cart). `labels` must already be RX-before-Backorder
// (resolveProductLabels sorts by priority) — this component renders that
// array first, then the shipping badge last, so RX -> Backorder -> Free
// Shipping can never drift out of order between surfaces.
interface Props {
  labels: ProductLabel[]
  shippingDisplay?: ShippingDisplay | null
  size?: 'sm' | 'md'
  className?: string
}

export function ProductLabelBadges({ labels, shippingDisplay, size = 'sm', className = '' }: Props) {
  if (labels.length === 0 && !shippingDisplay) return null

  const sizeClasses = size === 'md' ? 'px-3 py-1 text-[13px]' : 'px-2 py-0.5 text-[11px]'

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {labels.map((label) => (
        <span
          key={label.type}
          aria-label={label.accessibleText}
          // DEV-LAUNCH-13: amber-700/orange-700 are the AA-passing shades for
          // white text at these sizes — see labels.ts precedent.
          className={`inline-flex items-center ${sizeClasses} font-medium rounded text-white ${
            label.type === 'rx-only' ? 'bg-amber-700' : 'bg-orange-700'
          }`}
        >
          {label.text}
        </span>
      ))}
      {shippingDisplay && <ShippingBadge shippingDisplay={shippingDisplay} className={sizeClasses} />}
    </div>
  )
}
