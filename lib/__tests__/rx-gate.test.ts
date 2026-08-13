import { describe, it, expect } from 'vitest'
import {
  RX_TAG,
  isRxProduct,
  isExemptProduct,
  isGatedRxProduct,
  cartRequiresRxGate,
  resolveGateStatus,
} from '../rx-gate'

const rx = (over: Partial<{ tags: string[]; vendor: string; title: string }> = {}) => ({
  tags: [RX_TAG],
  vendor: 'Exel',
  title: 'Exel 23G Needle',
  ...over,
})

describe('isRxProduct', () => {
  it('matches the compliance:rx-only tag case/whitespace-insensitively', () => {
    expect(isRxProduct(rx())).toBe(true)
    expect(isRxProduct(rx({ tags: [' Compliance:RX-Only '] }))).toBe(true)
  })
  it('does not match unrelated tags or the bare word rx', () => {
    expect(isRxProduct(rx({ tags: ['rx', 'category:needles-syringes'] }))).toBe(false)
    expect(isRxProduct(rx({ tags: [] }))).toBe(false)
  })
})

describe('isExemptProduct', () => {
  it('exempts Dynarex by vendor, case-insensitively', () => {
    expect(isExemptProduct(rx({ vendor: 'Dynarex' }))).toBe(true)
    expect(isExemptProduct(rx({ vendor: 'dynarex ' }))).toBe(true)
  })
  it('does not exempt other vendors', () => {
    expect(isExemptProduct(rx({ vendor: 'Exel' }))).toBe(false)
  })
  it('insulin scaffold stays inert until the field is confirmed', () => {
    expect(isExemptProduct(rx({ title: 'Insulin Syringe 1cc' }))).toBe(false)
  })
})

describe('cartRequiresRxGate', () => {
  const line = (product: ReturnType<typeof rx>) => ({ merchandise: { product } })
  it('true when any non-exempt RX line is present', () => {
    expect(cartRequiresRxGate([line(rx({ tags: [] })), line(rx())])).toBe(true)
  })
  it('false when all RX lines are exempt (Dynarex)', () => {
    expect(cartRequiresRxGate([line(rx({ vendor: 'Dynarex' }))])).toBe(false)
    expect(isGatedRxProduct(rx({ vendor: 'Dynarex' }))).toBe(false)
  })
  it('false for a cart with no RX lines', () => {
    expect(cartRequiresRxGate([line(rx({ tags: ['category:gloves'] }))])).toBe(false)
  })
})

describe('resolveGateStatus — enforcement ENABLED', () => {
  const on = { enforcementEnabled: true }
  it('blocks a signed-out RX cart (forced account creation)', () => {
    expect(resolveGateStatus({ cartHasRx: true, signedIn: false, hasDocument: false, verified: false, ...on }).blocked).toBe(true)
  })
  it('blocks a signed-in RX cart with no document', () => {
    expect(resolveGateStatus({ cartHasRx: true, signedIn: true, hasDocument: false, verified: false, ...on }).blocked).toBe(true)
  })
  it('unblocks once a document is on file — never asks again', () => {
    expect(resolveGateStatus({ cartHasRx: true, signedIn: true, hasDocument: true, verified: false, ...on }).blocked).toBe(false)
    expect(resolveGateStatus({ cartHasRx: true, signedIn: true, hasDocument: true, verified: true, ...on }).blocked).toBe(false)
  })
  it('never blocks a cart without gated RX lines', () => {
    expect(resolveGateStatus({ cartHasRx: false, signedIn: false, hasDocument: false, verified: false, ...on }).blocked).toBe(false)
  })
})

/**
 * The kill-switch (RX_CHECKOUT_ENFORCEMENT=false) exists ONLY as an emergency
 * rollback if the gate misfires in production. It is not a launch toggle: the
 * RX account/document flow is an existing compliance control and ships ON.
 * Default-ON behaviour is covered in rx-compliance-regression.test.ts.
 */
describe('resolveGateStatus — emergency kill-switch explicitly set to false', () => {
  const off = { enforcementEnabled: false }

  it('does not block, whatever the cart and account state', () => {
    for (const signedIn of [true, false]) {
      for (const hasDocument of [true, false]) {
        for (const verified of [true, false]) {
          expect(
            resolveGateStatus({ cartHasRx: true, signedIn, hasDocument, verified, ...off }).blocked,
          ).toBe(false)
        }
      }
    }
  })

  it('still reports the underlying state (so the UI can invite an upload)', () => {
    const status = resolveGateStatus({ cartHasRx: true, signedIn: true, hasDocument: false, verified: false, ...off })
    expect(status.cartHasRx).toBe(true)
    expect(status.hasDocument).toBe(false)
    expect(status.blocked).toBe(false)
  })

  it('requires the exact string "false" — no near-miss value disables the gate', async () => {
    const original = process.env.RX_CHECKOUT_ENFORCEMENT
    try {
      for (const value of [undefined, '', 'FALSE', '0', 'no', 'off']) {
        if (value === undefined) delete process.env.RX_CHECKOUT_ENFORCEMENT
        else process.env.RX_CHECKOUT_ENFORCEMENT = value
        const { isRxEnforcementEnabled } = await import('../rx-gate')
        expect(isRxEnforcementEnabled(), `value ${JSON.stringify(value)} must NOT disable the gate`).toBe(true)
        expect(
          resolveGateStatus({ cartHasRx: true, signedIn: false, hasDocument: false, verified: false }).blocked,
        ).toBe(true)
      }
    } finally {
      if (original === undefined) delete process.env.RX_CHECKOUT_ENFORCEMENT
      else process.env.RX_CHECKOUT_ENFORCEMENT = original
    }
  })
})

/**
 * Catalog audit 2026-08-02: `custom.is_rx_only` is true on 501 products while
 * the RX tag covers only 461 — the tag set is a strict subset. Keying on the
 * tag alone left 40 ACTIVE prescription products (injectable anesthetics,
 * bacteriostatic water) undetected. Detection now UNIONs the two signals so a
 * source disagreement can only widen the RX set.
 */
describe('isRxProduct — union of tag and custom.is_rx_only metafield', () => {
  it('detects via the canonical tag alone', () => {
    expect(isRxProduct({ tags: ['compliance:rx-only'] })).toBe(true)
  })

  it('detects via the legacy display tag alone', () => {
    expect(isRxProduct({ tags: ['rx-required'] })).toBe(true)
  })

  it('detects via the metafield alone — the 40-product gap', () => {
    expect(isRxProduct({ tags: [], isRxOnly: { value: 'true' } })).toBe(true)
    expect(isRxProduct({ tags: ['category:pharmacy-products'], isRxOnly: 'true' })).toBe(true)
  })

  it('accepts the truthy metafield spellings Shopify emits', () => {
    for (const v of ['true', 'TRUE', ' True ', '1', 'yes']) {
      expect(isRxProduct({ tags: [], isRxOnly: { value: v } }), `value ${v}`).toBe(true)
    }
  })

  it('stays false for non-RX products and falsy/absent metafield values', () => {
    for (const v of ['false', '0', 'no', '', null, undefined]) {
      expect(isRxProduct({ tags: [], isRxOnly: v as never }), `value ${String(v)}`).toBe(false)
    }
    expect(isRxProduct({ tags: ['category:gloves'] })).toBe(false)
    expect(isRxProduct({})).toBe(false)
  })

  it('exemptions still apply on top of the widened detection', () => {
    // Dynarex exemption (June client decision) must survive the union.
    expect(isRxProduct({ tags: [], isRxOnly: { value: 'true' }, vendor: 'Dynarex' })).toBe(true)
    expect(isGatedRxProduct({ tags: [], isRxOnly: { value: 'true' }, vendor: 'Dynarex' })).toBe(false)
  })
})
