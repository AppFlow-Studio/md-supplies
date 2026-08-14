import { describe, it, expect } from 'vitest'
import { GET_PRODUCT, GET_PRODUCTS_BY_VENDOR, GET_PRODUCT_RECS, SEARCH_PRODUCTS_BY_TAG } from '../queries/products'
import { GET_COLLECTION } from '../queries/collections'
import { GET_CART } from '../queries/cart'
import { SEARCH_PRODUCTS } from '../queries/search'

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

  // DEV-SHIP-04: both ETA fields are queried for compatibility/live-theme use
  // only — the custom storefront never displays or infers Backorder status
  // from either. custom.backorder (below) is the sole trigger.
  it('requests both ETA fields for compatibility, though neither is ever displayed', () => {
    expect(GET_PRODUCT).toMatch(/estimatedRestockDate:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "estimated_back_order_restock_date"')
    expect(GET_PRODUCT).toMatch(/backorderRestockEta:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "backorder_restock_eta"')
  })

  it('requests the backorder boolean, which is the sole gate for the backorder label', () => {
    expect(GET_PRODUCT).toMatch(/backorder:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "backorder"')
  })

  // DEV-SHIP-02: custom.free_shipping is the merchant-controlled gate ANDed
  // with the shipping resolver's own confirmation (lib/shipping-resolver/
  // free-shipping-gate.ts). Without this selection the field resolves to
  // null everywhere and the AND-gate silently closes on every product.
  it('requests custom.free_shipping, the merchant gate for the Free Shipping badge', () => {
    expect(GET_PRODUCT).toMatch(/freeShipping:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "free_shipping"')
  })

  it('is still a single parseable template literal', () => {
    // A backtick inside a comment in this file terminated the template literal
    // once already. Cheap check that the query survived editing.
    expect(GET_PRODUCT).toContain('query GetProduct')
    expect(GET_PRODUCT.split('{').length).toBe(GET_PRODUCT.split('}').length)
  })
})

// AeroWalk pilot (2026-08-14): variant-level manufacturer number, order
// size, units per order and description. Proposed contract —
// docs/launch/2026-08-14-variant-field-contract.md. If Izzy's actual
// namespace/key differs, this test (and only the query string below) needs
// to change; every other consumer reads the already-normalized field name.
describe('GET_PRODUCT variant-level metafield selections (AeroWalk pilot)', () => {
  it('requests custom.manufacturer_item_number on each variant', () => {
    expect(GET_PRODUCT).toMatch(/manufacturerNumber:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "manufacturer_item_number"')
  })

  it('requests custom.order_size on each variant', () => {
    expect(GET_PRODUCT).toMatch(/orderSize:\s*metafield\(/)
  })

  it('requests custom.units_per_order on each variant', () => {
    expect(GET_PRODUCT).toMatch(/unitsPerOrder:\s*metafield\(/)
  })

  it('requests custom.variant_description on each variant', () => {
    expect(GET_PRODUCT).toMatch(/description:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "variant_description"')
  })

  it('is still a single parseable template literal', () => {
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
      expect(query).toMatch(/backorder:\s*metafield\(/)
      expect(query).toContain('key: "backorder"')
      expect(query).toMatch(/isRxOnly:\s*metafield\(/)
      expect(query).toContain('key: "is_rx_only"')
    })

    it(`${name} requests custom.free_shipping via the shared fragment`, () => {
      expect(query).toMatch(/freeShipping:\s*metafield\(/)
      expect(query).toContain('key: "free_shipping"')
    })
  }
})

// DEV-SHIP-02: every product-bearing query the card/PDP/cart surfaces are
// built on must request custom.free_shipping, or attachCardShippingDisplay /
// attachCartShippingDisplay silently gate the claim closed everywhere
// (the AND-gate treats a missing metafield exactly like an explicit false).
describe('custom.free_shipping selected on every surface query', () => {
  it('SEARCH_PRODUCTS_BY_TAG (L2/industry/OCC card grids) requests it', () => {
    expect(SEARCH_PRODUCTS_BY_TAG).toMatch(/freeShipping:\s*metafield\(/)
    expect(SEARCH_PRODUCTS_BY_TAG).toContain('key: "free_shipping"')
  })

  it('GET_COLLECTION (L1 category card grids) requests it', () => {
    expect(GET_COLLECTION).toMatch(/freeShipping:\s*metafield\(/)
    expect(GET_COLLECTION).toContain('key: "free_shipping"')
  })

  it('the cart query (cart popup + cart page lines) requests it', () => {
    expect(GET_CART).toMatch(/freeShipping:\s*metafield\(/)
    expect(GET_CART).toContain('key: "free_shipping"')
  })

  // DEV-SHIP-03: SEARCH_PRODUCTS (the /search page, distinct from
  // SEARCH_PRODUCTS_BY_TAG which backs L2/industry/OCC pages) previously had
  // no metafield selections at all — /search results carried no
  // shippingDisplay whatsoever regardless of this task's fix.
  it('SEARCH_PRODUCTS (the /search page) requests it', () => {
    expect(SEARCH_PRODUCTS).toMatch(/freeShipping:\s*metafield\(/)
    expect(SEARCH_PRODUCTS).toContain('key: "free_shipping"')
  })
})

// DEV-SHIP-04: every product-bearing query the card/PDP/cart/search surfaces
// are built on must request custom.backorder, or the Backorder label
// silently never renders on that surface regardless of the merchant's own
// declaration. SEARCH_PRODUCTS in particular had NO backorder selection at
// all before this fix — a product with custom.backorder=true never showed
// the label in search results.
describe('custom.backorder selected on every surface query', () => {
  it('SEARCH_PRODUCTS_BY_TAG (L2/industry/OCC card grids) requests it', () => {
    expect(SEARCH_PRODUCTS_BY_TAG).toMatch(/backorder:\s*metafield\(/)
    expect(SEARCH_PRODUCTS_BY_TAG).toContain('key: "backorder"')
  })

  it('GET_COLLECTION (L1 category card grids) requests it', () => {
    expect(GET_COLLECTION).toMatch(/backorder:\s*metafield\(/)
    expect(GET_COLLECTION).toContain('key: "backorder"')
  })

  it('the cart query (cart popup + cart page lines) requests it', () => {
    expect(GET_CART).toMatch(/backorder:\s*metafield\(/)
    expect(GET_CART).toContain('key: "backorder"')
  })

  it('SEARCH_PRODUCTS (the /search page) requests it — the gap this fix closes', () => {
    expect(SEARCH_PRODUCTS).toMatch(/backorder:\s*metafield\(/)
    expect(SEARCH_PRODUCTS).toContain('key: "backorder"')
  })
})
