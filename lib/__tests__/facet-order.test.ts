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

describe('facet value ordering', () => {
  it('sorts by exact count, highest first', () => {
    const ordered = orderFacetValues([v('A', 3), v('B', 307), v('C', 12)])
    expect(ordered.map((x) => x.label)).toEqual(['B', 'C', 'A'])
    // The count travels with the value — the label order is a consequence of
    // the live counts, never a hardcoded list.
    expect(ordered.map((x) => x.count)).toEqual([307, 12, 3])
  })

  it('breaks equal counts alphabetically', () => {
    const ordered = orderFacetValues([v('Zinc Oxide Tape', 5), v('Alcohol Prep', 5), v('Mepore', 5)])
    expect(ordered.map((x) => x.label)).toEqual(['Alcohol Prep', 'Mepore', 'Zinc Oxide Tape'])
  })

  it('compares equal-count numeric labels numerically, not lexicographically', () => {
    const ordered = orderFacetValues([v('25 Gauge', 4), v('9 Gauge', 4), v('100 Gauge', 4)])
    expect(ordered.map((x) => x.label)).toEqual(['9 Gauge', '25 Gauge', '100 Gauge'])
  })

  it('does not mutate its input', () => {
    const input = [v('A', 1), v('B', 9)]
    orderFacetValues(input)
    expect(input.map((x) => x.label)).toEqual(['A', 'B'])
  })

  it('is a total order, so server and client render identically', () => {
    // Same-count, collator-equal labels must still order deterministically or
    // the server HTML and the client re-render disagree (hydration mismatch).
    expect(compareFacetValues(v('Large', 2), v('large', 2))).not.toBe(0)
    const a = orderFacetValues([v('large', 2), v('Large', 2)])
    const b = orderFacetValues([v('Large', 2), v('large', 2)])
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
