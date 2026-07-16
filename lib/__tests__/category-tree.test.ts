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
