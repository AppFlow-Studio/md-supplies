// DEV-LABEL-01 / DEV-SHIP-01: no tag- or static-data-driven shipping claims.
// A Free Shipping visual may come only from the shipping resolver
// (ShippingBadge); "Ships in X" lead-time promises were unsupported static
// copy and are removed until an approved source exists.

interface Props {
  isOCC?: boolean
  isRx?: boolean
  available: boolean
}

export function ProductBadges({ isOCC, isRx, available }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {isOCC && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-navy-900 text-white">
          OCC
        </span>
      )}
      {isRx && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-600 text-white">
          RX Only
        </span>
      )}
      {!available && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-500">
          Out of Stock
        </span>
      )}
    </div>
  )
}
