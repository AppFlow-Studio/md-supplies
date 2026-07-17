import { describe, it, expect } from 'vitest'
import {
  L1_CATEGORIES,
  BOUNDARY_OVERRIDES,
  DUAL_CATEGORY_OVERRIDES,
  EXCLUDED_CATEGORY_TAGS,
  HIDDEN_TROCAR_HANDLES,
} from '../config'

describe('L1_CATEGORIES', () => {
  it('has exactly 26 entries with unique tags and unique handles', () => {
    expect(L1_CATEGORIES).toHaveLength(26)
    expect(new Set(L1_CATEGORIES.map((c) => c.tag)).size).toBe(26)
    expect(new Set(L1_CATEGORIES.map((c) => c.handle)).size).toBe(26)
  })
  it('never includes excluded tags (occ, pharmaceuticals)', () => {
    for (const c of L1_CATEGORIES) expect(EXCLUDED_CATEGORY_TAGS.has(c.tag)).toBe(false)
  })
  it('never uses a hidden trocar collection as an L1 handle', () => {
    for (const c of L1_CATEGORIES) expect(HIDDEN_TROCAR_HANDLES.has(c.handle)).toBe(false)
  })
})

describe('BOUNDARY_OVERRIDES', () => {
  it('hardcodes exactly the 3 ticket splits', () => {
    expect(BOUNDARY_OVERRIDES).toEqual([
      { subcategoryTag: 'barrier-sleeves', parentTag: 'exam-room', crossLinkTag: 'dental' },
      { subcategoryTag: 'vital-sign-monitors', parentTag: 'testing', crossLinkTag: 'exam-room' },
      { subcategoryTag: 'exam-tables', parentTag: 'room-furniture', crossLinkTag: 'exam-room' },
    ])
  })
  it('every referenced parent/cross-link tag is a configured L1', () => {
    const tags = new Set(L1_CATEGORIES.map((c) => c.tag))
    for (const b of BOUNDARY_OVERRIDES) {
      expect(tags.has(b.parentTag)).toBe(true)
      expect(tags.has(b.crossLinkTag)).toBe(true)
    }
  })
})

describe('DUAL_CATEGORY_OVERRIDES', () => {
  it('maps to valid L1 tags only', () => {
    const tags = new Set(L1_CATEGORIES.map((c) => c.tag))
    for (const target of Object.values(DUAL_CATEGORY_OVERRIDES)) expect(tags.has(target)).toBe(true)
  })
})
