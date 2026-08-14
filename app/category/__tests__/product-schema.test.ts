import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn(async () => []) }))
// CategoryProductPage calls getNonce() directly (outside any JSX descriptor),
// which reads next/headers — unavailable outside a real request scope when
// invoking the Server Component function directly in a unit test.
vi.mock('@/lib/csp-nonce', () => ({ getNonce: vi.fn(async () => 'test-nonce') }))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import CategoryProductPage from '../[slug]/[product]/page'

const mockFetch = vi.mocked(storefrontFetch)

const variant = {
  id: 'gid://shopify/ProductVariant/1', title: 'White', sku: 'SKU-WHITE',
  barcode: null, availableForSale: true,
  selectedOptions: [{ name: 'Color', value: 'White' }],
  price: { amount: '129.99', currencyCode: 'USD' }, compareAtPrice: null,
  image: { id: 'img-white', url: 'https://cdn.shopify.com/white.jpg', altText: 'White', width: 800, height: 800 },
  manufacturerNumber: { value: '10277WT' }, orderSize: null, unitsPerOrder: null, description: null,
}

const rawProduct = {
  id: 'gid://shopify/Product/1', title: 'AeroWalk Ultra-Lite Rollator',
  handle: 'aerowalk-ultra-lite-rollator', description: 'A rollator.',
  descriptionHtml: '<p>A rollator.</p>', vendor: 'Drive Medical',
  availableForSale: true, tags: [],
  priceRange: { minVariantPrice: { amount: '129.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '129.99', currencyCode: 'USD' } },
  images: { nodes: [{ id: 'img1', url: 'https://cdn.shopify.com/default.jpg', altText: 'Default', width: 800, height: 800 }] },
  variants: { nodes: [variant] },
  options: [{ id: 'opt1', name: 'Color', values: ['White'] }],
  seo: { title: null, description: null }, collections: { nodes: [] },
  brandName: null, unitsPerOrder: null, quantityOfUnits: null, orderSize: null,
  material: null, use: null, features: null, color: null, sterility: null,
  thickness: null, gloveSize: null, needleGauge: null, needleLength: null,
  sizeLength: null, estimatedRestockDate: null, backorderRestockEta: null,
  testsFor: null, detectableDrugs: null, adulterants: null, otherFeatures: null,
  typeList: null, customBadge1: null, customBadge2: null, customBadge3: null,
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation(async (query: string) => {
    if (query === GET_PRODUCT) return { product: rawProduct }
    if (query === GET_PRODUCT_RECS) return { related: [], complementary: [] }
    throw new Error(`unexpected query in test: ${query}`)
  })
})

// Parity gap found 2026-08-14: /product/[slug] renders ProductSchema;
// /category/[slug]/[product] never did, for any product, at any time — not
// AeroWalk-specific, but this is the pass that surfaces it, since Bilal's
// checklist requires both routes to agree on structured data.
describe('CategoryProductPage — ProductSchema (parity with /product/[slug])', () => {
  it('renders ProductSchema with the resolved variant sku, mpn and image', async () => {
    const el = (await CategoryProductPage({
      params: Promise.resolve({ slug: 'mobility', product: 'aerowalk-ultra-lite-rollator' }),
      searchParams: Promise.resolve({}),
    })) as unknown as { props: { children: unknown[] } }

    const schemaEl = el.props.children.find(
      (child): child is { props: { sku: string; mpn?: string; image: string } } =>
        Boolean(child) && typeof child === 'object' && 'props' in (child as object) &&
        (child as { props?: { sku?: string } }).props?.sku === 'SKU-WHITE',
    )
    expect(schemaEl).toBeDefined()
    expect(schemaEl!.props.mpn).toBe('10277WT')
    expect(schemaEl!.props.image).toBe('https://cdn.shopify.com/white.jpg')
  })
})
