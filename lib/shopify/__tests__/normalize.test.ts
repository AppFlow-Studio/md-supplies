import { describe, it, expect } from 'vitest'
import { normalizeProduct, normalizeVariant, type RawProduct, type RawVariant } from '../normalize'

// Every mapped field the query doesn't select silently resolves to null with
// no error — the same failure mode that let brandName fall back to vendor on
// half the catalogue (see product-query-metafields.test.ts). This guards the
// normalize step in isolation, since ProductView's own tests build an
// already-normalized Product fixture and would never catch a mapping gap here.
const nullMetafields = {
  brandName: null, unitsPerOrder: null, quantityOfUnits: null, orderSize: null,
  material: null, use: null, features: null, color: null, sterility: null,
  thickness: null, gloveSize: null, needleGauge: null, needleLength: null,
  sizeLength: null, estimatedRestockDate: null, backorderRestockEta: null,
  backorder: null, isRxOnly: null, freeShipping: null, shippingReturns: null,
  testsFor: null, detectableDrugs: null, adulterants: null, otherFeatures: null,
  typeList: null, customBadge1: null, customBadge2: null, customBadge3: null,
}

function rawProduct(overrides: Partial<RawProduct> = {}): RawProduct {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Test Product',
    handle: 'test-product',
    description: '',
    descriptionHtml: '',
    vendor: 'Acme',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '1.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '1.00', currencyCode: 'USD' },
    },
    images: { nodes: [] },
    variants: { nodes: [] },
    options: [],
    seo: { title: null, description: null },
    collections: { nodes: [] },
    ...nullMetafields,
    ...overrides,
  } as RawProduct
}

describe('normalizeProduct — custom.shipping_returns (H-01)', () => {
  it('flattens the raw metafield into a plain string', () => {
    const result = normalizeProduct(
      rawProduct({ shippingReturns: { value: 'Ships freight. 30-day RGA required.' } }),
    )
    expect(result.shippingReturns).toBe('Ships freight. 30-day RGA required.')
  })

  it('normalizes an absent metafield to null, not an empty raw object', () => {
    const result = normalizeProduct(rawProduct({ shippingReturns: null }))
    expect(result.shippingReturns).toBeNull()
  })

  // Confirmed live 2026-08-17 against the QA store: custom.shipping_returns'
  // sibling field custom.variant_description was created as Shopify's "Rich
  // text" metafield type, whose raw .value is JSON, not display text. Bilal's
  // launch-direction message calls shipping_returns "rich text" too, so the
  // same parsing must apply here or the PDP will print raw JSON.
  it('parses Shopify rich_text JSON into plain text', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Ships via freight. 30-day RGA required.' }] }],
    })
    const result = normalizeProduct(rawProduct({ shippingReturns: { value: raw } }))
    expect(result.shippingReturns).toBe('Ships via freight. 30-day RGA required.')
  })
})

describe('normalizeVariant — custom.variant_description rich_text (AeroWalk pilot)', () => {
  const baseRawVariant: RawVariant = {
    id: 'gid://shopify/ProductVariant/1',
    title: 'Blue',
    sku: '10277BL',
    availableForSale: true,
    quantityAvailable: 10,
    selectedOptions: [{ name: 'Color', value: 'Blue' }],
    price: { amount: '129.99', currencyCode: 'USD' },
    compareAtPrice: null,
    manufacturerNumber: null,
    orderSize: null,
    unitsPerOrder: null,
    description: null,
  }

  // Confirmed live 2026-08-17: the QA AeroWalk Blue variant's raw
  // custom.variant_description value is exactly this JSON shape.
  it('parses the live AeroWalk QA rich_text value into plain text', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Blue frame with matching fork covers.' }] }],
    })
    const result = normalizeVariant({ ...baseRawVariant, description: { value: raw } })
    expect(result.description).toBe('Blue frame with matching fork covers.')
  })

  it('normalizes an absent description metafield to null', () => {
    const result = normalizeVariant({ ...baseRawVariant, description: null })
    expect(result.description).toBeNull()
  })
})

// LG-04 packaging breakdown (2026-08-17): confirmed live in QA by Izzy —
// Number (integer), variant-scoped. "Blank means no data, not zero" (Izzy's
// words) — Shopify returns null for an unset number metafield, never "0", so
// no special zero-handling is needed here, only the standard null passthrough.
describe('normalizeVariant — packaging breakdown fields (LG-04)', () => {
  const baseRawVariant: RawVariant = {
    id: 'gid://shopify/ProductVariant/1',
    title: 'Box',
    sku: '309589-1',
    availableForSale: true,
    quantityAvailable: 10,
    selectedOptions: [{ name: 'Pack', value: 'Box' }],
    price: { amount: '9.99', currencyCode: 'USD' },
    compareAtPrice: null,
    manufacturerNumber: null,
    orderSize: null,
    unitsPerOrder: null,
    description: null,
    innerPackQuantity: null,
    packsPerCase: null,
    totalOrderQuantity: null,
  }

  it('flattens inner_pack_quantity and packs_per_case, leaving total blank when the source never stated one', () => {
    const result = normalizeVariant({
      ...baseRawVariant,
      innerPackQuantity: { value: '100' },
      packsPerCase: { value: '8' },
      totalOrderQuantity: null,
    })
    expect(result.innerPackQuantity).toBe('100')
    expect(result.packsPerCase).toBe('8')
    expect(result.totalOrderQuantity).toBeNull()
  })

  it('flattens total_order_quantity alone when that is the only value the source gave', () => {
    const result = normalizeVariant({ ...baseRawVariant, totalOrderQuantity: { value: '2000' } })
    expect(result.totalOrderQuantity).toBe('2000')
    expect(result.innerPackQuantity).toBeNull()
    expect(result.packsPerCase).toBeNull()
  })
})
