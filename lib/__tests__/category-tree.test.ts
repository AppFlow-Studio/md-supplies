import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

import { describe, it, expect } from 'vitest'
import { parseProductTags, CATEGORY_TREE_L1 } from '../category-tree'

describe('fetchProductTagSummaries', () => {
  it('paginates through every page and parses tags into summaries', async () => {
    mockFetch
      .mockResolvedValueOnce({
        products: {
          nodes: [{ handle: 'a', tags: ['category:gloves'] }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        },
      })
      .mockResolvedValueOnce({
        products: {
          nodes: [{ handle: 'b', tags: ['category:dental', 'subcategory:suction'] }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })

    const { fetchProductTagSummaries } = await import('../category-tree')
    const summaries = await fetchProductTagSummaries()

    expect(summaries).toEqual([
      { handle: 'a', categories: ['gloves'], subcategories: [] },
      { handle: 'b', categories: ['dental'], subcategories: ['suction'] },
    ])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('stops instead of looping forever if the API returns a stale cursor', async () => {
    mockFetch.mockResolvedValue({
      products: {
        nodes: [{ handle: 'a', tags: [] }],
        pageInfo: { hasNextPage: true, endCursor: null },
      },
    })
    const { fetchProductTagSummaries } = await import('../category-tree')
    const summaries = await fetchProductTagSummaries()
    expect(summaries).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

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

import { buildL2Tree, isAttributeSubcategoryTag } from '../category-tree'

describe('isAttributeSubcategoryTag', () => {
  it('matches gauge-prefixed needle/lancet/catheter tags', () => {
    expect(isAttributeSubcategoryTag('25g-hypodermic-needles')).toBe(true)
    expect(isAttributeSubcategoryTag('21g-lancets')).toBe(true)
    expect(isAttributeSubcategoryTag('20g-iv-catheters')).toBe(true)
    expect(isAttributeSubcategoryTag('23g-dental-needles')).toBe(true)
  })

  it('matches suture-gauge tags, including the bare "0-sutures" case', () => {
    expect(isAttributeSubcategoryTag('4-0-sutures')).toBe(true)
    expect(isAttributeSubcategoryTag('3-0-sutures')).toBe(true)
    expect(isAttributeSubcategoryTag('0-sutures')).toBe(true)
  })

  it('matches cc-volume syringe tags', () => {
    expect(isAttributeSubcategoryTag('3cc-syringe')).toBe(true)
    expect(isAttributeSubcategoryTag('10cc-syringe')).toBe(true)
  })

  it('matches manual-wheelchairs width-suffixed tags', () => {
    expect(isAttributeSubcategoryTag('manual-wheelchairs-20')).toBe(true)
    expect(isAttributeSubcategoryTag('manual-wheelchairs-18')).toBe(true)
  })

  it('matches gal-volume sharps tags', () => {
    expect(isAttributeSubcategoryTag('2-gal-sharps')).toBe(true)
  })

  it('does not match real subcategory tags that happen to contain a digit', () => {
    expect(isAttributeSubcategoryTag('12-panel')).toBe(false)
    expect(isAttributeSubcategoryTag('exam-gloves')).toBe(false)
    expect(isAttributeSubcategoryTag('bariatric-wheelchairs')).toBe(false)
  })
})

describe('buildL2Tree', () => {
  it('nests a subcategory under its single co-occurring L1 category', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['gloves'], subcategories: ['exam-gloves'] },
      { handle: 'b', categories: ['gloves'], subcategories: ['exam-gloves'] },
    ])
    const examGloves = nodes.find((n) => n.tag === 'exam-gloves')!
    expect(examGloves.parentTag).toBe('gloves')
    expect(examGloves.crossLinkParentTag).toBeUndefined()
    expect(examGloves.productCount).toBe(2)
  })

  it('applies the 3 hardcoded boundary overrides regardless of raw dominance', () => {
    // exam-tables: live counts favor exam-room (16) over room-furniture (12) —
    // the override deliberately picks room-furniture as canonical anyway.
    const nodes = buildL2Tree([
      ...Array.from({ length: 16 }, (_, i) => ({
        handle: `er-${i}`, categories: ['exam-room'], subcategories: ['exam-tables'],
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        handle: `rf-${i}`, categories: ['room-furniture'], subcategories: ['exam-tables'],
      })),
    ])
    const examTables = nodes.find((n) => n.tag === 'exam-tables')!
    expect(examTables.parentTag).toBe('room-furniture')
    expect(examTables.crossLinkParentTag).toBe('exam-room')
    expect(examTables.productCount).toBe(28)
  })

  it('defaults un-overridden boundary subcategories to the dominant co-occurring parent', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['exam-room'], subcategories: ['foot-stools'] },
      { handle: 'b', categories: ['exam-room'], subcategories: ['foot-stools'] },
      { handle: 'c', categories: ['home-care'], subcategories: ['foot-stools'] },
    ])
    const footStools = nodes.find((n) => n.tag === 'foot-stools')!
    expect(footStools.parentTag).toBe('exam-room')
    expect(footStools.crossLinkParentTag).toBeUndefined()
  })

  it('excludes a subcategory whose only co-occurring category: tags are not approved L1s', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['non-medical'], subcategories: ['pet-pads'] },
    ])
    expect(nodes.find((n) => n.tag === 'pet-pads')).toBeUndefined()
  })

  it('excludes attribute-patterned subcategory tags from ever producing a node', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['needles-syringes'], subcategories: ['25g-hypodermic-needles'] },
    ])
    expect(nodes.find((n) => n.tag === '25g-hypodermic-needles')).toBeUndefined()
  })

  it('builds a node only for the real tag when a product carries both a real and an attribute-patterned subcategory tag', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['surgical-sutures'], subcategories: ['sutures', '4-0-sutures'] },
    ])
    expect(nodes.find((n) => n.tag === 'sutures')).toBeDefined()
    expect(nodes.find((n) => n.tag === '4-0-sutures')).toBeUndefined()
  })
})

import {
  getL1ByCollectionHandle,
  humanizeTag,
  buildSubcategoryTagQuery,
  getSubcategoriesForParent,
  getProductCategoryPath,
} from '../category-tree'

describe('getL1ByCollectionHandle', () => {
  it('finds an L1 whose collectionHandle differs from its tag', () => {
    const l1 = getL1ByCollectionHandle('testing-screening')
    expect(l1?.tag).toBe('testing')
  })

  it('finds an L1 whose collectionHandle matches its tag', () => {
    const l1 = getL1ByCollectionHandle('gloves')
    expect(l1?.tag).toBe('gloves')
  })

  it('returns undefined for an unknown handle', () => {
    expect(getL1ByCollectionHandle('not-a-real-handle')).toBeUndefined()
  })
})

describe('humanizeTag', () => {
  it('title-cases a kebab-case tag', () => {
    expect(humanizeTag('exam-gloves')).toBe('Exam Gloves')
  })

  it('handles a single-word tag', () => {
    expect(humanizeTag('sutures')).toBe('Sutures')
  })
})

describe('buildSubcategoryTagQuery', () => {
  it('combines category and subcategory tags into a Storefront query string', () => {
    expect(buildSubcategoryTagQuery('needles-syringes', 'iv-catheters')).toBe(
      'tag:"category:needles-syringes" AND tag:"subcategory:iv-catheters"',
    )
  })
})

describe('getSubcategoriesForParent', () => {
  it('returns only nodes whose parentTag matches, excluding a given tag', () => {
    const l2Nodes = [
      { tag: 'exam-gloves', parentTag: 'gloves', productCount: 10 },
      { tag: 'surgical-gloves', parentTag: 'gloves', productCount: 5 },
      { tag: 'wound-dressings', parentTag: 'wound-care', productCount: 8 },
    ]
    const result = getSubcategoriesForParent('gloves', l2Nodes)
    expect(result.map((n) => n.tag).sort()).toEqual(['exam-gloves', 'surgical-gloves'])
  })
})

describe('getProductCategoryPath', () => {
  const l2Nodes = [
    { tag: 'exam-tables', parentTag: 'room-furniture', crossLinkParentTag: 'exam-room', productCount: 28 },
    { tag: 'exam-gloves', parentTag: 'gloves', productCount: 10 },
  ]

  it('resolves category and subcategory from the product\'s own canonical tags', () => {
    const path = getProductCategoryPath(
      { handle: 'some-glove', categories: ['gloves'], subcategories: ['exam-gloves'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('gloves')
    expect(path?.subcategory?.tag).toBe('exam-gloves')
  })

  it('always resolves to the canonical parent for a boundary subcategory, never the cross-link parent', () => {
    const path = getProductCategoryPath(
      { handle: 'some-exam-table', categories: ['room-furniture'], subcategories: ['exam-tables'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('room-furniture')
    expect(path?.subcategory?.tag).toBe('exam-tables')
  })

  it('returns a null subcategory when the product carries no matching subcategory tag', () => {
    const path = getProductCategoryPath(
      { handle: 'some-glove', categories: ['gloves'], subcategories: [] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('gloves')
    expect(path?.subcategory).toBeNull()
  })

  it('returns null when the product has no resolvable category at all', () => {
    const path = getProductCategoryPath(
      { handle: 'untagged', categories: [], subcategories: [] },
      l2Nodes,
    )
    expect(path).toBeNull()
  })

  it('resolves to the canonical parent even when the product carries only the cross-link parent\'s raw category tag', () => {
    const path = getProductCategoryPath(
      { handle: 'some-exam-table-2', categories: ['exam-room'], subcategories: ['exam-tables'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('room-furniture')
    expect(path?.subcategory?.tag).toBe('exam-tables')
  })
})
