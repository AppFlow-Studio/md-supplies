import { describe, it, expect } from 'vitest'
import {
  filterRegistry,
  industryFilterRegistry,
  getAllowedFacets,
  getFacetRules,
  getIndustryFacetRules,
  getFacetRulesFor,
  getSearchFacets,
  stripBlockedFacets,
  isBlockedFacetId,
  isAllowedFilterInput,
  isAllowedFilterObject,
  ALL_ALLOWED_RULES,
  DEFAULT_FACET_RULES,
  BLOCKED_TAG_PATTERNS,
} from '@/lib/filter-registry'
import type { CollectionFilter } from '@/lib/shopify/types'

function facet(id: string, label = id): CollectionFilter {
  return { id, label, type: 'LIST', values: [{ id: `${id}.v`, label, count: 1, input: '{}' }] }
}

// A hostile Storefront `filters` response: everything S&D could possibly
// expose, including the raw-tag facet with internal taxonomy/ops values.
const RAW_TAG_FACET: CollectionFilter = {
  id: 'filter.p.tag',
  label: 'Tag',
  type: 'LIST',
  values: [
    'brand:acme',
    'category:gloves',
    'subcategory:nitrile',
    'industry:dental',
    'partner:foo',
    'shipping:oversize',
    'compliance:fda-510k',
    'discontinued',
    'consolidation-duplicate',
  ].map((tag) => ({ id: `filter.p.tag.${tag}`, label: tag, count: 1, input: `{"tag":"${tag}"}` })),
}

const HOSTILE_FACETS: CollectionFilter[] = [
  RAW_TAG_FACET,
  facet('filter.v.availability', 'Availability'),
  facet('filter.v.price', 'Price'),
  facet('filter.p.vendor', 'Brand'),
  facet('filter.p.type', 'Product type'),
  facet('filter.p.category', 'Category'),
  facet('filter.v.option.size', 'Size'),
  facet('filter.v.option.color', 'Color'),
  facet('filter.p.m.custom.material', 'Material'),
  facet('filter.p.m.custom.glove_size', 'Glove size'),
  facet('filter.p.m.custom.needle_gauge', 'Needle gauge'),
  facet('filter.p.m.custom.needle_length', 'Length'),
  facet('filter.p.m.custom.volume', 'Volume'),
  facet('filter.p.m.custom.order_size', 'Order size'),
  facet('filter.p.m.custom.weight', 'Weight'),
  facet('filter.p.m.custom.size_length_', 'Size'),
  facet('filter.p.m.internal.ops_flag', 'Ops flag'),
  facet('filter.v.m.internal.ops_flag', 'Ops flag (variant)'),
]

const EVERY_COLLECTION = [...Object.keys(filterRegistry), 'some-unlisted-collection']

describe('filter registry guard: no blocked source can ever render', () => {
  for (const handle of EVERY_COLLECTION) {
    it(`${handle}: never renders the raw-tag facet or unapproved sources`, () => {
      const rendered = getAllowedFacets(handle, HOSTILE_FACETS)
      const ids = rendered.map((f) => f.id)

      expect(ids).not.toContain('filter.p.tag')
      expect(ids.some((id) => id.startsWith('filter.p.tag'))).toBe(false)
      // Unapproved metafields are default-denied everywhere.
      expect(ids.some((id) => id.includes('.m.internal.'))).toBe(false)
      // No blocked namespaced-tag value survives in any rendered facet.
      for (const f of rendered) {
        for (const v of f.values) {
          expect(BLOCKED_TAG_PATTERNS.some((p) => p.test(v.label))).toBe(false)
        }
      }
    })

    it(`${handle}: every rendered facet matches an allowed rule for that page`, () => {
      const rules = getFacetRules(handle)
      for (const f of getAllowedFacets(handle, HOSTILE_FACETS)) {
        expect(rules.some((r) => r.matches(f.id))).toBe(true)
      }
    })
  }

  it('registry entries only reference allowed sources (no tag rule can be added)', () => {
    const allRules = [...Object.values(filterRegistry).flat(), ...DEFAULT_FACET_RULES]
    for (const rule of allRules) {
      // A rule is legitimate if it is one of the shared allowed sources or a
      // variant-option rule; no rule may match the raw-tag facet id.
      const isKnown =
        ALL_ALLOWED_RULES.some((a) => a.name === rule.name) || rule.name.startsWith('option:')
      expect(isKnown, `unexpected rule "${rule.name}"`).toBe(true)
      expect(rule.matches('filter.p.tag')).toBe(false)
    }
  })
})

describe('page-specific facet sets', () => {
  it('OCC shows Category/Order Size/Brand/Price — no vendor, glove, needle or testing facets', () => {
    const ids = getAllowedFacets('occ', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining(['filter.p.m.custom.order_size', 'filter.v.price']),
    )
    expect(ids).not.toContain('filter.p.vendor')
    // Availability and product_type are not in the approved S&D table.
    expect(ids).not.toContain('filter.v.availability')
    expect(ids).not.toContain('filter.p.type')
    expect(ids).not.toContain('filter.p.m.custom.glove_size')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
    expect(ids).not.toContain('filter.p.m.custom.tests_for')
    expect(ids).not.toContain('filter.v.option.size')
  })

  it('Gloves shows glove size + material, not needle facets', () => {
    const ids = getAllowedFacets('gloves', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toContain('filter.p.m.custom.glove_size')
    expect(ids).toContain('filter.p.m.custom.material')
    expect(ids).not.toContain('filter.p.vendor')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
    // Variant options are no longer a public source: the approved table routes
    // every size dimension through the Size / Glove Size metafields, so a raw
    // variant option would be a second, differently-populated Size group.
    expect(ids).not.toContain('filter.v.option.size')
    expect(ids).not.toContain('filter.v.option.color')
  })

  it('Needles/Syringes shows gauge + length + size + order size', () => {
    const ids = getAllowedFacets('needles-syringes', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'filter.p.m.custom.needle_gauge',
        'filter.p.m.custom.needle_length',
        'filter.p.m.custom.size_length_',
        'filter.p.m.custom.order_size',
      ]),
    )
    expect(ids).not.toContain('filter.p.m.custom.glove_size')
  })

  it('Mobility shows size but not needle facets', () => {
    const ids = getAllowedFacets('mobility', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toContain('filter.p.m.custom.size_length_')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
    // `weight` is not in the approved S&D table; it fails closed.
    expect(ids).not.toContain('filter.p.m.custom.weight')
  })

  it('Dental shows needle gauge + length + size + order size', () => {
    const ids = getAllowedFacets('dental', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'filter.p.m.custom.needle_gauge',
        'filter.p.m.custom.needle_length',
        'filter.p.m.custom.size_length_',
        'filter.p.m.custom.order_size',
      ]),
    )
    expect(ids).not.toContain('filter.p.m.custom.glove_size')
  })

  it('IV Therapy shows needle gauge + length + size + order size', () => {
    const ids = getAllowedFacets('iv-therapy', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'filter.p.m.custom.needle_gauge',
        'filter.p.m.custom.needle_length',
        'filter.p.m.custom.size_length_',
        'filter.p.m.custom.order_size',
      ]),
    )
    expect(ids).not.toContain('filter.p.m.custom.glove_size')
  })

  it('unlisted collections fall back to availability/price only', () => {
    const ids = getAllowedFacets('some-unlisted-collection', HOSTILE_FACETS).map((f) => f.id)
    expect(ids.sort()).toEqual(['filter.v.availability', 'filter.v.price'])
  })
})

// Before industryFilterRegistry existed, every industry page (facetKey =
// Industry.collectionHandle) fell through to DEFAULT_FACET_RULES because none
// of these five handles were registered anywhere — the same "filters don't
// cover the product range" gap the category audit fixed, just never extended
// past /category. Industries resolve through their own registry
// (getIndustryFacetRules / getFacetRulesFor('industry', …)) rather than
// filterRegistry, so a same-named category entry can never leak in.
describe('industry-specific facet sets', () => {
  const INDUSTRY_HANDLES = [
    'urgent-care',
    'hrt-clinics',
    'home-health',
    'clinics-doctors-offices',
    'pharmacies',
  ]

  it('every industry page has an explicit registry entry, not the bare default', () => {
    for (const handle of INDUSTRY_HANDLES) {
      expect(handle in industryFilterRegistry, handle).toBe(true)
      expect(getIndustryFacetRules(handle).length, handle).toBeGreaterThan(DEFAULT_FACET_RULES.length)
      expect(getFacetRulesFor('industry', handle).length, handle).toBeGreaterThan(DEFAULT_FACET_RULES.length)
    }
  })

  it('industry pages show category/order-size/brand/price, never vendor', () => {
    for (const handle of INDUSTRY_HANDLES) {
      const ids = getAllowedFacets(handle, HOSTILE_FACETS, 'industry').map((f) => f.id)
      expect(ids, handle).toEqual(
        expect.arrayContaining(['filter.p.m.custom.order_size', 'filter.v.price']),
      )
      expect(ids, handle).not.toContain('filter.p.vendor')
    }
  })

  it('industry routes resolve independently of any same-named category entry', () => {
    for (const handle of INDUSTRY_HANDLES) {
      expect(handle in filterRegistry, handle).toBe(false)
    }
  })

  it('registry entries only reference allowed sources', () => {
    for (const [handle, rules] of Object.entries(industryFilterRegistry)) {
      for (const rule of rules) {
        expect(ALL_ALLOWED_RULES.some((a) => a.name === rule.name), `${handle}:${rule.name}`).toBe(true)
      }
    }
  })
})

describe('isBlockedFacetId / stripBlockedFacets', () => {
  it('blocks the tag facet, its value ids, and the fulfilling-vendor facet', () => {
    expect(isBlockedFacetId('filter.p.tag')).toBe(true)
    expect(isBlockedFacetId('filter.p.tag.discontinued')).toBe(true)
    // vendor = internal fulfiller; removed from the live store's S&D on 2026-07-29,
    // and hard-denied here so no registry entry can ever reintroduce it
    expect(isBlockedFacetId('filter.p.vendor')).toBe(true)
    expect(isBlockedFacetId('filter.v.availability')).toBe(false)
  })

  it('stripBlockedFacets removes only raw-tag facets', () => {
    const out = stripBlockedFacets(HOSTILE_FACETS)
    expect(out.map((f) => f.id)).not.toContain('filter.p.tag')
    expect(out.map((f) => f.id)).toContain('filter.v.availability')
  })
})

describe('getSearchFacets (NF3 — search-wide registry allowlist)', () => {
  it('allows availability/price/productType and approved metafields, never vendor', () => {
    const facets = [
      facet('filter.v.availability'),
      facet('filter.v.price'),
      facet('filter.p.type'),
      facet('filter.p.m.custom.material'),
    ]
    expect(getSearchFacets(facets).map((f) => f.id)).toEqual(facets.map((f) => f.id))
    expect(getSearchFacets([facet('filter.p.vendor', 'Brand')])).toEqual([])
  })

  it('drops raw tag facets and any facet not on the search allowlist', () => {
    const facets = [
      facet('filter.p.tag'),
      facet('filter.p.category'),
      facet('filter.v.option.color'),
    ]
    expect(getSearchFacets(facets)).toEqual([])
  })
})

describe('isAllowedFilterInput (URL ?filter= values)', () => {
  it('accepts known ProductFilter keys', () => {
    expect(isAllowedFilterInput('{"available":true}')).toBe(true)
    expect(isAllowedFilterInput('{"price":{"min":0,"max":50}}')).toBe(true)
    expect(isAllowedFilterInput('{"productType":"Exam Glove"}')).toBe(true)
    expect(isAllowedFilterInput('{"variantOption":{"name":"size","value":"M"}}')).toBe(true)
    expect(
      isAllowedFilterInput('{"productMetafield":{"namespace":"custom","key":"material","value":"nitrile"}}'),
    ).toBe(true)
  })

  it('rejects tag filters, unknown keys, and malformed input', () => {
    expect(isAllowedFilterInput('{"tag":"discontinued"}')).toBe(false)
    expect(isAllowedFilterInput('{"tag":"compliance:fda-510k"}')).toBe(false)
    expect(isAllowedFilterInput('{"available":true,"tag":"discontinued"}')).toBe(false)
    expect(isAllowedFilterInput('{"somethingElse":1}')).toBe(false)
    expect(isAllowedFilterInput('not json')).toBe(false)
    expect(isAllowedFilterInput('null')).toBe(false)
    expect(isAllowedFilterInput('[]')).toBe(false)
    expect(isAllowedFilterInput('{}')).toBe(false)
  })
})

describe('isAllowedFilterObject (server-action-supplied filter objects)', () => {
  it('accepts already-parsed objects with known ProductFilter keys', () => {
    expect(isAllowedFilterObject({ available: true })).toBe(true)
    expect(isAllowedFilterObject({ price: { min: 0, max: 50 } })).toBe(true)
    expect(isAllowedFilterObject({ productType: 'Exam Glove' })).toBe(true)
  })

  it('rejects raw-tag objects and unknown keys, mirroring isAllowedFilterInput', () => {
    expect(isAllowedFilterObject({ tag: 'consolidation-duplicate' })).toBe(false)
    expect(isAllowedFilterObject({ tag: 'compliance:fda-510k' })).toBe(false)
    expect(isAllowedFilterObject({ somethingElse: 1 })).toBe(false)
    expect(isAllowedFilterObject(null)).toBe(false)
    expect(isAllowedFilterObject([])).toBe(false)
    expect(isAllowedFilterObject({})).toBe(false)
    expect(isAllowedFilterObject('not an object')).toBe(false)
  })
})

describe('filter VALUE validation (NF17) — allowed keys with hostile values are rejected', () => {
  it('rejects malformed price objects', () => {
    expect(isAllowedFilterInput('{"price":"cheap"}')).toBe(false)
    expect(isAllowedFilterInput('{"price":{"min":-5,"max":10}}')).toBe(false)
    expect(isAllowedFilterInput('{"price":{"min":50,"max":10}}')).toBe(false)
    expect(isAllowedFilterInput('{"price":{"min":null}}')).toBe(false)
    expect(isAllowedFilterInput('{"price":{"max":"1e999"}}')).toBe(false)
    expect(isAllowedFilterInput('{"price":{}}')).toBe(false)
    expect(isAllowedFilterInput('{"price":{"max":10,"extra":1}}')).toBe(false)
  })

  it('rejects non-string / oversized / empty string values', () => {
    expect(isAllowedFilterInput('{"productType":123}')).toBe(false)
    expect(isAllowedFilterInput('{"productType":""}')).toBe(false)
    expect(isAllowedFilterInput(`{"productType":"${'x'.repeat(200)}"}`)).toBe(false)
    expect(isAllowedFilterInput('{"available":"yes"}')).toBe(false)
  })

  it('rejects metafield/variantOption objects with wrong shapes', () => {
    expect(isAllowedFilterInput('{"productMetafield":{"namespace":"custom"}}')).toBe(false)
    expect(isAllowedFilterInput('{"productMetafield":{"namespace":"custom","key":"material","value":"a","extra":1}}')).toBe(false)
    expect(isAllowedFilterInput('{"variantOption":{"name":"size"}}')).toBe(false)
    expect(isAllowedFilterInput('{"variantOption":"size=M"}')).toBe(false)
    expect(isAllowedFilterInput('{"category":{"id":""}}')).toBe(false)
    expect(isAllowedFilterInput('{"category":"gloves"}')).toBe(false)
  })

  it('BLOCKED_TAG_PATTERNS are enforced on string values under allowed keys', () => {
    expect(isAllowedFilterInput('{"productType":"compliance:fda-510k"}')).toBe(false)
    expect(isAllowedFilterInput('{"variantOption":{"name":"size","value":"partner:medplus"}}')).toBe(false)
    expect(isAllowedFilterInput('{"productMetafield":{"namespace":"custom","key":"material","value":"discontinued"}}')).toBe(false)
    // Normal values still pass
    expect(isAllowedFilterInput('{"productType":"Exam Gloves"}')).toBe(true)
  })

  // Regression: denying the `filter.p.vendor` FACET only stops the rail from
  // RENDERING a Vendor group. The URL/server-action input path is a separate
  // gate, and it used to accept `productVendor` — so a crafted or crawled
  // `?filter={"productVendor":"MedPlus"}` still filtered the catalogue by
  // internal fulfilling vendor and minted an indexable faceted URL keyed on a
  // fulfiller name. Both gates must stay closed.
  it('rejects productVendor on the INPUT path, not just the facet path', () => {
    expect(isAllowedFilterInput('{"productVendor":"MedPlus"}')).toBe(false)
    expect(isAllowedFilterInput('{"productVendor":"Medline"}')).toBe(false)
    expect(isAllowedFilterObject({ productVendor: 'MedPlus' })).toBe(false)
    // ...and it cannot ride along beside an otherwise-valid key.
    expect(isAllowedFilterInput('{"available":true,"productVendor":"MedPlus"}')).toBe(false)
  })

  it('still accepts valid category-id objects', () => {
    expect(isAllowedFilterInput('{"category":{"id":"gid://shopify/TaxonomyCategory/hb-1"}}')).toBe(true)
  })
})

// ── Coverage audit outcomes (IZ-FILTER-01) ─────────────────────────────────
// The client's complaint was that filters "don't cover the product range". The
// cause was structural: only 10 collections had registry entries and the other
// 20 fell through to Availability/Price/Vendor. These lock in the fix.

describe('category coverage: every audited category has real facets', () => {
  // Categories from the coverage audit of 7,385 active products, as COLLECTION
  // HANDLES. The audit groups by the `category:` tag, and most tag values match
  // a collection handle, but not all: `testing` is the tag while
  // testing-screening is the collection, and non-medical / non-healthcare are
  // tag values held out of the tree with no collection to key an entry on.
  const AUDITED = [
    'exam-room', 'wound-care', 'mobility', 'needles-syringes', 'seating',
    'gloves', 'home-care', 'respiratory', 'emergency-supplies', 'trocars-trocar-kits',
    'patient-therapy-rehab', 'bariatric', 'hygiene', 'surgical-sutures',
    'testing-screening', 'capes-gowns', 'dental', 'incontinence', 'pharmacy-products',
    'housekeeping-janitorial', 'iv-therapy', 'urology-ostomy', 'sterilization',
    'face-coverings', 'disinfectants', 'office-supplies', 'occ',
  ]

  it('every audited category has an explicit registry entry', () => {
    const missing = AUDITED.filter((h) => !(h in filterRegistry))
    expect(missing).toEqual([])
  })

  it('no audited category is left on the bare default set', () => {
    for (const handle of AUDITED) {
      expect(getFacetRules(handle).length, handle).toBeGreaterThan(DEFAULT_FACET_RULES.length)
    }
  })

  it('an unknown collection still falls back to the safe default', () => {
    expect(getFacetRules('not-a-real-collection')).toBe(DEFAULT_FACET_RULES)
  })
})

describe('the category facet the client asked for', () => {
  const CATEGORY_FACET = facet('filter.p.m.custom.customer_filter_category', 'Categories')

  it('renders on OCC, which is where the complaint came from', () => {
    expect(getAllowedFacets('occ', [CATEGORY_FACET])).toHaveLength(1)
  })

  it('renders on every audited category, not just OCC', () => {
    for (const handle of ['exam-room', 'gloves', 'wound-care', 'testing-screening', 'face-coverings']) {
      expect(getAllowedFacets(handle, [CATEGORY_FACET]), handle).toHaveLength(1)
    }
  })
})

describe('brand and fulfilling vendor stay separate (IZ-VENDOR-01)', () => {
  // Shopify's `vendor` holds the FULFILLING vendor and disagrees with brand on
  // 51% of active products: the DUK 7609 bandage is branded Dukal but fulfilled
  // by MedPlus. The public brand facet must therefore read custom.brand_name.
  it('brand_name is the registered brand facet', () => {
    const brand = facet('filter.p.m.custom.brand_name', 'Brand')
    expect(getAllowedFacets('exam-room', [brand])).toHaveLength(1)
  })

  it('custom.type is now THE registered Type source (2026-08-12 decision)', () => {
    // The deliberate registry decision this test previously deferred. Two
    // things had to be true and now both are:
    //  1. The client's approved Search & Discovery table names "Type | Product
    //     metafield: Type" as the public Type source.
    //  2. The live data no longer inverts Type and Material. Probed 2026-08-12
    //     (audit/live/facets.json): gloves returns Type with 8 values over 442
    //     products AND a separate Material facet with 6 values over 317, so the
    //     collision the old policy guarded against is gone.
    const type = facet('filter.p.m.custom.type', 'Type')
    for (const handle of ['gloves', 'surgical-sutures', 'exam-room']) {
      expect(getAllowedFacets(handle, [type]), handle).toHaveLength(1)
    }
  })

  it('product_type is no longer a public facet on category routes', () => {
    // `filter.p.type` is absent from the approved S&D table and the live store
    // does not publish it on any of the 25 category collections. Type comes
    // from the metafield now, so this source must not reappear as a second,
    // differently-populated "Type" group.
    const pt = facet('filter.p.type', 'Product type')
    for (const handle of ['gloves', 'occ', 'exam-room']) {
      expect(getAllowedFacets(handle, [pt]), handle).toEqual([])
    }
  })

  it('availability is not published as a public facet', () => {
    // Spec: "Do not introduce Availability or another filter unless it is
    // already approved". It is not in the approved table and the live store
    // returns it on none of the 25 collections.
    const av = facet('filter.v.availability', 'Availability')
    for (const handle of ['gloves', 'occ', 'exam-room', 'testing-screening']) {
      expect(getAllowedFacets(handle, [av]), handle).toEqual([])
    }
  })
})

describe('registered-but-not-live facets fail closed', () => {
  it('a registered facet the Storefront API does not return simply does not render', () => {
    // customer_filter_category has storefront_access NONE in production today,
    // so Shopify never returns it. Registering it must not fabricate a facet.
    expect(getAllowedFacets('occ', [])).toEqual([])
  })

  it('registry entries never reference a source outside the allowlist', () => {
    for (const [handle, rules] of Object.entries(filterRegistry)) {
      for (const rule of rules) {
        expect(ALL_ALLOWED_RULES.some((a) => a.name === rule.name), `${handle}:${rule.name}`).toBe(true)
      }
    }
  })
})
