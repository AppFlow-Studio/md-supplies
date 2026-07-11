import { describe, it, expect } from 'vitest'
import {
  filterRegistry,
  getAllowedFacets,
  getFacetRules,
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
  facet('filter.p.m.custom.length', 'Length'),
  facet('filter.p.m.custom.volume', 'Volume'),
  facet('filter.p.m.custom.order_size', 'Order size'),
  facet('filter.p.m.custom.weight', 'Weight'),
  facet('filter.p.m.custom.size', 'Size'),
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
  it('OCC shows availability/price/vendor/type only — no glove/needle/testing facets', () => {
    const ids = getAllowedFacets('occ', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining(['filter.v.availability', 'filter.v.price', 'filter.p.vendor', 'filter.p.type']),
    )
    expect(ids).not.toContain('filter.p.m.custom.glove_size')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
    expect(ids).not.toContain('filter.p.m.custom.tests_for')
    expect(ids).not.toContain('filter.v.option.size')
  })

  it('Gloves shows glove size + material (+ size option), not needle facets', () => {
    const ids = getAllowedFacets('gloves', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toContain('filter.p.m.custom.glove_size')
    expect(ids).toContain('filter.p.m.custom.material')
    expect(ids).toContain('filter.v.option.size')
    expect(ids).toContain('filter.p.vendor')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
    expect(ids).not.toContain('filter.v.option.color')
  })

  it('Needles/Syringes shows gauge + length + volume + order size', () => {
    const ids = getAllowedFacets('needles-syringes', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'filter.p.m.custom.needle_gauge',
        'filter.p.m.custom.length',
        'filter.p.m.custom.volume',
        'filter.p.m.custom.order_size',
      ]),
    )
    expect(ids).not.toContain('filter.p.m.custom.glove_size')
  })

  it('Mobility shows weight + size', () => {
    const ids = getAllowedFacets('mobility', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toContain('filter.p.m.custom.weight')
    expect(ids).toContain('filter.p.m.custom.size')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
  })

  it('unlisted collections fall back to availability/price/vendor only', () => {
    const ids = getAllowedFacets('some-unlisted-collection', HOSTILE_FACETS).map((f) => f.id)
    expect(ids.sort()).toEqual(['filter.p.vendor', 'filter.v.availability', 'filter.v.price'])
  })
})

describe('isBlockedFacetId / stripBlockedFacets', () => {
  it('blocks the tag facet and its value ids', () => {
    expect(isBlockedFacetId('filter.p.tag')).toBe(true)
    expect(isBlockedFacetId('filter.p.tag.discontinued')).toBe(true)
    expect(isBlockedFacetId('filter.v.availability')).toBe(false)
  })

  it('stripBlockedFacets removes only raw-tag facets', () => {
    const out = stripBlockedFacets(HOSTILE_FACETS)
    expect(out.map((f) => f.id)).not.toContain('filter.p.tag')
    expect(out.map((f) => f.id)).toContain('filter.v.availability')
  })
})

describe('isAllowedFilterInput (URL ?filter= values)', () => {
  it('accepts known ProductFilter keys', () => {
    expect(isAllowedFilterInput('{"available":true}')).toBe(true)
    expect(isAllowedFilterInput('{"price":{"min":0,"max":50}}')).toBe(true)
    expect(isAllowedFilterInput('{"productVendor":"Medline"}')).toBe(true)
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
    expect(isAllowedFilterObject({ productVendor: 'Medline' })).toBe(true)
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
