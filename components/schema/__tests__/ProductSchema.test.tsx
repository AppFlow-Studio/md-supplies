import { describe, it, expect, vi } from 'vitest'

// ProductSchema is an async Server Component (`await getNonce()`, which reads
// `next/headers`) — React's client renderer cannot render async function
// components (same limitation documented in
// components/b2b/__tests__/IndustryPage.test.tsx), and `headers()` throws
// outside a real request scope. Mocked here so the component can be invoked
// directly as a plain async function and its returned element inspected.
vi.mock('@/lib/csp-nonce', () => ({ getNonce: async () => undefined }))

import { ProductSchema } from '../ProductSchema'

type SchemaScript = { props: { dangerouslySetInnerHTML: { __html: string } } }

async function renderSchema(props: Parameters<typeof ProductSchema>[0]) {
  const el = (await ProductSchema(props)) as unknown as SchemaScript
  return JSON.parse(el.props.dangerouslySetInnerHTML.__html)
}

async function renderSchemaRaw(props: Parameters<typeof ProductSchema>[0]) {
  return ProductSchema(props)
}

const baseProps = {
  name: 'Nitrile Exam Gloves',
  description: 'Durable exam gloves.',
  image: '/gloves.jpg',
  sku: 'SKU-123',
  price: 19.99,
  priceCurrency: 'USD',
  availability: 'InStock' as const,
  url: 'https://example.com/product/gloves',
  seller: 'MDSupplies',
}

describe('ProductSchema — price/structured-data agreement (DEV-LAUNCH-07)', () => {
  it('emits an Offer with the real price when the product is priced', async () => {
    const schema = await renderSchema(baseProps)
    expect(schema.offers).toMatchObject({ price: 19.99, priceCurrency: 'USD' })
  })

  it('renders no Product schema at all for a zero-price (quote-only) product', async () => {
    // A $0 Offer would tell Google a price the page itself refuses to state
    // ("Contact for pricing") — the exact PDP/structured-data disagreement
    // this ticket's acceptance criteria forbid. And since this component never
    // emits review/aggregateRating either, a Product node with none of
    // offers/review/aggregateRating fails Google's Product rich-result
    // required-property check (the real cause of the 12 pharmacy/HRT Rich
    // Results errors) — so skip the whole block rather than submit one.
    const el = await renderSchemaRaw({ ...baseProps, price: 0 })
    expect(el).toBeNull()
  })

  it('renders no Product schema for a missing/non-finite price', async () => {
    const el = await renderSchemaRaw({ ...baseProps, price: NaN })
    expect(el).toBeNull()
  })

  it('never emits a Brand node built from vendor when brand is omitted', async () => {
    const schema = await renderSchema(baseProps)
    expect(schema.brand).toBeUndefined()
  })

  it('emits the approved public brand when provided', async () => {
    const schema = await renderSchema({ ...baseProps, brand: 'Dynarex' })
    expect(schema.brand).toEqual({ '@type': 'Brand', name: 'Dynarex' })
  })
})
