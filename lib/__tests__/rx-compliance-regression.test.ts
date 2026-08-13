import { describe, it, expect } from 'vitest'
import {
  isRxProduct,
  isGatedRxProduct,
  cartRequiresRxGate,
  resolveGateStatus,
  isRxEnforcementEnabled,
} from '../rx-gate'
import { resolveShopifyLabels } from '../labels/shopify-labels'
import { resolvePurchasable } from '../purchasability'

/**
 * RX COMPLIANCE REGRESSION SUITE (Phase 5).
 *
 * The developers built a deliberate compliance flow: an RX cart forces sign-in
 * or account creation, then a prescription/medical-license document upload,
 * with a server-side recheck before checkout. A prior pass shipped that gate
 * DISABLED by default, which silently removed it. Bilal confirmed 2026-08-02
 * that the flow must be preserved and active.
 *
 * These tests exist so that can never happen accidentally again.
 *
 * SCOPE NOTE: this is the storefront UX gate. It is NOT bypass-proof — a user
 * can still reach a checkout URL directly. The bypass-resistant control is the
 * companion Shopify validation app. Nothing here should be read as a claim
 * that the frontend alone is a legal control.
 */

const signedOut = { cartHasRx: true, signedIn: false, hasDocument: false, verified: false }
const noDoc = { cartHasRx: true, signedIn: true, hasDocument: false, verified: false }
const withDoc = { cartHasRx: true, signedIn: true, hasDocument: true, verified: false }

describe('enforcement default', () => {
  it('is ON unless explicitly disabled with the exact string "false"', () => {
    const original = process.env.RX_CHECKOUT_ENFORCEMENT
    try {
      for (const v of [undefined, '', 'true', 'TRUE', '0', 'no', 'off', 'yes']) {
        if (v === undefined) delete process.env.RX_CHECKOUT_ENFORCEMENT
        else process.env.RX_CHECKOUT_ENFORCEMENT = v
        expect(isRxEnforcementEnabled(), `value ${JSON.stringify(v)} must leave the gate ON`).toBe(true)
      }
      process.env.RX_CHECKOUT_ENFORCEMENT = 'false'
      expect(isRxEnforcementEnabled()).toBe(false)
    } finally {
      if (original === undefined) delete process.env.RX_CHECKOUT_ENFORCEMENT
      else process.env.RX_CHECKOUT_ENFORCEMENT = original
    }
  })

  it('gates an RX cart by default, with no flag set at all', () => {
    const original = process.env.RX_CHECKOUT_ENFORCEMENT
    try {
      delete process.env.RX_CHECKOUT_ENFORCEMENT
      expect(resolveGateStatus(signedOut).blocked).toBe(true)
      expect(resolveGateStatus(noDoc).blocked).toBe(true)
    } finally {
      if (original === undefined) delete process.env.RX_CHECKOUT_ENFORCEMENT
      else process.env.RX_CHECKOUT_ENFORCEMENT = original
    }
  })
})

describe('account / document flow states', () => {
  const on = { enforcementEnabled: true }

  it('signed-out RX cart is blocked (forces sign in / create account)', () => {
    const s = resolveGateStatus({ ...signedOut, ...on })
    expect(s.blocked).toBe(true)
    expect(s.signedIn).toBe(false)
  })

  it('signed-in RX cart with no document is blocked (forces upload)', () => {
    const s = resolveGateStatus({ ...noDoc, ...on })
    expect(s.blocked).toBe(true)
    expect(s.signedIn).toBe(true)
    expect(s.hasDocument).toBe(false)
  })

  it('account with a document on file may proceed — never asked again', () => {
    expect(resolveGateStatus({ ...withDoc, ...on }).blocked).toBe(false)
    expect(resolveGateStatus({ ...withDoc, verified: true, ...on }).blocked).toBe(false)
  })

  it('a non-RX cart is never blocked', () => {
    expect(resolveGateStatus({ cartHasRx: false, signedIn: false, hasDocument: false, verified: false, ...on }).blocked)
      .toBe(false)
  })
})

describe('RX detection union — widening only', () => {
  const tagOnly = { tags: ['compliance:rx-only'], vendor: 'Exel' }
  const metafieldOnly = { tags: ['category:pharmacy-products'], isRxOnly: { value: 'true' }, vendor: 'Modern Medical Products' }

  it('gates a tag-only RX product', () => {
    expect(isRxProduct(tagOnly)).toBe(true)
    expect(isGatedRxProduct(tagOnly)).toBe(true)
    expect(cartRequiresRxGate([{ merchandise: { product: tagOnly } }])).toBe(true)
  })

  it('gates a metafield-only RX product (the 40 active products the tag missed)', () => {
    expect(isRxProduct(metafieldOnly)).toBe(true)
    expect(isGatedRxProduct(metafieldOnly)).toBe(true)
    expect(cartRequiresRxGate([{ merchandise: { product: metafieldOnly } }])).toBe(true)
  })

  it('gates a mixed cart when ANY line is RX', () => {
    const plain = { tags: ['category:gloves'], vendor: 'Dukal' }
    expect(cartRequiresRxGate([
      { merchandise: { product: plain } },
      { merchandise: { product: metafieldOnly } },
    ])).toBe(true)
  })

  it('leaves approved exemptions exactly as they were', () => {
    // Dynarex exemption is a June client decision — not invented, not removed.
    const exempt = { tags: ['compliance:rx-only'], vendor: 'Dynarex' }
    expect(isRxProduct(exempt)).toBe(true)
    expect(isGatedRxProduct(exempt)).toBe(false)
    expect(cartRequiresRxGate([{ merchandise: { product: exempt } }])).toBe(false)
  })

  it('does not invent new exemptions', () => {
    // The insulin-syringe exemption stays an inert scaffold until Izzy confirms
    // the data expression — a title match must not silently exempt anything.
    const insulinish = { tags: ['compliance:rx-only'], vendor: 'Exel', title: 'Insulin Syringe 1cc' }
    expect(isGatedRxProduct(insulinish)).toBe(true)
  })
})

describe('RX cannot be influenced by other systems', () => {
  it('a client-authored product label cannot create or remove RX status', () => {
    // Labels are display objects. Even a label literally saying "Rx Only"
    // produces no RX signal, and no label can clear one.
    const labels = resolveShopifyLabels({
      references: { nodes: [{ fields: [{ key: 'text', value: 'Rx Only' }, { key: 'style', value: 'rx' }] }] },
    })
    expect(labels).toHaveLength(1)

    const plain = { tags: ['category:gloves'], vendor: 'Dukal' }
    expect(isRxProduct(plain)).toBe(false)
    expect(cartRequiresRxGate([{ merchandise: { product: plain } }])).toBe(false)

    const rx = { tags: ['compliance:rx-only'], vendor: 'Exel' }
    expect(isGatedRxProduct(rx)).toBe(true)
  })

  it('zero-price logic is independent of RX logic', () => {
    // A priced RX item is still gated; an unpriced non-RX item is not RX.
    const rx = { tags: ['compliance:rx-only'], vendor: 'Exel' }
    expect(isGatedRxProduct(rx)).toBe(true)
    expect(resolvePurchasable({ price: 0, availableForSale: true }))
      .toEqual({ purchasable: false, reason: 'price-unavailable' })

    const freeButNotRx = { tags: ['category:gloves'], vendor: 'Dukal' }
    expect(isRxProduct(freeButNotRx)).toBe(false)
  })
})

describe('both Storefront queries carry both RX signals', () => {
  it('cart and product queries request tags AND custom.is_rx_only', async () => {
    const { GET_CART } = await import('../shopify/queries/cart')
    const { GET_PRODUCT } = await import('../shopify/queries/products')
    for (const [name, q] of [['GET_CART', GET_CART], ['GET_PRODUCT', GET_PRODUCT]] as const) {
      expect(q, `${name} must select tags`).toMatch(/\btags\b/)
      expect(q, `${name} must select custom.is_rx_only`).toContain('key: "is_rx_only"')
    }
  })
})
