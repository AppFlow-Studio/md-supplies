import { describe, it, expect } from 'vitest'
import { resolveVariantValue, resolveVariantSupplement } from '../resolve-variant-value'

// Bilal, 2026-08-14: "selected variant value first; shared product value
// only when the variant value is blank and a shared fallback is valid; no
// duplicate display when both values are identical."
describe('resolveVariantValue', () => {
  it('prefers the variant value when present', () => {
    expect(resolveVariantValue('Box of 50', 'Case of 100')).toBe('Box of 50')
  })

  it('falls back to the product value when the variant value is blank', () => {
    expect(resolveVariantValue(null, 'Case of 100')).toBe('Case of 100')
    expect(resolveVariantValue(undefined, 'Case of 100')).toBe('Case of 100')
    expect(resolveVariantValue('', 'Case of 100')).toBe('Case of 100')
  })

  it('returns null when neither value exists', () => {
    expect(resolveVariantValue(null, null)).toBeNull()
    expect(resolveVariantValue(undefined, undefined)).toBeNull()
  })
})

describe('resolveVariantSupplement', () => {
  it('returns the variant value when it differs from the primary value', () => {
    expect(resolveVariantSupplement('Ships in a padded mailer', 'A rollator.')).toBe('Ships in a padded mailer')
  })

  it('returns null when the variant value is blank — nothing to supplement', () => {
    expect(resolveVariantSupplement(null, 'A rollator.')).toBeNull()
    expect(resolveVariantSupplement(undefined, 'A rollator.')).toBeNull()
  })

  it('returns null when the variant value is identical to the primary value — no duplicate display', () => {
    expect(resolveVariantSupplement('A rollator.', 'A rollator.')).toBeNull()
  })
})
