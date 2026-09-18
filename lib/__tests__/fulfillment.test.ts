import { describe, it, expect } from 'vitest'
import {
  computeFulfillmentSummary,
  shipmentStatusLabel,
  resolveOrderStatus,
  type OrderLineInput,
  type FulfillmentInput,
  type OrderStatusFulfillmentInput,
} from '../fulfillment'

// DEV-ACCOUNT-01 edge cases from the execution plan §8.4.

function line(id: string, quantity: number, refundableQuantity = quantity): OrderLineInput {
  return {
    id,
    title: `Item ${id}`,
    sku: `SKU-${id}`,
    variantTitle: null,
    image: null,
    quantity,
    refundableQuantity,
  }
}

function fulfillment(
  id: string,
  lines: { lineItemId: string; quantity: number | null }[],
  tracking: { company: string | null; number: string | null; url: string | null }[] = [],
  overrides: Partial<Pick<FulfillmentInput, 'estimatedDeliveryAt' | 'requiresShipping'>> = {},
): FulfillmentInput {
  return {
    id,
    createdAt: '2026-07-01T00:00:00Z',
    status: 'SUCCESS',
    latestShipmentStatus: null,
    estimatedDeliveryAt: overrides.estimatedDeliveryAt ?? null,
    isPickedUp: false,
    requiresShipping: overrides.requiresShipping ?? true,
    trackingInformation: tracking,
    lines,
  }
}

describe('computeFulfillmentSummary', () => {
  it('qty 10, fulfillment A ships 4, B ships 3 → remaining exactly 3', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 10)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: 4 }]), fulfillment('F2', [{ lineItemId: 'L1', quantity: 3 }])],
    )
    expect(summary.shipments).toHaveLength(2)
    expect(summary.shipments[0].items[0].quantity).toBe(4)
    expect(summary.shipments[1].items[0].quantity).toBe(3)
    expect(summary.pending).toEqual([
      expect.objectContaining({ lineItemId: 'L1', remaining: 3, fulfilledQuantity: 7 }),
    ])
  })

  it('a second fulfillment updates the same order without double-counting', () => {
    const first = computeFulfillmentSummary([line('L1', 10)], [fulfillment('F1', [{ lineItemId: 'L1', quantity: 4 }])])
    expect(first.pending[0].remaining).toBe(6)
    const second = computeFulfillmentSummary(
      [line('L1', 10)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: 4 }]), fulfillment('F2', [{ lineItemId: 'L1', quantity: 6 }])],
    )
    expect(second.pending).toEqual([])
  })

  it('multiple lines: each fulfillment lists only its own items and quantities', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 2), line('L2', 5)],
      [
        fulfillment('F1', [{ lineItemId: 'L1', quantity: 2 }]),
        fulfillment('F2', [{ lineItemId: 'L2', quantity: 1 }]),
      ],
    )
    expect(summary.shipments[0].items.map((i) => i.lineItemId)).toEqual(['L1'])
    expect(summary.shipments[1].items.map((i) => i.lineItemId)).toEqual(['L2'])
    expect(summary.pending).toEqual([expect.objectContaining({ lineItemId: 'L2', remaining: 4 })])
  })

  it('one line split across several fulfillments sums correctly', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 9)],
      [
        fulfillment('F1', [{ lineItemId: 'L1', quantity: 3 }]),
        fulfillment('F2', [{ lineItemId: 'L1', quantity: 3 }]),
        fulfillment('F3', [{ lineItemId: 'L1', quantity: 3 }]),
      ],
    )
    expect(summary.pending).toEqual([])
  })

  it('never shows a negative remainder even when fulfillments over-report', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 3)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: 5 }])],
    )
    expect(summary.pending).toEqual([])
  })

  it('refunded/canceled quantity is never pending and is disclosed separately', () => {
    // Ordered 10, refunded 4 (refundableQuantity 6), shipped 6 → nothing
    // pending, refund disclosed.
    const summary = computeFulfillmentSummary(
      [line('L1', 10, 6)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: 6 }])],
    )
    expect(summary.pending).toEqual([])
    expect(summary.refundedOnly).toEqual([
      expect.objectContaining({ lineItemId: 'L1', refundedQuantity: 4 }),
    ])
  })

  it('fully canceled line (refundableQuantity 0) is not pending', () => {
    const summary = computeFulfillmentSummary([line('L1', 5, 0)], [])
    expect(summary.pending).toEqual([])
    expect(summary.refundedOnly).toEqual([
      expect.objectContaining({ lineItemId: 'L1', refundedQuantity: 5 }),
    ])
  })

  it('no fulfillments → every non-refunded line is pending (not yet shipped)', () => {
    const summary = computeFulfillmentSummary([line('L1', 2), line('L2', 1)], [])
    expect(summary.hasShipments).toBe(false)
    expect(summary.pending.map((p) => [p.lineItemId, p.remaining])).toEqual([
      ['L1', 2],
      ['L2', 1],
    ])
  })

  it('multiple tracking numbers stay associated at the fulfillment level', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 2)],
      [
        fulfillment(
          'F1',
          [{ lineItemId: 'L1', quantity: 2 }],
          [
            { company: 'UPS', number: '1Z1', url: 'https://ups.example/1Z1' },
            { company: 'UPS', number: '1Z2', url: 'https://ups.example/1Z2' },
          ],
        ),
      ],
    )
    expect(summary.shipments[0].trackingInformation).toHaveLength(2)
  })

  it('tracking number without URL or carrier is preserved as data (text-only render)', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 1)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: 1 }], [{ company: null, number: 'TRACK123', url: null }])],
    )
    expect(summary.shipments[0].trackingInformation[0]).toEqual({ company: null, number: 'TRACK123', url: null })
  })

  it('fulfillment line referencing an unknown order line renders defensively', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 1)],
      [fulfillment('F1', [{ lineItemId: 'GHOST', quantity: 1 }])],
    )
    expect(summary.shipments[0].items[0]).toEqual(
      expect.objectContaining({ lineItemId: 'GHOST', title: 'Item', quantity: 1 }),
    )
  })

  it('null fulfillment-line quantities are ignored, not treated as shipped', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 2)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: null }])],
    )
    expect(summary.shipments[0].items).toEqual([])
    expect(summary.pending[0].remaining).toBe(2)
  })

  it('carries estimatedDeliveryAt through when Shopify provides one', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 1)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: 1 }], [], { estimatedDeliveryAt: '2026-08-15T00:00:00Z' })],
    )
    expect(summary.shipments[0].estimatedDeliveryAt).toBe('2026-08-15T00:00:00Z')
  })

  it('estimatedDeliveryAt is null when Shopify has none — no fabricated ETA', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 1)],
      [fulfillment('F1', [{ lineItemId: 'L1', quantity: 1 }])],
    )
    expect(summary.shipments[0].estimatedDeliveryAt).toBeNull()
  })

  it('requiresShipping: false suppresses tracking UI even if Shopify sent tracking data', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 1)],
      [
        fulfillment(
          'F1',
          [{ lineItemId: 'L1', quantity: 1 }],
          [{ company: 'UPS', number: '1Z1', url: 'https://ups.example/1Z1' }],
          { requiresShipping: false },
        ),
      ],
    )
    expect(summary.shipments[0].requiresShipping).toBe(false)
    expect(summary.shipments[0].trackingInformation).toEqual([])
  })

  it('requiresShipping: true preserves tracking data as before', () => {
    const summary = computeFulfillmentSummary(
      [line('L1', 1)],
      [
        fulfillment(
          'F1',
          [{ lineItemId: 'L1', quantity: 1 }],
          [{ company: 'UPS', number: '1Z1', url: 'https://ups.example/1Z1' }],
          { requiresShipping: true },
        ),
      ],
    )
    expect(summary.shipments[0].trackingInformation).toHaveLength(1)
  })
})

describe('shipmentStatusLabel', () => {
  it('prefers pickup, then shipment status, then fulfillment status', () => {
    expect(shipmentStatusLabel({ status: 'SUCCESS', latestShipmentStatus: 'DELIVERED', isPickedUp: true })).toBe('Picked up')
    expect(shipmentStatusLabel({ status: 'SUCCESS', latestShipmentStatus: 'IN_TRANSIT', isPickedUp: false })).toBe('In transit')
    expect(shipmentStatusLabel({ status: 'SUCCESS', latestShipmentStatus: null, isPickedUp: false })).toBe('Shipped')
    expect(shipmentStatusLabel({ status: 'CANCELLED', latestShipmentStatus: null, isPickedUp: false })).toBe('Canceled')
  })
})

// DEV-ACCOUNT-02 (client report, 2026-09-17): Orders #3435/#3436 showed
// "Delivered" in the account while UPS still had them at "Label Created"
// (tracking 1ZV56J320311548011) — the account dashboard, /account/orders,
// and the order-detail header each mapped Shopify's order-level
// fulfillmentStatus === FULFILLED straight to "Delivered". FULFILLED only
// means every line item has been fulfilled, never that a carrier delivered
// the package.
describe('resolveOrderStatus', () => {
  function ful(overrides: Partial<OrderStatusFulfillmentInput> = {}): OrderStatusFulfillmentInput {
    return { status: 'SUCCESS', latestShipmentStatus: null, isPickedUp: false, ...overrides }
  }

  it('FULFILLED + LABEL_PRINTED/LABEL_PURCHASED does not equal Delivered (the #3435/#3436 root cause)', () => {
    expect(
      resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: 'LABEL_PRINTED' })] }),
    ).toEqual({ label: 'Label Created', style: 'bg-blue-100 text-blue-700' })
    expect(
      resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: 'LABEL_PURCHASED' })] }),
    ).toEqual({ label: 'Label Created', style: 'bg-blue-100 text-blue-700' })
  })

  it('FULFILLED + IN_TRANSIT → In Transit', () => {
    expect(
      resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: 'IN_TRANSIT' })] }),
    ).toEqual({ label: 'In Transit', style: 'bg-blue-100 text-blue-700' })
  })

  it('actual DELIVERED shipment status → Delivered', () => {
    expect(
      resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: 'DELIVERED' })] }),
    ).toEqual({ label: 'Delivered', style: 'bg-green-100 text-green-700' })
  })

  it('out for delivery and attempted/failure map to their own distinct labels', () => {
    expect(resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: 'OUT_FOR_DELIVERY' })] }).label)
      .toBe('Out for Delivery')
    expect(resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: 'ATTEMPTED_DELIVERY' })] }).label)
      .toBe('Delivery Attempted')
    expect(resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: 'FAILURE' })] }).label)
      .toBe('Delivery Issue')
  })

  it('mixed/multiple shipments never prematurely show Delivered — the least-advanced shipment wins', () => {
    expect(
      resolveOrderStatus({
        fulfillmentStatus: 'FULFILLED',
        fulfillments: [ful({ latestShipmentStatus: 'DELIVERED' }), ful({ latestShipmentStatus: 'IN_TRANSIT' })],
      }),
    ).toEqual({ label: 'In Transit', style: 'bg-blue-100 text-blue-700' })

    expect(
      resolveOrderStatus({
        fulfillmentStatus: 'FULFILLED',
        fulfillments: [ful({ latestShipmentStatus: 'DELIVERED' }), ful({ latestShipmentStatus: 'LABEL_PRINTED' })],
      }),
    ).toEqual({ label: 'Label Created', style: 'bg-blue-100 text-blue-700' })

    // Only "Delivered" when every active fulfillment actually is.
    expect(
      resolveOrderStatus({
        fulfillmentStatus: 'FULFILLED',
        fulfillments: [ful({ latestShipmentStatus: 'DELIVERED' }), ful({ latestShipmentStatus: 'DELIVERED' })],
      }),
    ).toEqual({ label: 'Delivered', style: 'bg-green-100 text-green-700' })
  })

  it('no shipment event available falls back to Shipped, never Delivered', () => {
    expect(
      resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ latestShipmentStatus: null })] }),
    ).toEqual({ label: 'Shipped', style: 'bg-blue-100 text-blue-700' })
  })

  it('FULFILLED with zero fulfillments also falls back to Shipped, never Delivered', () => {
    expect(resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [] }))
      .toEqual({ label: 'Shipped', style: 'bg-blue-100 text-blue-700' })
  })

  it('unfulfilled (no fulfillments at all) → Processing', () => {
    expect(resolveOrderStatus({ fulfillmentStatus: 'UNFULFILLED', fulfillments: [] }))
      .toEqual({ label: 'Processing', style: 'bg-yellow-100 text-yellow-700' })
  })

  it('partial orders never read as Delivered while a portion remains unfulfilled, even if the shipped portion already delivered', () => {
    expect(
      resolveOrderStatus({
        fulfillmentStatus: 'PARTIALLY_FULFILLED',
        fulfillments: [ful({ latestShipmentStatus: 'DELIVERED' })],
      }),
    ).toEqual({ label: 'Partial', style: 'bg-blue-100 text-blue-700' })
  })

  it('a canceled fulfillment record does not gate the badge on the fulfillments that did ship', () => {
    expect(
      resolveOrderStatus({
        fulfillmentStatus: 'FULFILLED',
        fulfillments: [ful({ status: 'CANCELLED', latestShipmentStatus: 'FAILURE' }), ful({ latestShipmentStatus: 'DELIVERED' })],
      }),
    ).toEqual({ label: 'Delivered', style: 'bg-green-100 text-green-700' })
  })

  it('a picked-up fulfillment counts as delivered even with no latestShipmentStatus', () => {
    expect(resolveOrderStatus({ fulfillmentStatus: 'FULFILLED', fulfillments: [ful({ isPickedUp: true })] }).label)
      .toBe('Delivered')
  })
})
