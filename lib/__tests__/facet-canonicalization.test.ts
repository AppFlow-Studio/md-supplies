import { describe, it, expect } from 'vitest'
import {
  CANONICAL_VALUE_GROUPS,
  canonicalizeFacetValues,
  expandFilterInput,
  expandFilterInputs,
} from '@/lib/catalog/facet-canonicalization'
import type { CollectionFilter } from '@/lib/shopify/types'

// The reported defect, in test form: Home Care surfaces carried two options
// for one concept — `custom.customer_filter_category` holds both "Shower
// Commode" (6 products live on 2026-08-26) and "Shower Commodes" (4). A
// shopper looking for shower commodes had to notice and tick both.

const CATEGORY_FACET_ID = 'filter.p.m.custom.customer_filter_category'

function mfInput(key: string, value: string): string {
  return JSON.stringify({ productMetafield: { namespace: 'custom', key, value } })
}

function categoryFacet(values: { label: string; count: number }[]): CollectionFilter {
  return {
    id: CATEGORY_FACET_ID,
    label: 'Category',
    type: 'LIST',
    values: values.map((v) => ({
      id: `f.${v.label}`,
      label: v.label,
      count: v.count,
      input: mfInput('customer_filter_category', v.label),
    })),
  }
}

describe('canonicalizeFacetValues — one option per concept', () => {
  it('merges the two live Shower Commode spellings into a single option', () => {
    const merged = canonicalizeFacetValues(
      categoryFacet([
        { label: 'Bedside Commodes', count: 32 },
        { label: 'Shower Commode', count: 6 },
        { label: 'Shower Commodes', count: 4 },
      ]),
    )

    expect(merged.values.map((v) => v.label)).toEqual(['Bedside Commodes', 'Shower Commodes'])
    // Sum, not the larger half: hiding one spelling would drop 4 products off
    // the option, which is the thing this fix must NOT do.
    expect(merged.values.find((v) => v.label === 'Shower Commodes')!.count).toBe(10)
  })

  it('carries the canonical value in the surviving option input, so the URL stays readable', () => {
    const merged = canonicalizeFacetValues(
      categoryFacet([
        { label: 'Shower Commode', count: 6 },
        { label: 'Shower Commodes', count: 4 },
      ]),
    )
    expect(JSON.parse(merged.values[0].input)).toEqual({
      productMetafield: {
        namespace: 'custom',
        key: 'customer_filter_category',
        value: 'Shower Commodes',
      },
    })
  })

  it('keeps the merged option in the position of whichever spelling came first', () => {
    // Order is decided later by the facet-order collator; what matters here is
    // that merging never reshuffles unrelated values around it.
    const merged = canonicalizeFacetValues(
      categoryFacet([
        { label: 'Bath Mat', count: 1 },
        { label: 'Bed Pans', count: 9 },
        { label: 'Bath Mats', count: 1 },
      ]),
    )
    expect(merged.values.map((v) => v.label)).toEqual(['Bath Mats', 'Bed Pans'])
  })

  it('leaves values that merely look similar alone', () => {
    // "Bath Bench" and "Bath Stool" are different products; only values proved
    // equivalent product-by-product are listed in CANONICAL_VALUE_GROUPS.
    const merged = canonicalizeFacetValues(
      categoryFacet([
        { label: 'Bath Bench', count: 14 },
        { label: 'Bath Stool', count: 5 },
      ]),
    )
    expect(merged.values.map((v) => v.label)).toEqual(['Bath Bench', 'Bath Stool'])
  })

  it('does not touch facets outside the custom metafield namespace', () => {
    const price: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'p', label: 'Price', count: 0, input: '{"price":{"min":0,"max":100}}' }],
    }
    expect(canonicalizeFacetValues(price)).toBe(price)
  })

  it('returns the same object when a facet has nothing to merge', () => {
    const facet = categoryFacet([{ label: 'Bedside Commodes', count: 32 }])
    expect(canonicalizeFacetValues(facet)).toBe(facet)
  })
})

describe('expandFilterInput — the merged option queries every raw spelling', () => {
  it('expands a canonical value into all of its live raw values', () => {
    const expanded = expandFilterInput(mfInput('customer_filter_category', 'Shower Commodes'))
    expect(expanded).toEqual([
      { productMetafield: { namespace: 'custom', key: 'customer_filter_category', value: 'Shower Commode' } },
      { productMetafield: { namespace: 'custom', key: 'customer_filter_category', value: 'Shower Commodes' } },
    ])
  })

  it('passes an ungrouped value straight through', () => {
    const input = mfInput('customer_filter_category', 'Bedside Commodes')
    expect(expandFilterInput(input)).toEqual([JSON.parse(input)])
  })

  it('passes non-metafield filters through untouched', () => {
    const price = '{"price":{"min":0,"max":100}}'
    expect(expandFilterInput(price)).toEqual([{ price: { min: 0, max: 100 } }])
  })

  it('drops unparseable input rather than forwarding junk to the Storefront API', () => {
    expect(expandFilterInput('not json')).toEqual([])
  })

  it('preserves the variantMetafield wrapper when that is what was selected', () => {
    const input = JSON.stringify({
      variantMetafield: { namespace: 'custom', key: 'customer_filter_category', value: 'Shower Commodes' },
    })
    expect(expandFilterInput(input).every((f) => 'variantMetafield' in f)).toBe(true)
  })

  it('expands every active filter, in URL order', () => {
    const inputs = [
      mfInput('customer_filter_category', 'Shower Commodes'),
      mfInput('brand_name', 'Lumex'),
    ]
    const expanded = expandFilterInputs(inputs)
    expect(expanded).toHaveLength(3)
    expect(expanded[2]).toEqual({
      productMetafield: { namespace: 'custom', key: 'brand_name', value: 'Lumex' },
    })
  })
})

describe('CANONICAL_VALUE_GROUPS — registry integrity', () => {
  const groups = Object.entries(CANONICAL_VALUE_GROUPS)

  it('always lists the canonical value among its own variants', () => {
    // The canonical spelling must itself be a live raw value: it is what the
    // URL carries, and a value Shopify has never heard of would filter to zero
    // for anyone following an old link.
    for (const [key, defs] of groups) {
      for (const def of defs) {
        expect(def.variants, `${key}/${def.canonical}`).toContain(def.canonical)
      }
    }
  })

  it('never assigns one raw value to two groups', () => {
    for (const [key, defs] of groups) {
      const seen = new Set<string>()
      for (const def of defs) {
        for (const variant of def.variants) {
          expect(seen.has(variant), `${key}: ${variant} listed twice`).toBe(false)
          seen.add(variant)
        }
      }
    }
  })

  it('never defines a single-member group (nothing to merge)', () => {
    for (const [key, defs] of groups) {
      for (const def of defs) {
        expect(def.variants.length, `${key}/${def.canonical}`).toBeGreaterThan(1)
      }
    }
  })
})
