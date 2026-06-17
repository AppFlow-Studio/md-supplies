interface Props {
  isOCC?: boolean
  hasFreeShipping?: boolean
  isRx?: boolean
  available: boolean
  leadTime?: string
}

export function ProductBadges({ isOCC, hasFreeShipping, isRx, available, leadTime }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {isOCC && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-navy-900 text-white">
          OCC
        </span>
      )}
      {hasFreeShipping && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-teal-500 text-white">
          Free Shipping
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
      {available && leadTime && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500">
          Ships in {leadTime}
        </span>
      )}
    </div>
  )
}
