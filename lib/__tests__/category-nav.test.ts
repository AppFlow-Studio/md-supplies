import { describe, it, expect } from 'vitest'
import { buildCategoryNav, getUnmappedRoadmapCategories } from '../category-nav'

const LIVE_HANDLES = [
  'gloves', 'wound-care', 'testing-screening', 'exam-room', 'mobility',
  'patient-therapy-rehab', 'hygiene', 'home-care', 'emergency-supplies',
  'incontinence', 'dental', 'housekeeping-janitorial', 'bariatric',
  'face-coverings', 'seating', 'capes-gowns', 'caps-headwear',
  'coats-jackets', 'footwear', 'medical-scrubs', 'pants-shirts',
  'undergarments-wraps', 'trocars-trocar-kits', 'disposable-3-2mm-3-5mm-trocars',
].map((handle) => ({ handle }))

describe('buildCategoryNav', () => {
  it('renders mapped categories with normalized display names', () => {
    const { primary } = buildCategoryNav(LIVE_HANDLES)
    const testing = primary.find((c) => c.displayName === 'Testing')
    expect(testing).toEqual({ displayName: 'Testing', href: '/category/testing-screening' })
  })

  it('renders Face Masks normalized from the face-coverings handle', () => {
    const { more } = buildCategoryNav(LIVE_HANDLES)
    expect(more.find((c) => c.displayName === 'Face Masks')).toEqual({
      displayName: 'Face Masks',
      href: '/category/face-coverings',
    })
  })

  it('splits entries into primary and more groups', () => {
    const { primary, more } = buildCategoryNav(LIVE_HANDLES)
    expect(primary.map((c) => c.displayName)).toContain('Gloves')
    expect(more.map((c) => c.displayName)).toContain('Home Care')
    expect(primary.map((c) => c.displayName)).not.toContain('Home Care')
  })

  it('synthesizes a parent entry linking to the first present matched handle', () => {
    const { primary } = buildCategoryNav(LIVE_HANDLES)
    expect(primary.find((c) => c.displayName === 'Apparel')).toEqual({
      displayName: 'Apparel',
      href: '/category/capes-gowns',
    })
  })

  it('falls back to the next present handle when the first matched handle is missing', () => {
    const withoutCapesGowns = LIVE_HANDLES.filter((c) => c.handle !== 'capes-gowns')
    const { primary } = buildCategoryNav(withoutCapesGowns)
    expect(primary.find((c) => c.displayName === 'Apparel')).toEqual({
      displayName: 'Apparel',
      href: '/category/caps-headwear',
    })
  })

  it('omits roadmap categories with no live matching handle', () => {
    const { primary, more } = buildCategoryNav(LIVE_HANDLES)
    const allNames = [...primary, ...more].map((c) => c.displayName)
    expect(allNames).not.toContain('Needles & Syringes')
    expect(allNames).not.toContain('Pharmacy Products')
  })
})

describe('getUnmappedRoadmapCategories', () => {
  it('lists roadmap categories with zero live matches', () => {
    const unmapped = getUnmappedRoadmapCategories(LIVE_HANDLES)
    const names = unmapped.map((c) => c.displayName)
    expect(names).toContain('Needles & Syringes')
    expect(names).toContain('Surgical Sutures')
    expect(names).toContain('Respiratory')
    expect(names).toContain('Disinfectants')
    expect(names).toContain('IV Therapy')
    expect(names).toContain('Urology & Ostomy')
    expect(names).toContain('Sterilization')
    expect(names).toContain('Pharmacy Products')
  })

  it('does not list a fully mapped category', () => {
    const unmapped = getUnmappedRoadmapCategories(LIVE_HANDLES)
    expect(unmapped.map((c) => c.displayName)).not.toContain('Gloves')
  })
})
