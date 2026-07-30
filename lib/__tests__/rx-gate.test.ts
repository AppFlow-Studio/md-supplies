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

describe('resolveGateStatus', () => {
  it('blocks a signed-out RX cart (forced account creation)', () => {
    expect(resolveGateStatus({ cartHasRx: true, signedIn: false, hasDocument: false, verified: false }).blocked).toBe(true)
  })
  it('blocks a signed-in RX cart with no document', () => {
    expect(resolveGateStatus({ cartHasRx: true, signedIn: true, hasDocument: false, verified: false }).blocked).toBe(true)
  })
  it('unblocks once a document is on file — never asks again', () => {
    expect(resolveGateStatus({ cartHasRx: true, signedIn: true, hasDocument: true, verified: false }).blocked).toBe(false)
    expect(resolveGateStatus({ cartHasRx: true, signedIn: true, hasDocument: true, verified: true }).blocked).toBe(false)
  })
  it('never blocks a cart without gated RX lines', () => {
    expect(resolveGateStatus({ cartHasRx: false, signedIn: false, hasDocument: false, verified: false }).blocked).toBe(false)
  })
})
