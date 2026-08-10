import { describe, it, expect } from 'vitest'
import { GET_PRODUCT, GET_PRODUCTS_BY_VENDOR, GET_PRODUCT_RECS } from '../queries/products'

/**
 * The product page maps a metafield onto every field normalizeProduct declares,
 * but a mapped field is silently null unless the query actually asks for it.
 * That is how the PDP came to print the FULFILLING vendor as the brand: the
 * mapping existed, the selection did not, and `brandName ?? vendor` fell through
 * on every product.
 *
 * Nothing about that failure is visible in types or at runtime, so these guard the
 * selection itself.
 */
describe('GET_PRODUCT metafield selections', () => {
  it('requests custom.brand_name, so brand never falls back to vendor', () => {
    // vendor is the fulfiller and disagrees with brand on 51% of active products,
    // so the fallback was wrong for roughly half the catalogue.
    expect(GET_PRODUCT).toMatch(/brandName:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "brand_name"')
  })

  it('requests the back-order restock date, so the back-ordered state can render', () => {
    // Without it, an out-of-stock product holding a real ETA shows as a plain
    // "out of stock" and the back-ordered branch in ProductView is unreachable.
    expect(GET_PRODUCT).toMatch(/estimatedRestockDate:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "estimated_back_order_restock_date"')
  })

  it('is still a single parseable template literal', () => {
    // A backtick inside a comment in this file terminated the template literal
    // once already. Cheap check that the query survived editing.
    expect(GET_PRODUCT).toContain('query GetProduct')
    expect(GET_PRODUCT.split('{').length).toBe(GET_PRODUCT.split('}').length)
  })
})

/**
 * DEV-LAUNCH-07: every query built on the shared ProductCard fragment feeds
 * ShopifyProductCard (partner listings, PDP recommendations, homepage
 * sections) — the same component the category grid uses. GET_COLLECTION
 * already selected brand/RX/backorder; the fragment did not, so those
 * surfaces silently degraded to no brand line, no RX badge, and a plain
 * "Out of Stock" instead of a restock date, even for products that carry
 * the data.
 */
describe('ProductCard fragment metafield selections', () => {
  for (const [name, query] of [
    ['GET_PRODUCTS_BY_VENDOR', GET_PRODUCTS_BY_VENDOR],
    ['GET_PRODUCT_RECS', GET_PRODUCT_RECS],
  ] as const) {
    it(`${name} requests brand, RX, and backorder metafields via the shared fragment`, () => {
      expect(query).toMatch(/brandName:\s*metafield\(/)
      expect(query).toContain('key: "brand_name"')
      expect(query).toMatch(/estimatedRestockDate:\s*metafield\(/)
      expect(query).toContain('key: "estimated_back_order_restock_date"')
      expect(query).toMatch(/isRxOnly:\s*metafield\(/)
      expect(query).toContain('key: "is_rx_only"')
    })
  }
})
