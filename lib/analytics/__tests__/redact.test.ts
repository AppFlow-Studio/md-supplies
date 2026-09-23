import { describe, it, expect } from 'vitest'
import { redactPii, normalizeSearchTerm } from '@/lib/analytics/redact'

describe('redactPii', () => {
  it('removes an email address a customer pasted into search', () => {
    expect(redactPii('order for nurse@clinic.org')).toBe('order for [redacted]')
  })

  it('removes a phone number', () => {
    expect(redactPii('call 555-123-4567')).toBe('call [redacted]')
  })

  it('leaves catalogue codes and SKUs alone', () => {
    // These are exactly what customers legitimately search for, so an
    // over-eager digit rule would blind search reporting.
    expect(redactPii('B2080C')).toBe('B2080C')
    expect(redactPii('18g needle 1.5 inch')).toBe('18g needle 1.5 inch')
  })
})

describe('normalizeSearchTerm', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSearchTerm('  nitrile   gloves  ')).toBe('nitrile gloves')
  })

  it('caps length', () => {
    expect(normalizeSearchTerm('a'.repeat(300))).toHaveLength(100)
  })

  it('redacts as well as normalizes', () => {
    expect(normalizeSearchTerm('  ship to bob@x.com ')).toBe('ship to [redacted]')
  })
})
