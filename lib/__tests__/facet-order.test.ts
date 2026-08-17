import { describe, it, expect } from 'vitest'
import {
  orderFacetValues,
  compareFacetValues,
  needsFacetSearch,
  facetValueMatches,
  FACET_SEARCH_THRESHOLD,
} from '@/lib/catalog/facet-order'
import { getAllowedFacets, getIndustryFacetRules, industryFilterRegistry } from '@/lib/filter-registry'
import type { CollectionFilter } from '@/lib/shopify/types'

function v(label: string, count: number) {
  return { id: label, label, count, input: JSON.stringify({ label }) }
}

function group(id: string, label: string, values: { label: string; count: number }[]): CollectionFilter {
  return { id, label, type: 'LIST', values: values.map((x) => v(x.label, x.count)) }
}

describe('facet value ordering (H-03: natural order, count no longer controls it)', () => {
  it('sorts by label natural order regardless of live count', () => {
    // Highest count ('A', 307) does NOT win top slot anymore — this is
    // exactly the pre-H-03 behavior the launch plan flagged as a defect.
    const ordered = orderFacetValues([v('A', 307), v('B', 3), v('C', 12)])
    expect(ordered.map((x) => x.label)).toEqual(['A', 'B', 'C'])
    // The count still travels with the value for display — it's just not
    // the sort key.
    expect(ordered.map((x) => x.count)).toEqual([307, 3, 12])
  })

  it('sorts alphabetically', () => {
    const ordered = orderFacetValues([v('Zinc Oxide Tape', 5), v('Alcohol Prep', 9), v('Mepore', 1)])
    expect(ordered.map((x) => x.label)).toEqual(['Alcohol Prep', 'Mepore', 'Zinc Oxide Tape'])
  })

  it('compares numeric labels numerically, not lexicographically', () => {
    const ordered = orderFacetValues([v('25 Gauge', 1), v('9 Gauge', 99), v('100 Gauge', 1)])
    expect(ordered.map((x) => x.label)).toEqual(['9 Gauge', '25 Gauge', '100 Gauge'])
  })

  // H-03 fixtures: numeric-prefixed medical sizes (Figure 10/11's Surgical
  // Sutures example) sort numerically, and numeric values as a block come
  // before ordinary alphabetic values in the same natural collation.
  it('sorts 0, 1-0, 2-0 … 10-0 numerically, and 20G/22G/23G numerically', () => {
    const sizes = orderFacetValues(
      ['4-0', '0', '10-0', '2-0', '1-0', '5-0', '3-0'].map((label) => v(label, 1)),
    )
    expect(sizes.map((x) => x.label)).toEqual(['0', '1-0', '2-0', '3-0', '4-0', '5-0', '10-0'])

    const gauges = orderFacetValues(['23G', '20G', '22G'].map((label) => v(label, 1)))
    expect(gauges.map((x) => x.label)).toEqual(['20G', '22G', '23G'])
  })

  it('sorts alphabetic values naturally, e.g. ABD Pads before Adhesive Bandages', () => {
    const ordered = orderFacetValues(
      ['Adhesive Bandages', 'ABD Pads'].map((label) => v(label, 1)),
    )
    expect(ordered.map((x) => x.label)).toEqual(['ABD Pads', 'Adhesive Bandages'])
  })

  it('normalizes stray whitespace in the label before comparing', () => {
    const ordered = orderFacetValues([v('  Mepore', 1), v('Alcohol Prep  ', 1)])
    expect(ordered.map((x) => x.label)).toEqual(['Alcohol Prep  ', '  Mepore'])
  })

  it('does not mutate its input', () => {
    const input = [v('B', 1), v('A', 9)]
    orderFacetValues(input)
    expect(input.map((x) => x.label)).toEqual(['B', 'A'])
  })

  it('is a total order, so server and client render identically', () => {
    // Collator-equal labels (differing only in case) must still order
    // deterministically or the server HTML and the client re-render
    // disagree (hydration mismatch).
    expect(compareFacetValues(v('Large', 1), v('large', 1))).not.toBe(0)
    const a = orderFacetValues([v('large', 1), v('Large', 1)])
    const b = orderFacetValues([v('Large', 1), v('large', 1)])
    expect(a.map((x) => x.label)).toEqual(b.map((x) => x.label))
  })
})

describe('facet-scoped search', () => {
  it('appears only above seven available values', () => {
    expect(FACET_SEARCH_THRESHOLD).toBe(7)
    expect(needsFacetSearch(7)).toBe(false)
    expect(needsFacetSearch(8)).toBe(true)
  })

  it('matches case-insensitively and tolerates diacritics', () => {
    expect(facetValueMatches('Nitrile Exam Gloves', 'NITRILE')).toBe(true)
    expect(facetValueMatches('Bandé Gauze', 'bande')).toBe(true)
    expect(facetValueMatches('Nitrile', 'latex')).toBe(false)
    expect(facetValueMatches('anything', '   ')).toBe(true)
  })
})

describe('getAllowedFacets ordering and relevance', () => {
  const CATEGORY = group('filter.p.m.custom.customer_filter_category', 'Category', [
    { label: 'Exam Gloves', count: 307 },
    { label: 'Surgical Gloves', count: 70 },
  ])
  const BRAND = group('filter.p.m.custom.brand_name', 'Brand Name', [{ label: 'Dukal', count: 9 }])
  const MATERIAL = group('filter.p.m.custom.material', 'Material', [{ label: 'Nitrile', count: 200 }])
  const PRICE: CollectionFilter = {
    id: 'filter.v.price',
    label: 'Price',
    type: 'PRICE_RANGE',
    values: [{ id: 'p', label: 'Price', count: 0, input: '{"price":{"min":0,"max":500}}' }],
  }

  it('returns facets in approved registry order regardless of Shopify order', () => {
    // Shopify hands them back brand-first; the approved gloves order is
    // Category … Material … Brand Name, Price.
    const ids = getAllowedFacets('gloves', [BRAND, PRICE, MATERIAL, CATEGORY]).map((f) => f.label)
    expect(ids).toEqual(['Category', 'Material', 'Brand Name', 'Price'])
  })

  it('orders values inside every group by live count descending', () => {
    const [category] = getAllowedFacets('gloves', [CATEGORY])
    expect(category.values.map((x) => `${x.label} — ${x.count}`)).toEqual([
      'Exam Gloves — 307',
      'Surgical Gloves — 70',
    ])
  })

  it('drops a populated-in-name-only group with no non-zero counts', () => {
    const empty = group('filter.p.m.custom.color', 'Color', [{ label: 'Blue', count: 0 }])
    expect(getAllowedFacets('gloves', [empty])).toEqual([])
  })

  it('keeps a PRICE_RANGE group even though its value carries no count', () => {
    expect(getAllowedFacets('gloves', [PRICE]).map((f) => f.id)).toEqual(['filter.v.price'])
  })

  it('resolves industry routes against the industry registry only', () => {
    // 'pharmacies' is an industry slug, not a collection handle. Without the
    // kind argument it would fall through to the bare default set.
    const ids = getAllowedFacets('pharmacies', [CATEGORY, MATERIAL], 'industry').map((f) => f.label)
    expect(ids).toEqual(['Category', 'Material'])
    expect(getAllowedFacets('pharmacies', [MATERIAL], 'category')).toEqual([])
  })
})

describe('the five approved industry routes', () => {
  it('registers exactly the five approved slugs', () => {
    expect(Object.keys(industryFilterRegistry).sort()).toEqual([
      'clinics-doctors-offices',
      'home-health',
      'hrt-clinics',
      'pharmacies',
      'urgent-care',
    ])
  })

  it('leads every industry with the Category facet', () => {
    for (const slug of Object.keys(industryFilterRegistry)) {
      const first = getIndustryFacetRules(slug)[0]
      expect(first.name, slug).toBe('metafield:custom.customer_filter_category')
    }
  })
})
