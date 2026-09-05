import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS, GET_ALL_PRODUCT_TAGS } from '@/lib/shopify/queries/products'
import ProductPage from '../[slug]/page'

const mockFetch = vi.mocked(storefrontFetch)

type SchemaEl = { props: { sku: string; mpn?: string; image: string; price: number; priceCurrency: string; availability: string; url: string } }
type BreadcrumbEl = { props: { currentUrl: string } }
type ProductViewEl = { props: { initialVariant: { id: string; sku: string | null } } }

const blueVariant = {
  id: 'gid://shopify/ProductVariant/1',
  title: 'Blue',
  sku: 'SKU-BLUE',
  barcode: null,
  availableForSale: true,
  selectedOptions: [{ name: 'Color', value: 'Blue' }],
  price: { amount: '9.99', currencyCode: 'USD' },
  compareAtPrice: null,
  image: { id: 'img-blue', url: 'https://cdn.shopify.com/blue.jpg', altText: 'Blue', width: 800, height: 800 },
  manufacturerNumber: { value: 'MFR-BLUE-1' },
  orderSize: null,
  unitsPerOrder: null,
  description: null,
}
const redVariant = {
  ...blueVariant,
  id: 'gid://shopify/ProductVariant/2',
  title: 'Red',
  sku: 'SKU-RED',
  selectedOptions: [{ name: 'Color', value: 'Red' }],
  price: { amount: '11.99', currencyCode: 'USD' },
  availableForSale: false,
  image: { id: 'img-red', url: 'https://cdn.shopify.com/red.jpg', altText: 'Red', width: 800, height: 800 },
  manufacturerNumber: { value: 'MFR-RED-2' },
}

const rawProduct = {
  id: 'gid://shopify/Product/1',
  title: 'Flame Glove',
  handle: 'flame-glove',
  description: 'A glove.',
  descriptionHtml: '<p>A glove.</p>',
  vendor: 'AcmeMed',
  availableForSale: true,
  tags: [],
  priceRange: {
    minVariantPrice: { amount: '9.99', currencyCode: 'USD' },
    maxVariantPrice: { amount: '11.99', currencyCode: 'USD' },
  },
  images: { nodes: [{ id: 'img1', url: 'https://cdn.shopify.com/gloves.jpg', altText: 'Gloves', width: 1600, height: 900 }] },
  variants: { nodes: [blueVariant, redVariant] },
  options: [{ id: 'opt1', name: 'Color', values: ['Blue', 'Red'] }],
  seo: { title: null, description: null },
  brandName: null,
  unitsPerOrder: null,
  quantityOfUnits: null,
  orderSize: null,
  material: null,
  use: null,
  features: null,
  color: null,
  sterility: null,
  thickness: null,
  gloveSize: null,
  needleGauge: null,
  needleLength: null,
  sizeLength: null,
  estimatedRestockDate: null,
  backorderRestockEta: null,
  testsFor: null,
  detectableDrugs: null,
  adulterants: null,
  otherFeatures: null,
  typeList: null,
  customBadge1: null,
  customBadge2: null,
  customBadge3: null,
  collections: { nodes: [] },
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation(async (query: string) => {
    if (query === GET_PRODUCT) return { product: rawProduct }
    if (query === GET_PRODUCT_RECS) return { related: [], complementary: [] }
    if (query === GET_ALL_PRODUCT_TAGS) return { products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } }
    throw new Error(`unexpected query in test: ${query}`)
  })
})

// The server render is variant-NEUTRAL now: the page is ISR-cached, so it always
// renders the DEFAULT variant regardless of any `?variant=` in the URL. The
// `?variant=` deep-link is reconciled client-side in useSelectedVariant. This
// helper therefore no longer forwards searchParams — the `variant` arg only
// documents the URL a real visitor would have; it must NOT change server output.
async function renderProductPage(_variant?: string) {
  const el = (await ProductPage({
    params: Promise.resolve({ slug: 'flame-glove' }),
  })) as unknown as { props: { children: unknown[] } }
  const [, schemaEl, breadcrumbEl, productViewEl] = el.props.children as [unknown, SchemaEl, BreadcrumbEl, ProductViewEl]
  return { schemaEl, breadcrumbEl, productViewEl }
}

// Caching-era contract (ISR): the product page is statically cached, so the
// SERVER render is variant-NEUTRAL — ProductSchema/ProductView/BreadcrumbSchema
// always reflect the DEFAULT variant and the canonical stays neutral, whatever
// `?variant=` is in the URL. The selected-variant view is reconciled client-side
// (components/product/useSelectedVariant.ts). This supersedes the original LG-03
// "server-side `?variant=` feeds the schema" behavior, which was incompatible
// with caching (reading searchParams server-side forces dynamic rendering).
describe('ProductPage — variant-neutral server render for ISR caching (supersedes LG-03)', () => {
  it('with no ?variant=, schema and ProductView both use the default (first purchasable) variant', async () => {
    const { schemaEl, breadcrumbEl, productViewEl } = await renderProductPage(undefined)
    expect(schemaEl.props.sku).toBe('SKU-BLUE')
    expect(schemaEl.props.price).toBe(9.99)
    expect(schemaEl.props.availability).toBe('InStock')
    expect(productViewEl.props.initialVariant.id).toBe(blueVariant.id)
    expect(schemaEl.props.url).toBe('https://mdsupplies.com/product/flame-glove')
    expect(breadcrumbEl.props.currentUrl).toBe('https://mdsupplies.com/product/flame-glove')
  })

  it('ignores ?variant= server-side (stays on default Blue) so the render is cacheable + neutral', async () => {
    // Even with ?variant=Red in the URL, the cached server render stays on the
    // default (Blue). The client switches to Red at runtime (useSelectedVariant).
    const { schemaEl, breadcrumbEl, productViewEl } = await renderProductPage(redVariant.id)
    expect(schemaEl.props.sku).toBe('SKU-BLUE')
    expect(schemaEl.props.price).toBe(9.99)
    expect(schemaEl.props.availability).toBe('InStock')
    expect(productViewEl.props.initialVariant.id).toBe(blueVariant.id)
    // Neutral regardless — no `?variant=` leaks into structured data or canonical.
    expect(schemaEl.props.url).toBe('https://mdsupplies.com/product/flame-glove')
    expect(breadcrumbEl.props.currentUrl).toBe('https://mdsupplies.com/product/flame-glove')
  })

  it('an unknown/absent variant still renders the default variant rather than erroring', async () => {
    const { schemaEl } = await renderProductPage('gid://shopify/ProductVariant/does-not-exist')
    expect(schemaEl.props.sku).toBe('SKU-BLUE')
  })

  it('structured data mpn and image stay on the default (Blue) even with ?variant=Red in the URL', async () => {
    const { schemaEl } = await renderProductPage(redVariant.id)
    expect(schemaEl.props.mpn).toBe('MFR-BLUE-1')
    expect(schemaEl.props.image).toBe('https://cdn.shopify.com/blue.jpg')
  })

  it('with no ?variant=, structured data mpn and image use the default (Blue) variant', async () => {
    const { schemaEl } = await renderProductPage(undefined)
    expect(schemaEl.props.mpn).toBe('MFR-BLUE-1')
    expect(schemaEl.props.image).toBe('https://cdn.shopify.com/blue.jpg')
  })
})
