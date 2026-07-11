import { describe, it, expect } from 'vitest'
import { normalizeGtin } from '@/lib/gtin'

describe('normalizeGtin', () => {
  it('accepts checksum-valid GTINs from the live catalog', () => {
    // Real barcodes sampled from the MDSupplies Shopify catalog
    expect(normalizeGtin('20665973019714')).toBe('20665973019714')
    expect(normalizeGtin('20665973019691')).toBe('20665973019691')
    expect(normalizeGtin('10665973019809')).toBe('10665973019809')
  })

  it('rejects a catalog barcode that is GTIN-shaped but fails the check digit', () => {
    // '31143699' exists in the live catalog: 8 digits but invalid GS1 checksum
    expect(normalizeGtin('31143699')).toBeUndefined()
  })

  it('accepts a valid GTIN-12 (UPC) and GTIN-13 (EAN)', () => {
    expect(normalizeGtin('036000291452')).toBe('036000291452')
    expect(normalizeGtin('4006381333931')).toBe('4006381333931')
  })

  it('strips spaces and dashes before validating', () => {
    expect(normalizeGtin('0360 0029-1452')).toBe('036000291452')
  })

  it('rejects SKU-copy junk barcodes (the dominant case in this catalog)', () => {
    expect(normalizeGtin('B6819')).toBeUndefined()
    expect(normalizeGtin('B786-04')).toBeUndefined()
  })

  it('rejects digit strings with wrong GTIN lengths', () => {
    expect(normalizeGtin('12345')).toBeUndefined()
    expect(normalizeGtin('123456789')).toBeUndefined() // 9 digits
    expect(normalizeGtin('123456789012345')).toBeUndefined() // 15 digits
  })

  it('rejects GTIN-shaped strings with a bad check digit', () => {
    expect(normalizeGtin('036000291453')).toBeUndefined()
    expect(normalizeGtin('20665973019715')).toBeUndefined()
  })

  it('returns undefined for null/undefined/empty', () => {
    expect(normalizeGtin(null)).toBeUndefined()
    expect(normalizeGtin(undefined)).toBeUndefined()
    expect(normalizeGtin('')).toBeUndefined()
  })
})
