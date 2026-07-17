import { describe, it, expect } from 'vitest'
import { buildCategoryNav, getUnmappedRoadmapCategories, getAllowedHandles } from '../category-nav'
import { getAllowedL1Handles, getNavGroups } from '../category-tree'

// buildCategoryNav / getAllowedHandles now derive from the tag-backbone
// registry (lib/category-tree); the live collection list only gates out
// unpublished collections.

const ALL_LIVE = [...getAllowedL1Handles()].map((handle) => ({ handle }))

describe('buildCategoryNav', () => {
  it('renders every registry L1 when all collections are live, in registry order', () => {
    const nav = buildCategoryNav(ALL_LIVE)
    expect(nav.primary).toEqual(getNavGroups().primary)
    expect(nav.more).toEqual(getNavGroups().more)
  })

  it('uses registry display names with /category/<handle> hrefs (handle-only matching)', () => {
    const { primary } = buildCategoryNav(ALL_LIVE)
    const testing = primary.find((c) => c.displayName === 'Testing')
    expect(testing).toEqual({ displayName: 'Testing', href: '/category/testing-screening' })
  })

  it('splits entries into primary and more groups', () => {
    const { primary, more } = buildCategoryNav(ALL_LIVE)
    expect(primary.map((c) => c.displayName)).toContain('Gloves')
    expect(more.map((c) => c.displayName)).toContain('Home Care')
    expect(primary.map((c) => c.displayName)).not.toContain('Home Care')
  })

  it('omits registry categories whose collection is not live', () => {
    const withoutGloves = ALL_LIVE.filter((c) => c.handle !== 'gloves')
    const { primary } = buildCategoryNav(withoutGloves)
    expect(primary.map((c) => c.displayName)).not.toContain('Gloves')
  })

  it('never emits trocar-size or attribute collection entries', () => {
    const nav = buildCategoryNav([
      ...ALL_LIVE,
      { handle: 'disposable-3-2mm-3-5mm-trocars' },
      { handle: 'capes-gowns' },
    ])
    const names = [...nav.primary, ...nav.more].map((c) => c.href)
    expect(names).not.toContain('/category/disposable-3-2mm-3-5mm-trocars')
    expect(names).not.toContain('/category/capes-gowns')
  })
})

describe('getAllowedHandles', () => {
  it('equals the registry L1 handle set', () => {
    expect(getAllowedHandles()).toEqual(getAllowedL1Handles())
  })

  it('contains the tag-backbone 1:1 handles and drops superseded ones', () => {
    const allowed = getAllowedHandles()
    expect(allowed.has('gloves')).toBe(true)
    expect(allowed.has('surgery-procedure')).toBe(true)
    expect(allowed.has('room-furniture')).toBe(true)
    expect(allowed.has('face-masks')).toBe(true)
    expect(allowed.has('apparel')).toBe(true)
    // superseded collection-era handles no longer allowlisted as L1 routes
    expect(allowed.has('face-coverings')).toBe(false)
    expect(allowed.has('trocars-trocar-kits')).toBe(false)
    expect(allowed.has('exam-tables')).toBe(false)
    expect(allowed.has('pharmaceuticals')).toBe(false)
  })
})

// Legacy roadmap coverage helper — still used by scripts/audit-collections.ts.
describe('getUnmappedRoadmapCategories (legacy)', () => {
  it('lists roadmap categories with zero live matches', () => {
    const unmapped = getUnmappedRoadmapCategories([{ handle: 'gloves' }])
    const names = unmapped.map((c) => c.displayName)
    expect(names).toContain('Needles & Syringes')
    expect(names).not.toContain('Gloves')
  })
})
