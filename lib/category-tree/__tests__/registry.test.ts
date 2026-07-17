import { describe, it, expect } from 'vitest'
import {
  getL1Categories, getAllowedL1Handles, getNavGroups, getSubcategoriesOf,
  getCrossLinkedInto, getL1ByHandle, getL1ByTag, getBreadcrumbFromTags, subcategoryTitle,
} from '..'
import { L1_CATEGORIES, BOUNDARY_OVERRIDES } from '../config'

describe('registry', () => {
  it('exposes exactly the configured L1s with counts, in configured order', () => {
    const l1 = getL1Categories()
    expect(l1.map((c) => c.tag)).toEqual(L1_CATEGORIES.map((c) => c.tag))
    for (const c of l1) expect(c.productCount).toBeGreaterThan(0)
  })
  it('allowed handles = the L1 collection handles', () => {
    expect(getAllowedL1Handles()).toEqual(new Set(L1_CATEGORIES.map((c) => c.handle)))
  })
  it('nav groups split by navGroup with /category/<handle> hrefs', () => {
    const { primary, more } = getNavGroups()
    expect(primary.length + more.length).toBe(L1_CATEGORIES.length)
    const gloves = primary.find((e) => e.displayName === 'Gloves')
    expect(gloves?.href).toBe('/category/gloves')
  })
  it('subcategories exclude attribute-classified values and carry resolved parents', () => {
    for (const l1 of L1_CATEGORIES) {
      for (const sub of getSubcategoriesOf(l1.tag)) {
        expect(sub.kind).toBe('category')
        expect(sub.parentTag).toBe(l1.tag)
      }
    }
  })
  it('each boundary subcategory appears under exactly ONE parent, cross-linked from the other', () => {
    for (const b of BOUNDARY_OVERRIDES) {
      const owners = L1_CATEGORIES.filter((c) =>
        getSubcategoriesOf(c.tag).some((s) => s.tag === b.subcategoryTag))
      if (owners.length === 0) continue // sub not in live data — reported, not invented
      expect(owners.map((c) => c.tag)).toEqual([b.parentTag])
      expect(getCrossLinkedInto(b.crossLinkTag).some((s) => s.tag === b.subcategoryTag)).toBe(true)
    }
  })
  it('lookups by handle and tag agree; unknown returns null', () => {
    expect(getL1ByHandle('gloves')?.tag).toBe(getL1ByTag('gloves')?.tag)
    expect(getL1ByHandle('nope')).toBeNull()
  })
  it('breadcrumb follows the product OWN canonical path', () => {
    const gloves = getL1ByTag('gloves')!
    const crumb = getBreadcrumbFromTags(['category:gloves', 'subcategory:barrier-sleeves'], 'any')
    expect(crumb.l1).toEqual({ label: gloves.displayName, href: `/category/${gloves.handle}` })
  })
  it('breadcrumb L2 points under the canonical parent only', () => {
    // exam-tables is boundary-owned by room-furniture; a product tagged
    // category:exam-room + subcategory:exam-tables must NOT get an exam-room
    // exam-tables crumb (that would be the cross-linked branch).
    const crumb = getBreadcrumbFromTags(['category:exam-room', 'subcategory:exam-tables'], 'any')
    expect(crumb.l1?.href).toBe(`/category/${getL1ByTag('exam-room')!.handle}`)
    expect(crumb.l2).toBeNull()
    const owned = getBreadcrumbFromTags(['category:room-furniture', 'subcategory:exam-tables'], 'any')
    expect(owned.l2?.href).toBe(`/category/${getL1ByTag('room-furniture')!.handle}/exam-tables`)
  })
  it('breadcrumb is null for out-of-tree products', () => {
    expect(getBreadcrumbFromTags(['brand:foo'], 'any')).toEqual({ l1: null, l2: null })
  })
  it('beds nests under room-furniture, never home-care (ticket supersedes roadmap)', () => {
    const roomFurniture = getL1ByTag('room-furniture')
    if (!roomFurniture) throw new Error('room-furniture L1 missing')
    expect(getSubcategoriesOf('home-care').some((s) => s.tag === 'beds')).toBe(false)
    // 304 beds products are all category:room-furniture, so if a
    // subcategory:beds tag ever lands it must resolve there by dominance:
    const beds = getSubcategoriesOf(roomFurniture.tag).find((s) => s.tag === 'beds')
    if (beds) expect(beds.parentTag).toBe(roomFurniture.tag)
  })

  it('humanizes slugs for display only', () => {
    expect(subcategoryTitle('barrier-sleeves')).toBe('Barrier Sleeves')
  })
})
