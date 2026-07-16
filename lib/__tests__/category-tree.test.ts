import { describe, it, expect } from 'vitest'
import { parseProductTags, CATEGORY_TREE_L1 } from '../category-tree'

describe('parseProductTags', () => {
  it('splits category: and subcategory: tags from the rest', () => {
    const result = parseProductTags([
      'brand:dynarex',
      'category:mobility',
      'industry:home-care',
      'subcategory:transport-chairs',
      'subcategory:manual-wheelchairs-18',
    ])
    expect(result.categories).toEqual(['mobility'])
    expect(result.subcategories).toEqual(['transport-chairs', 'manual-wheelchairs-18'])
  })

  it('returns empty arrays when no namespaced tags are present', () => {
    expect(parseProductTags(['brand:dukal', 'shipping:free'])).toEqual({
      categories: [],
      subcategories: [],
    })
  })

  it('preserves multiple category: tags in order (dual-tag products)', () => {
    const result = parseProductTags(['category:home-care', 'category:mobility'])
    expect(result.categories).toEqual(['home-care', 'mobility'])
  })
})

describe('CATEGORY_TREE_L1', () => {
  it('has exactly 25 confirmed-live approved L1 categories, each with a unique tag', () => {
    expect(CATEGORY_TREE_L1).toHaveLength(25)
    const tags = CATEGORY_TREE_L1.map((c) => c.tag)
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('includes exam-room and dental (sanity-check anchors from the live pull)', () => {
    const tags = CATEGORY_TREE_L1.map((c) => c.tag)
    expect(tags).toContain('exam-room')
    expect(tags).toContain('dental')
  })
})

import { resolveCanonicalCategory, buildL1Tiles, PRODUCT_CATEGORY_OVERRIDES } from '../category-tree'

describe('resolveCanonicalCategory', () => {
  it('returns the single category for a normally-tagged product', () => {
    expect(resolveCanonicalCategory({ handle: 'foo', categories: ['gloves'], subcategories: [] })).toBe('gloves')
  })

  it('returns null when a product has no category: tag at all', () => {
    expect(resolveCanonicalCategory({ handle: 'foo', categories: [], subcategories: [] })).toBeNull()
  })

  it('applies the hardcoded override for the 5 dual-tag exception products', () => {
    expect(
      resolveCanonicalCategory({
        handle: 'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs',
        categories: ['home-care', 'mobility'],
        subcategories: ['transport-chairs'],
      }),
    ).toBe('mobility')
  })

  it('falls back to the first category: tag for an un-overridden dual-tag product', () => {
    expect(
      resolveCanonicalCategory({ handle: 'some-other-handle', categories: ['home-care', 'mobility'], subcategories: [] }),
    ).toBe('home-care')
  })
})

describe('buildL1Tiles', () => {
  it('counts products per L1 tag, zero for tags with no matching products', () => {
    const tiles = buildL1Tiles([
      { handle: 'a', categories: ['gloves'], subcategories: [] },
      { handle: 'b', categories: ['gloves'], subcategories: [] },
      { handle: 'c', categories: ['dental'], subcategories: [] },
    ])
    const gloves = tiles.find((t) => t.tag === 'gloves')!
    const dental = tiles.find((t) => t.tag === 'dental')!
    const wound = tiles.find((t) => t.tag === 'wound-care')!
    expect(gloves.productCount).toBe(2)
    expect(dental.productCount).toBe(1)
    expect(wound.productCount).toBe(0)
    expect(tiles).toHaveLength(25)
  })

  it('ignores products whose category: tag is not in the L1 allowlist (noise tags)', () => {
    const tiles = buildL1Tiles([
      { handle: 'a', categories: ['non-medical'], subcategories: [] },
    ])
    expect(tiles.every((t) => t.productCount === 0)).toBe(true)
  })

  it('routes the override products into their canonical L1 count instead of their first raw tag', () => {
    const tiles = buildL1Tiles([
      {
        handle: 'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs',
        categories: ['home-care', 'mobility'],
        subcategories: ['transport-chairs'],
      },
    ])
    expect(tiles.find((t) => t.tag === 'mobility')!.productCount).toBe(1)
    expect(tiles.find((t) => t.tag === 'home-care')!.productCount).toBe(0)
  })
})
