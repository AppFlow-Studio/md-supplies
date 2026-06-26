import { describe, it, expect } from 'vitest'
import { BRANDS, getSortedBrands, brandHref, brandLogoUrl } from '@/lib/brands'

describe('getSortedBrands', () => {
  it('returns all brands sorted alphabetically by name (case-insensitive)', () => {
    const names = getSortedBrands().map((b) => b.name)
    const expected = [...names].sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    )
    expect(names).toEqual(expected)
  })

  it('orders "Accutest" before "Acon Laboratories"', () => {
    const names = getSortedBrands().map((b) => b.name)
    expect(names.indexOf('Accutest')).toBeLessThan(names.indexOf('Acon Laboratories'))
  })

  it('includes every brand exactly once', () => {
    expect(getSortedBrands()).toHaveLength(BRANDS.length)
    const slugs = getSortedBrands().map((b) => b.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('brand link/logo helpers', () => {
  it('builds a partner href only when a destination exists', () => {
    expect(brandHref({ partnerSlug: 'ad-surgical' })).toBe('/partners/ad-surgical')
    expect(brandHref({})).toBeUndefined()
  })

  it('builds a logo url only when a verified logo file exists', () => {
    expect(brandLogoUrl({ logoFile: '3m.svg' })).toBe('/api/bunny/brands/3m.svg')
    expect(brandLogoUrl({})).toBeUndefined()
  })
})
