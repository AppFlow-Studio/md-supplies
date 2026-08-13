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
        // DEV-LAUNCH-13: bg-amber-600 + white text measured ~3.18:1 (WCAG AA
        // needs 4.5:1 for this 12px text) — first caught when a live QA RX
        // fixture made e2e/axe-states.spec.ts's pdp-rx case actually run
        // instead of skip. amber-700 measures ~5.03:1, same fix shape as the
        // backorder-label precedent (text-orange-600 -> text-orange-700).
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-700 text-white">
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
