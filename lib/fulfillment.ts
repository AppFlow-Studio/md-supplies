// DEV-ACCOUNT-01 — pure partial-fulfillment math for the customer account.
//
// Input shapes mirror the Customer Account API (Order.lineItems +
// Order.fulfillments with fulfillmentLineItems), verified against
// shopify.dev/docs/api/customer (Fulfillment, FulfillmentLineItem, LineItem).
// Pure and side-effect free so every edge case is unit-testable.

export type OrderLineInput = {
  id: string
  title: string
  sku: string | null
  variantTitle: string | null
  image: { url: string; altText: string | null } | null
  /** Quantity originally ordered. */
  quantity: number
  /**
   * Ordered quantity minus refunded quantity (Customer Account API
   * `refundableQuantity`). Cancellations/refunds reduce this, which is what
   * keeps refunded units out of "pending shipment".
   */
  refundableQuantity: number
}

export type FulfillmentInput = {
  id: string
  createdAt: string | null
  status: string | null
  latestShipmentStatus: string | null
  /** Nullable DateTime — render only when present, never an empty ETA slot. */
  estimatedDeliveryAt: string | null
  isPickedUp: boolean
  /** Drives whether tracking UI renders at all (false for digital/no-ship fulfillments). */
  requiresShipping: boolean
  trackingInformation: { company: string | null; number: string | null; url: string | null }[]
  lines: { lineItemId: string; quantity: number | null }[]
}

export type ShipmentItem = {
  lineItemId: string
  title: string
  sku: string | null
  variantTitle: string | null
  image: { url: string; altText: string | null } | null
  quantity: number
}

export type ShipmentCard = {
  id: string
  createdAt: string | null
  status: string | null
  latestShipmentStatus: string | null
  estimatedDeliveryAt: string | null
  isPickedUp: boolean
  requiresShipping: boolean
  /** Empty when requiresShipping is false — tracking UI must not render regardless of raw data. */
  trackingInformation: { company: string | null; number: string | null; url: string | null }[]
  items: ShipmentItem[]
}

export type PendingLine = {
  lineItemId: string
  title: string
  sku: string | null
  variantTitle: string | null
  image: { url: string; altText: string | null } | null
  remaining: number
  /** Units removed by cancellation/refund — shown as their own state, never as pending. */
  refundedQuantity: number
  fulfilledQuantity: number
}

export type FulfillmentSummary = {
  shipments: ShipmentCard[]
  /** Lines with unshipped, non-refunded units remaining. */
  pending: PendingLine[]
  /** Lines fully accounted for but with refunded/canceled units to disclose. */
  refundedOnly: PendingLine[]
  hasShipments: boolean
}

function toShipmentItem(line: OrderLineInput | undefined, lineItemId: string, quantity: number): ShipmentItem {
  return {
    lineItemId,
    title: line?.title ?? 'Item',
    sku: line?.sku ?? null,
    variantTitle: line?.variantTitle ?? null,
    image: line?.image ?? null,
    quantity,
  }
}

/**
 * Maps order lines + fulfillments into per-shipment cards and exact
 * pending-quantity lines.
 *
 * Guarantees:
 *  - remaining is never negative (repeated/over-reported fulfillments clamp);
 *  - refunded/canceled units are never shown as pending;
 *  - each fulfillment lists only its own items and quantities;
 *  - a fulfillment line that references an unknown order line renders
 *    defensively instead of crashing;
 *  - no fulfillments → every non-refunded line is pending ("Not yet shipped");
 *  - requiresShipping: false never shows tracking UI, regardless of raw data.
 */
export function computeFulfillmentSummary(
  orderLines: OrderLineInput[],
  fulfillments: FulfillmentInput[],
): FulfillmentSummary {
  const lineById = new Map(orderLines.map((l) => [l.id, l]))

  const shipments: ShipmentCard[] = fulfillments.map((f) => ({
    id: f.id,
    createdAt: f.createdAt,
    status: f.status,
    latestShipmentStatus: f.latestShipmentStatus,
    estimatedDeliveryAt: f.estimatedDeliveryAt,
    isPickedUp: f.isPickedUp,
    requiresShipping: f.requiresShipping,
    // No-ship fulfillments (digital, pickup handled separately via isPickedUp)
    // never show tracking UI, even if Shopify happens to carry stray data.
    trackingInformation: f.requiresShipping ? f.trackingInformation : [],
    items: f.lines
      .filter((fl) => (fl.quantity ?? 0) > 0)
      .map((fl) => toShipmentItem(lineById.get(fl.lineItemId), fl.lineItemId, fl.quantity ?? 0)),
  }))

  const fulfilledByLine = new Map<string, number>()
  for (const f of fulfillments) {
    for (const fl of f.lines) {
      const q = fl.quantity ?? 0
      if (q <= 0) continue
      fulfilledByLine.set(fl.lineItemId, (fulfilledByLine.get(fl.lineItemId) ?? 0) + q)
    }
  }

  const pending: PendingLine[] = []
  const refundedOnly: PendingLine[] = []
  for (const line of orderLines) {
    const fulfilled = fulfilledByLine.get(line.id) ?? 0
    const refunded = Math.max(0, line.quantity - line.refundableQuantity)
    const remaining = Math.max(0, line.refundableQuantity - fulfilled)
    const entry: PendingLine = {
      lineItemId: line.id,
      title: line.title,
      sku: line.sku,
      variantTitle: line.variantTitle,
      image: line.image,
      remaining,
      refundedQuantity: refunded,
      fulfilledQuantity: fulfilled,
    }
    if (remaining > 0) pending.push(entry)
    else if (refunded > 0) refundedOnly.push(entry)
  }

  return { shipments, pending, refundedOnly, hasShipments: shipments.length > 0 }
}

/** Customer-facing labels for Fulfillment.status / latestShipmentStatus. */
export function shipmentStatusLabel(shipment: {
  status: string | null
  latestShipmentStatus: string | null
  isPickedUp: boolean
}): string {
  if (shipment.isPickedUp) return 'Picked up'
  switch (shipment.latestShipmentStatus) {
    case 'DELIVERED':    return 'Delivered'
    case 'OUT_FOR_DELIVERY': return 'Out for delivery'
    case 'IN_TRANSIT':   return 'In transit'
    case 'ATTEMPTED_DELIVERY': return 'Delivery attempted'
    case 'FAILURE':      return 'Delivery issue'
    case 'READY_FOR_PICKUP': return 'Ready for pickup'
    case 'CONFIRMED':    return 'Confirmed'
    case 'LABEL_PRINTED':
    case 'LABEL_PURCHASED': return 'Preparing shipment'
  }
  switch (shipment.status) {
    case 'SUCCESS': return 'Shipped'
    case 'CANCELLED': return 'Canceled'
    case 'ERROR':
    case 'FAILURE': return 'Shipment issue'
    default: return 'Shipped'
  }
}
