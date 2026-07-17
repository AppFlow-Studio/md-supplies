import { describe, it, expect } from 'vitest'
import {
  extractTagValues,
  canonicalCategoryTag,
  deriveTreeData,
  resolveParent,
  classifySubcategoryTag,
} from '../derive'

describe('extractTagValues', () => {
  it('extracts namespaced values, trimmed and lowercased', () => {
    expect(
      extractTagValues(['category:Exam-Room', ' subcategory:tourniquets ', 'brand:dynarex'], 'category'),
    ).toEqual(['exam-room'])
    expect(
      extractTagValues(['category:exam-room', 'subcategory:tourniquets', 'subcategory:tape'], 'subcategory'),
    ).toEqual(['tourniquets', 'tape'])
  })
  it('ignores non-matching and empty values', () => {
    expect(extractTagValues(['category:', 'categoryx:foo', 'Featured'], 'category')).toEqual([])
  })
})

describe('canonicalCategoryTag', () => {
  it('returns the single category tag', () => {
    expect(canonicalCategoryTag({ handle: 'p1', tags: ['category:dental'] }, {})).toBe('dental')
  })
  it('returns null when no category tag (out-of-tree)', () => {
    expect(canonicalCategoryTag({ handle: 'p1', tags: ['subcategory:x'] }, {})).toBeNull()
  })
  it('applies the dual-category override table by handle', () => {
    const p = { handle: 'dynaride-transport-wheelchair', tags: ['category:home-care', 'category:mobility'] }
    expect(canonicalCategoryTag(p, { 'dynaride-transport-wheelchair': 'mobility' })).toBe('mobility')
  })
  it('falls back to first tag alphabetically for un-overridden dual tags (deterministic)', () => {
    const p = { handle: 'mattress-cover', tags: ['category:housekeeping-janitorial', 'category:home-care'] }
    expect(canonicalCategoryTag(p, {})).toBe('home-care')
  })
})

describe('deriveTreeData', () => {
  const products = [
    { handle: 'a', tags: ['category:exam-room', 'subcategory:tourniquets'] },
    { handle: 'b', tags: ['category:exam-room', 'subcategory:tourniquets'] },
    { handle: 'c', tags: ['category:dental', 'subcategory:tourniquets'] },
    { handle: 'd', tags: ['category:dental'] },
    { handle: 'e', tags: ['brand:foo'] },
    { handle: 'f', tags: ['category:mobility', 'category:home-care'] },
  ]
  it('counts L1s by canonical tag, L2 co-occurrence by parent, out-of-tree, multi-category', () => {
    const data = deriveTreeData(products, { f: 'mobility' })
    expect(data.totalProducts).toBe(6)
    expect(data.outOfTreeCount).toBe(1)
    expect(data.l1).toContainEqual({ tag: 'exam-room', productCount: 2 })
    expect(data.l1).toContainEqual({ tag: 'dental', productCount: 2 })
    expect(data.l1).toContainEqual({ tag: 'mobility', productCount: 1 })
    expect(data.l2).toContainEqual({ tag: 'tourniquets', parents: { 'exam-room': 2, dental: 1 } })
    expect(data.multiCategoryProducts).toEqual([{ handle: 'f', categoryTags: ['home-care', 'mobility'] }])
  })
})

describe('resolveParent', () => {
  const boundary = [{ subcategoryTag: 'exam-tables', parentTag: 'room-furniture', crossLinkTag: 'exam-room' }]
  it('single parent wins as-is', () => {
    expect(resolveParent('tape', { 'wound-care': 5 }, boundary)).toEqual({ parentTag: 'wound-care' })
  })
  it('multi-parent resolves to dominant by count', () => {
    expect(resolveParent('gauze', { 'wound-care': 9, dental: 2 }, boundary)).toEqual({ parentTag: 'wound-care' })
  })
  it('boundary override beats dominance and carries the cross-link', () => {
    expect(resolveParent('exam-tables', { 'exam-room': 50, 'room-furniture': 3 }, boundary)).toEqual({
      parentTag: 'room-furniture',
      crossLinkTag: 'exam-room',
    })
  })
  it('returns null for empty parents', () => {
    expect(resolveParent('orphan', {}, boundary)).toBeNull()
  })
  it('ties break deterministically (alphabetical)', () => {
    expect(resolveParent('x', { b: 2, a: 2 }, boundary)).toEqual({ parentTag: 'a' })
  })
})

describe('classifySubcategoryTag', () => {
  it('flags measurement/size-patterned values as attribute', () => {
    for (const t of ['25g-hypodermic-needles', '5-panel-drug-tests', '10ml-syringes', '3-2mm-trocars', '2-quart-sharps', 'size-small', '4-0-sutures', '0-sutures', 'astm-level-2-face-masks', 'manual-wheelchairs-18']) {
      expect(classifySubcategoryTag(t, { attribute: [], category: [] })).toBe('attribute')
    }
  })
  it('leaves normal subcategories as category', () => {
    for (const t of ['tourniquets', 'exam-tables', 'walkers', 'beds']) {
      expect(classifySubcategoryTag(t, { attribute: [], category: [] })).toBe('category')
    }
  })
  it('force lists win over patterns', () => {
    expect(classifySubcategoryTag('tourniquets', { attribute: ['tourniquets'], category: [] })).toBe('attribute')
    expect(classifySubcategoryTag('25g-hypodermic-needles', { attribute: [], category: ['25g-hypodermic-needles'] })).toBe('category')
  })
})
