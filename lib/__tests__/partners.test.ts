import { describe, it, expect } from 'vitest'
import {
  PARTNERS,
  getActivePartners,
  getPartnerBySlug,
  partnerForVendor,
} from '@/lib/partners'

describe('getActivePartners', () => {
  it('returns only active partners', () => {
    expect(getActivePartners().every((p) => p.isActive)).toBe(true)
  })

  it('returns them sorted alphabetically by name (case-insensitive)', () => {
    const names = getActivePartners().map((p) => p.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    expect(names).toEqual(sorted)
  })
})

describe('partnerForVendor (alias normalization)', () => {
  it('matches an exact vendor name', () => {
    expect(partnerForVendor('AD Surgical')?.slug).toBe('ad-surgical')
  })

  it('matches ignoring case and surrounding whitespace', () => {
    expect(partnerForVendor('  ad surgical  ')?.slug).toBe('ad-surgical')
  })

  it('matches despite a corporate suffix and punctuation', () => {
    expect(partnerForVendor('AD Surgical, Inc.')?.slug).toBe('ad-surgical')
    expect(partnerForVendor('Dynarex Corp.')?.slug).toBe('dynarex')
  })

  it('collapses internal whitespace differences', () => {
    expect(partnerForVendor('Graham   Field')?.slug).toBe('graham-field')
  })

  it('returns undefined for an unknown vendor', () => {
    expect(partnerForVendor('Totally Unknown Vendor')).toBeUndefined()
  })

  it('returns undefined for empty input', () => {
    expect(partnerForVendor('')).toBeUndefined()
    expect(partnerForVendor('   ')).toBeUndefined()
  })
})

describe('getPartnerBySlug', () => {
  it('finds a known partner', () => {
    expect(getPartnerBySlug('ad-surgical')?.vendorName).toBe('AD Surgical')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getPartnerBySlug('nope')).toBeUndefined()
  })
})

describe('PARTNERS data integrity', () => {
  it('every partner has a unique slug', () => {
    const slugs = PARTNERS.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
