import { describe, it, expect } from 'vitest'
import { GET_PRODUCT } from '../queries/products'

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
