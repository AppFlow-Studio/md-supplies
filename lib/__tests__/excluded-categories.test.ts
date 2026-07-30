import { describe, it, expect } from 'vitest'
import { EXCLUDED_COLLECTION_HANDLES } from '../excluded-categories'

describe('EXCLUDED_COLLECTION_HANDLES', () => {
  it('excludes §2.4 removed categories', () => {
    expect(EXCLUDED_COLLECTION_HANDLES.has('pharmaceuticals')).toBe(true)
    // beds un-excluded 2026-07-17: category-tree ticket places Beds under
    // Room Furniture, superseding the older §2.4 removal.
    expect(EXCLUDED_COLLECTION_HANDLES.has('beds')).toBe(false)
    expect(EXCLUDED_COLLECTION_HANDLES.has('bariatric-beds')).toBe(true)
    expect(EXCLUDED_COLLECTION_HANDLES.has('maternity-and-infant-care')).toBe(true)
    expect(EXCLUDED_COLLECTION_HANDLES.has('maternity-infant-care')).toBe(true)
  })

  it('excludes Office Supplies (hidden at launch)', () => {
    expect(EXCLUDED_COLLECTION_HANDLES.has('office-supplies')).toBe(true)
  })

  it('excludes the malformed duplicate "Categories" collection', () => {
    expect(
      EXCLUDED_COLLECTION_HANDLES.has(
        'categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays',
      ),
    ).toBe(true)
  })

  it('does not exclude approved categories', () => {
    expect(EXCLUDED_COLLECTION_HANDLES.has('gloves')).toBe(false)
    expect(EXCLUDED_COLLECTION_HANDLES.has('wound-care')).toBe(false)
  })
})
