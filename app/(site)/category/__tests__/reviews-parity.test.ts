import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({
  fetchProductTagSummaries: vi.fn(async () => []),
  hasFlatCategoryCollection: vi.fn(async () => false),
}))
// CategoryProductPage calls getNonce() directly (outside any JSX descriptor),
// which reads next/headers — unavailable outside a real request scope when
// invoking the Server Component function directly in a unit test.
vi.mock('@/lib/csp-nonce', () => ({ getNonce: vi.fn(async () => 'test-nonce') }))
// getPriceValidUntil is a `use cache` fn; cacheLife()/cacheTag() throw outside the
// cacheComponents runtime (i.e. in vitest), so stub next/cache to no-ops.
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock('@/lib/trustshop/product-id', () => ({ getNumericShopifyProductId: vi.fn(() => 987654) }))
vi.mock('@/lib/trustshop/product', () => ({
  getCachedProductReviewSummary: vi.fn(async () => ({
    averageRating: 4.5,
    totalReviews: 12,
    ratingsDistribution: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 8 },
  })),
  listProductReviews: vi.fn(async () => ({ reviews: [], currentPage: 1, hasNextPage: false })),
  getProductReviewMedia: vi.fn(async () => ({ media: [] })),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import { ProductView } from '@/components/product/ProductView'
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

// Parity gap: /product/[slug] wires TrustShop reviews into ProductView (and
// aggregateRating into ProductSchema); /category/[slug]/[product] never did,
// for any product — so a customer landing on the category-nested PDP URL
// never sees reviews, no matter how many are on file.
describe('CategoryProductPage — reviews wiring (parity with /product/[slug])', () => {
  it('passes reviewSummary and reviewsSection to ProductView', async () => {
    const el = (await CategoryProductPage({
      params: Promise.resolve({ slug: 'mobility', product: 'aerowalk-ultra-lite-rollator' }),
      searchParams: Promise.resolve({}),
    })) as unknown as { props: { children: unknown[] } }

    const productViewEl = el.props.children.find(
      (child): child is { props: { reviewSummary: unknown; reviewsSection: unknown } } =>
        Boolean(child) && typeof child === 'object' && 'type' in (child as object) &&
        (child as { type?: unknown }).type === ProductView,
    )

    expect(productViewEl).toBeDefined()
    expect(productViewEl!.props.reviewSummary).toEqual(
      expect.objectContaining({ averageRating: 4.5, totalReviews: 12 }),
    )
    // reviewsSection is a Promise now (Cache Components: awaited only inside
    // the Suspense-wrapped ProductReviewsAsync, never at the top of the
    // page) — await it here to assert on the resolved review data.
    await expect(productViewEl!.props.reviewsSection).resolves.toEqual(
      expect.objectContaining({
        productGid: 'gid://shopify/Product/1',
        summary: expect.objectContaining({ totalReviews: 12 }),
      }),
    )
  })

  it('includes aggregateRating in the ProductSchema JSON-LD props', async () => {
    const el = (await CategoryProductPage({
      params: Promise.resolve({ slug: 'mobility', product: 'aerowalk-ultra-lite-rollator' }),
      searchParams: Promise.resolve({}),
    })) as unknown as { props: { children: unknown[] } }

    const schemaEl = el.props.children.find(
      (child): child is { props: { sku: string; aggregateRating?: { ratingValue: number; reviewCount: number } } } =>
        Boolean(child) && typeof child === 'object' && 'props' in (child as object) &&
        (child as { props?: { sku?: string } }).props?.sku === 'SKU-WHITE',
    )

    expect(schemaEl).toBeDefined()
    expect(schemaEl!.props.aggregateRating).toEqual(
      expect.objectContaining({ ratingValue: 4.5, reviewCount: 12 }),
    )
  })
})
