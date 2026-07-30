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
 * Plan §9.1: RX checkout enforcement is a BLOCKED compliance decision, so it
 * must not be able to block a customer's checkout at the launch default.
 * These tests are the guard on that.
 */
describe('resolveGateStatus — enforcement DISABLED (launch default)', () => {
  const off = { enforcementEnabled: false }

  it('never blocks, whatever the cart and account state', () => {
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

  it('defaults to disabled when the env flag is unset or not exactly "true"', async () => {
    const original = process.env.RX_CHECKOUT_ENFORCEMENT
    try {
      for (const value of [undefined, '', 'false', 'TRUE', '1', 'yes']) {
        if (value === undefined) delete process.env.RX_CHECKOUT_ENFORCEMENT
        else process.env.RX_CHECKOUT_ENFORCEMENT = value
        const { isRxEnforcementEnabled } = await import('../rx-gate')
        expect(isRxEnforcementEnabled(), `value ${JSON.stringify(value)} must not enable enforcement`).toBe(false)
        // No explicit flag → resolveGateStatus reads the env and cannot block.
        expect(
          resolveGateStatus({ cartHasRx: true, signedIn: false, hasDocument: false, verified: false }).blocked,
        ).toBe(false)
      }
    } finally {
      if (original === undefined) delete process.env.RX_CHECKOUT_ENFORCEMENT
      else process.env.RX_CHECKOUT_ENFORCEMENT = original
    }
  })
})
