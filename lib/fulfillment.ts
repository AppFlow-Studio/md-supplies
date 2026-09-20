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

/**
 * Customer-facing labels for Fulfillment.status / latestShipmentStatus.
 *
 * Bilal, 2026-09-20 QA pass on b3d36ac (3 follow-ups from testing #3435/#3436):
 *  - CONFIRMED/LABEL_PRINTED/LABEL_PURCHASED now all read "Label Created" —
 *    the exact wording resolveOrderStatus's LABEL_CREATED stage uses, so the
 *    shipment card below never disagrees with the order header above it
 *    (order #3436 today: header said "Label Created", card said "Confirmed").
 *  - `status === 'CANCELLED'` is checked BEFORE latestShipmentStatus: a
 *    cancelled fulfillment can still carry a stale pre-cancellation shipment
 *    status (e.g. CONFIRMED), which previously won the switch and showed
 *    "Confirmed" instead of "Canceled".
 *  - DELAYED is now its own label — it used to fall through both switches to
 *    the default "Shipped", hiding the delay from the customer entirely.
 */
export function shipmentStatusLabel(shipment: {
  status: string | null
  latestShipmentStatus: string | null
  isPickedUp: boolean
}): string {
  if (shipment.isPickedUp) return 'Picked up'
  if (shipment.status === 'CANCELLED') return 'Canceled'
  switch (shipment.latestShipmentStatus) {
    case 'DELIVERED':    return 'Delivered'
    case 'OUT_FOR_DELIVERY': return 'Out for delivery'
    case 'IN_TRANSIT':   return 'In transit'
    case 'DELAYED':       return 'Delayed'
    case 'ATTEMPTED_DELIVERY': return 'Delivery attempted'
    case 'FAILURE':      return 'Delivery issue'
    case 'READY_FOR_PICKUP': return 'Ready for pickup'
    case 'CONFIRMED':
    case 'LABEL_PRINTED':
    case 'LABEL_PURCHASED': return 'Label Created'
  }
  switch (shipment.status) {
    case 'SUCCESS': return 'Shipped'
    case 'ERROR':
    case 'FAILURE': return 'Shipment issue'
    default: return 'Shipped'
  }
}

// ─── Order-level status badge (DEV-ACCOUNT-02) ──────────────────────────────
//
// Client report, 2026-09-17: Orders #3435/#3436 showed "Delivered" in the
// account while UPS still had them at "Label Created" (tracking
// 1ZV56J320311548011). Root cause: the account dashboard, /account/orders,
// and the /account/orders/[number] header each had their own
// getFulfillmentDisplay(order.fulfillmentStatus) that mapped Shopify's
// order-level FULFILLED straight to "Delivered". FULFILLED only means every
// line item has been fulfilled (a warehouse/label fact) — never that a
// carrier delivered the package. Real delivery progress lives on each
// fulfillment's latestShipmentStatus, which the shipment cards on the detail
// page already used correctly (shipmentStatusLabel above). This resolver
// consolidates that correct semantics into the one thing every account
// surface should call for its order-level badge, so the header can never
// show a different status than what the shipment cards underneath it show.

export type OrderStatusFulfillmentInput = {
  status: string | null
  latestShipmentStatus: string | null
  isPickedUp: boolean
}

export type OrderStatusInput = {
  /** Shopify order-level fulfillmentStatus (UNFULFILLED / PARTIALLY_FULFILLED / FULFILLED / IN_PROGRESS / ...). */
  fulfillmentStatus: string
  fulfillments: OrderStatusFulfillmentInput[]
}

export type OrderStatusDisplay = { label: string; style: string }

type OrderStage =
  | 'ISSUE' | 'ATTEMPTED' | 'DELAYED' | 'PROCESSING' | 'PARTIAL'
  | 'LABEL_CREATED' | 'SHIPPED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED'

// Ordered least-advanced (most urgent to surface) → most-advanced.
// resolveOrderStatus always shows the EARLIEST stage present across every
// active fulfillment (plus a synthetic PARTIAL stage for any still-
// unfulfilled portion) — so a mix of states, or one shipment lagging behind
// another, can never read as more complete than the order's actual weakest
// link. LABEL_CREATED ranks below SHIPPED: a fulfillment confirmed still
// "preparing" is less progressed than one confirmed to have left the
// warehouse (SHIPPED) even though SHIPPED carries no further carrier detail.
// DELAYED ranks alongside ATTEMPTED (Bilal, 2026-09-20: a carrier DELAYED
// status previously fell through to "Shipped", hiding the delay) — a shipment
// the carrier has flagged as behind schedule needs the same urgency as one
// with a failed delivery attempt, not the quiet default "on track" reading.
const ORDER_STAGE_PRIORITY: OrderStage[] = [
  'ISSUE', 'ATTEMPTED', 'DELAYED', 'PROCESSING', 'PARTIAL',
  'LABEL_CREATED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
]

const ORDER_STAGE_DISPLAY: Record<OrderStage, OrderStatusDisplay> = {
  ISSUE:            { label: 'Delivery Issue',     style: 'bg-red-100 text-red-700' },
  ATTEMPTED:        { label: 'Delivery Attempted', style: 'bg-orange-100 text-orange-700' },
  DELAYED:          { label: 'Delayed',            style: 'bg-orange-100 text-orange-700' },
  PROCESSING:       { label: 'Processing',         style: 'bg-yellow-100 text-yellow-700' },
  PARTIAL:          { label: 'Partial',            style: 'bg-blue-100 text-blue-700' },
  LABEL_CREATED:    { label: 'Label Created',      style: 'bg-blue-100 text-blue-700' },
  SHIPPED:          { label: 'Shipped',            style: 'bg-blue-100 text-blue-700' },
  IN_TRANSIT:       { label: 'In Transit',         style: 'bg-blue-100 text-blue-700' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',   style: 'bg-blue-100 text-blue-700' },
  DELIVERED:        { label: 'Delivered',          style: 'bg-green-100 text-green-700' },
}

function fulfillmentOrderStage(f: OrderStatusFulfillmentInput): OrderStage {
  if (f.isPickedUp) return 'DELIVERED'
  switch (f.latestShipmentStatus) {
    case 'DELIVERED':         return 'DELIVERED'
    case 'OUT_FOR_DELIVERY':  return 'OUT_FOR_DELIVERY'
    case 'IN_TRANSIT':
    case 'READY_FOR_PICKUP':  return 'IN_TRANSIT'
    case 'ATTEMPTED_DELIVERY': return 'ATTEMPTED'
    case 'DELAYED':           return 'DELAYED'
    case 'FAILURE':           return 'ISSUE'
    case 'CONFIRMED':
    case 'LABEL_PRINTED':
    case 'LABEL_PURCHASED':   return 'LABEL_CREATED'
  }
  // No carrier-level shipment event yet — fall back to the fulfillment's own
  // status. A successful fulfillment with no shipment event is real progress
  // ("Shipped"), but on its own is never enough evidence to claim "Delivered".
  return f.status === 'ERROR' || f.status === 'FAILURE' ? 'ISSUE' : 'SHIPPED'
}

/**
 * Single source of truth for the order-level status badge on the account
 * dashboard (Recent Orders), /account/orders, and the /account/orders/
 * [number] header — replaces the three separate getFulfillmentDisplay()
 * copies that each conflated Shopify's order-level FULFILLED with carrier
 * delivery.
 */
export function resolveOrderStatus(order: OrderStatusInput): OrderStatusDisplay {
  // Fulfillments Shopify itself canceled never shipped anything — they
  // shouldn't gate the badge on the fulfillments that did.
  const activeFulfillments = order.fulfillments.filter((f) => f.status !== 'CANCELLED')

  if (activeFulfillments.length === 0) {
    return ORDER_STAGE_DISPLAY[order.fulfillmentStatus === 'FULFILLED' ? 'SHIPPED' : 'PROCESSING']
  }

  const stages = activeFulfillments.map(fulfillmentOrderStage)
  // FULFILLED is Shopify's only signal that no line-item quantity remains
  // unfulfilled — anything else (PARTIALLY_FULFILLED, IN_PROGRESS, ON_HOLD,
  // UNFULFILLED, ...) means part of the order hasn't shipped yet, so the
  // badge must never read more complete than "Partial" no matter how
  // advanced the fulfillments that do exist are.
  if (order.fulfillmentStatus !== 'FULFILLED') stages.push('PARTIAL')

  const worst = stages.reduce((acc, stage) =>
    ORDER_STAGE_PRIORITY.indexOf(stage) < ORDER_STAGE_PRIORITY.indexOf(acc) ? stage : acc,
  )
  return ORDER_STAGE_DISPLAY[worst]
}
