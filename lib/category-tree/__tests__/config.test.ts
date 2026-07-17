import { describe, it, expect } from 'vitest'
import {
  L1_CATEGORIES,
  BOUNDARY_OVERRIDES,
  DUAL_CATEGORY_OVERRIDES,
  EXCLUDED_CATEGORY_TAGS,
  HIDDEN_TROCAR_HANDLES,
} from '../config'
import treeData from '../tree.data.json'

describe('L1_CATEGORIES', () => {
  // 25, not the ticket's 26: live reconciliation showed blood-collection is
  // a needles-syringes subcategory, and no 26th category: tag exists in the
  // backbone (see the note in config.ts and docs/category-tree-report.md).
  it('has exactly 25 entries with unique tags and unique handles', () => {
    expect(L1_CATEGORIES).toHaveLength(25)
    expect(new Set(L1_CATEGORIES.map((c) => c.tag)).size).toBe(25)
    expect(new Set(L1_CATEGORIES.map((c) => c.handle)).size).toBe(25)
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

describe('config ↔ snapshot reconciliation', () => {
  it('every configured L1 tag exists in the generated snapshot', () => {
    const discovered = new Set(treeData.l1.map((c: { tag: string }) => c.tag))
    for (const c of L1_CATEGORIES) expect(discovered.has(c.tag)).toBe(true)
  })
  it('snapshot has no unconfigured, unexcluded L1 tags', () => {
    const configured = new Set(L1_CATEGORIES.map((c) => c.tag))
    const strays = treeData.l1.filter(
      (c: { tag: string }) => !configured.has(c.tag) && !EXCLUDED_CATEGORY_TAGS.has(c.tag),
    )
    expect(strays).toEqual([])
  })
})

describe('DUAL_CATEGORY_OVERRIDES', () => {
  it('maps to valid L1 tags only', () => {
    const tags = new Set(L1_CATEGORIES.map((c) => c.tag))
    for (const target of Object.values(DUAL_CATEGORY_OVERRIDES)) expect(tags.has(target)).toBe(true)
  })
})
