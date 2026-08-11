import { describe, it, expect } from 'vitest'
import {
  computeFulfillmentSummary,
  shipmentStatusLabel,
  type OrderLineInput,
  type FulfillmentInput,
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
