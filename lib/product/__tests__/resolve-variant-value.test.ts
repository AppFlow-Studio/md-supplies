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

// Bilal, 2026-08-20 (code review on #64): "Product-level Units per Order may
// be used only when it safely applies to every variant. If packaging differs
// and the selected variant lacks its own value, do not display another
// variant's quantity." Reproduces the pen-needle-4mm-depth-32g-x-5-32-box-9543
// case: product-level unitsPerOrder is 100/Box (from the UltiGuard variants),
// UltiCare variants are 50/Box — a blank UltiCare variant must not inherit
// UltiGuard's 100/Box just because it's the product-level value.
describe('resolveVariantValue — cross-variant packaging conflicts', () => {
  it('does not fall back to the product value when a sibling variant explicitly disagrees with it', () => {
    expect(resolveVariantValue(null, '100/Box', ['50/Box', '100/Box', null])).toBeNull()
  })

  it('still falls back to the product value when every sibling that has a value agrees with it', () => {
    expect(resolveVariantValue(null, '100/Box', ['100/Box', null, '100/Box'])).toBe('100/Box')
  })

  it('falls back to the product value when no sibling values are given at all', () => {
    expect(resolveVariantValue(null, '100/Box')).toBe('100/Box')
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
