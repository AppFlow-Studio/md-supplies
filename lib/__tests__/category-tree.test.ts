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

import { buildL2Tree } from '../category-tree'

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
})
