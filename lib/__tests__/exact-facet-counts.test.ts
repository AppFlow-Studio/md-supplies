import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/log-error', () => ({ logServerError: vi.fn() }))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { applyExactFacetCounts, MAX_EXACT_COUNT_VALUES } from '@/lib/catalog/exact-facet-counts'
import type { CollectionFilter } from '@/lib/shopify/types'

const mockFetch = vi.mocked(storefrontFetch)

const SCOPE = 'tag:"category:home-care" AND tag:"subcategory:shower-commodes"'

function mfInput(key: string, value: string): string {
  return JSON.stringify({ productMetafield: { namespace: 'custom', key, value } })
}

function listFacet(id: string, label: string, values: [string, number][]): CollectionFilter {
  const key = id.split('.').pop()!
  return {
    id,
    label,
    type: 'LIST',
    values: values.map(([v, count]) => ({ id: `f.${v}`, label: v, count, input: mfInput(key, v) })),
  }
}

/** Answers the aliased batch with a count per alias, derived from `by`. */
function respondWith(by: (filters: Record<string, unknown>[]) => number) {
  mockFetch.mockImplementation(async (_query, variables) => {
    const vars = variables as Record<string, unknown>
    const out: Record<string, { totalCount: number }> = {}
    for (const [name, value] of Object.entries(vars)) {
      if (name === 'query') continue
      out[`c${name.slice(1)}`] = { totalCount: by(value as Record<string, unknown>[]) }
    }
    return out as never
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('applyExactFacetCounts', () => {
  it('replaces Shopify’s approximate counts with the measured ones', async () => {
    // The live defect: Query.search reported 2 for both Shower Commode
    // spellings on Home Care -> Shower Commodes, where the true figures were
    // 5 and 4. After canonicalization the merged option matches 9.
    const facets = [listFacet('filter.p.m.custom.customer_filter_category', 'Category', [
      ['Shower Chairs', 1],
      ['Shower Commodes', 2],
    ])]

    respondWith((filters) => {
      const values = filters.map((f) => (f.productMetafield as { value: string }).value)
      return values.includes('Shower Commodes') ? 9 : 1
    })

    const result = await applyExactFacetCounts(SCOPE, facets, [], ['shopify'])
    expect(result[0].values.map((v) => [v.label, v.count])).toEqual([
      ['Shower Chairs', 1],
      ['Shower Commodes', 9],
    ])
  })

  it('asks for the value under the page’s own scope, so the count is what clicking returns', async () => {
    const facets = [listFacet('filter.p.m.custom.brand_name', 'Brand Name', [['Lumex', 3]])]
    respondWith(() => 3)

    await applyExactFacetCounts(SCOPE, facets, [], ['shopify'])

    const [, variables] = mockFetch.mock.calls[0]
    expect((variables as Record<string, unknown>).query).toBe(SCOPE)
    expect((variables as Record<string, unknown>).f0).toEqual([
      { productMetafield: { namespace: 'custom', key: 'brand_name', value: 'Lumex' } },
    ])
  })

  it('expands a canonical value into every raw spelling it stands for', async () => {
    const facets = [listFacet('filter.p.m.custom.customer_filter_category', 'Category', [
      ['Shower Commodes', 2],
    ])]
    respondWith(() => 9)

    await applyExactFacetCounts(SCOPE, facets, [], ['shopify'])

    const [, variables] = mockFetch.mock.calls[0]
    expect((variables as Record<string, unknown>).f0).toEqual([
      { productMetafield: { namespace: 'custom', key: 'customer_filter_category', value: 'Shower Commode' } },
      { productMetafield: { namespace: 'custom', key: 'customer_filter_category', value: 'Shower Commodes' } },
    ])
  })

  it('narrows a group’s counts by selections in OTHER groups', async () => {
    const facets = [
      listFacet('filter.p.m.custom.customer_filter_category', 'Category', [['Shower Commodes', 2]]),
      listFacet('filter.p.m.custom.brand_name', 'Brand Name', [['Lumex', 2]]),
    ]
    const active = [mfInput('brand_name', 'Lumex')]
    respondWith(() => 1)

    await applyExactFacetCounts(SCOPE, facets, active, ['shopify'])

    const vars = mockFetch.mock.calls[0][1] as Record<string, unknown>
    // Category value carries the active Brand selection...
    expect(vars.f0).toEqual([
      { productMetafield: { namespace: 'custom', key: 'brand_name', value: 'Lumex' } },
      { productMetafield: { namespace: 'custom', key: 'customer_filter_category', value: 'Shower Commode' } },
      { productMetafield: { namespace: 'custom', key: 'customer_filter_category', value: 'Shower Commodes' } },
    ])
    // ...but Brand's own value does not carry itself, or every brand would
    // report the intersection with Lumex instead of its own reach.
    expect(vars.f1).toEqual([
      { productMetafield: { namespace: 'custom', key: 'brand_name', value: 'Lumex' } },
    ])
  })

  it('leaves PRICE_RANGE groups alone — their value carries bounds, not a count', async () => {
    const price: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'p', label: 'Price', count: 0, input: '{"price":{"min":0,"max":419}}' }],
    }
    const result = await applyExactFacetCounts(SCOPE, [price], [], ['shopify'])
    expect(result[0]).toBe(price)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('batches every value into one request rather than one request per value', async () => {
    const facets = [listFacet('filter.p.m.custom.brand_name', 'Brand Name',
      Array.from({ length: 12 }, (_, i) => [`Brand ${i}`, 1] as [string, number]))]
    respondWith(() => 4)

    await applyExactFacetCounts(SCOPE, facets, [], ['shopify'])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('keeps Shopify’s counts rather than fanning out on a pathologically wide rail', async () => {
    const values = Array.from(
      { length: MAX_EXACT_COUNT_VALUES + 1 },
      (_, i) => [`Value ${i}`, 1] as [string, number],
    )
    const facets = [listFacet('filter.p.m.custom.customer_filter_category', 'Category', values)]

    const result = await applyExactFacetCounts(SCOPE, facets, [], ['shopify'])
    expect(result).toBe(facets)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('degrades to Shopify’s counts when the batch fails, rather than taking the page down', async () => {
    const facets = [listFacet('filter.p.m.custom.brand_name', 'Brand Name', [['Lumex', 3]])]
    mockFetch.mockRejectedValue(new Error('Storefront API HTTP 502'))

    const result = await applyExactFacetCounts(SCOPE, facets, [], ['shopify'])
    expect(result[0].values[0].count).toBe(3)
  })

  it('keeps a value’s existing count when its alias comes back null', async () => {
    const facets = [listFacet('filter.p.m.custom.brand_name', 'Brand Name', [['Lumex', 3]])]
    mockFetch.mockResolvedValue({ c0: null } as never)

    const result = await applyExactFacetCounts(SCOPE, facets, [], ['shopify'])
    expect(result[0].values[0].count).toBe(3)
  })
})
