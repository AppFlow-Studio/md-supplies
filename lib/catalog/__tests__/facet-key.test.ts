import { describe, it, expect } from 'vitest'
import { resolveCategoryFacetKey, facetKeyNeedsTagTree } from '@/lib/catalog/facet-key'
import type { L2Node } from '@/lib/category-tree'

const nodes: L2Node[] = [
  { tag: 'sterilization-pouches', parentTag: 'sterilization', productCount: 40 },
  { tag: 'syringe-with-needle', parentTag: 'needles-syringes', productCount: 30 },
]

describe('resolveCategoryFacetKey', () => {
  it('keeps an L1 slug as its own key', () => {
    expect(resolveCategoryFacetKey('sterilization', nodes)).toBe('sterilization')
  })

  it('keeps a featured subcategory that has its own registry row', () => {
    expect(resolveCategoryFacetKey('trocars-trocar-kits', nodes)).toBe('trocars-trocar-kits')
  })

  it('gives a flat duplicate-subcategory collection its parent L1 key', () => {
    expect(resolveCategoryFacetKey('sterilization-pouches', nodes)).toBe('sterilization')
    expect(resolveCategoryFacetKey('syringe-with-needle', nodes)).toBe('needles-syringes')
  })

  it('gives a featured subcategory without a row its parent L1 key', () => {
    // Respiratory Testing sits under the Testing L1 (collection testing-screening).
    expect(resolveCategoryFacetKey('respiratory-testing', null)).toBe('testing-screening')
  })

  it('falls back to the slug (default rules) for an unknown collection or no tree', () => {
    expect(resolveCategoryFacetKey('some-random-collection', nodes)).toBe('some-random-collection')
    expect(resolveCategoryFacetKey('sterilization-pouches', null)).toBe('sterilization-pouches')
  })
})

describe('facetKeyNeedsTagTree', () => {
  it('only asks for the tag scan when the slug is neither registered, L1, nor featured', () => {
    expect(facetKeyNeedsTagTree('sterilization')).toBe(false)
    expect(facetKeyNeedsTagTree('respiratory-testing')).toBe(false)
    expect(facetKeyNeedsTagTree('sterilization-pouches')).toBe(true)
  })
})
