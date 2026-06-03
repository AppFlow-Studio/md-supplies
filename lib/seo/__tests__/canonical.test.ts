import { describe, it, expect } from 'vitest'
import { buildCanonical } from '../canonical'

// SITE_URL defaults to 'https://mdsupplies.com' in test env (no env var set)
const BASE = 'https://mdsupplies.com'

describe('buildCanonical', () => {
  describe('self (default)', () => {
    it('returns full URL for a simple path', () => {
      expect(buildCanonical({ path: '/category/gloves' })).toBe(`${BASE}/category/gloves`)
    })

    it('includes query string (self strategy does not strip params)', () => {
      expect(buildCanonical({ path: '/category/gloves?sort=price', strategy: 'self' })).toBe(
        `${BASE}/category/gloves?sort=price`,
      )
    })

    it('handles root path', () => {
      expect(buildCanonical({ path: '/' })).toBe(`${BASE}/`)
    })
  })

  describe('parent-unfiltered', () => {
    it('strips query string when no basePath given', () => {
      expect(
        buildCanonical({ path: '/category/gloves?page=2', strategy: 'parent-unfiltered' }),
      ).toBe(`${BASE}/category/gloves`)
    })

    it('uses basePath when provided', () => {
      expect(
        buildCanonical({ path: '/category/gloves?filter=blue', strategy: 'parent-unfiltered', basePath: '/category/gloves' }),
      ).toBe(`${BASE}/category/gloves`)
    })
  })

  describe('base-product', () => {
    it('uses basePath for variant URLs', () => {
      expect(
        buildCanonical({ path: '/product/syringe?variant=123', strategy: 'base-product', basePath: '/product/syringe' }),
      ).toBe(`${BASE}/product/syringe`)
    })

    it('falls back to path when basePath not given', () => {
      expect(
        buildCanonical({ path: '/product/syringe', strategy: 'base-product' }),
      ).toBe(`${BASE}/product/syringe`)
    })
  })

  describe('self — tracking param stripping', () => {
    it('strips utm_source', () => {
      expect(buildCanonical({ path: '/category/gloves?utm_source=google' })).toBe(`${BASE}/category/gloves`)
    })

    it('strips utm_medium and utm_campaign together', () => {
      expect(
        buildCanonical({ path: '/category/gloves?utm_medium=cpc&utm_campaign=summer' }),
      ).toBe(`${BASE}/category/gloves`)
    })

    it('strips gclid', () => {
      expect(buildCanonical({ path: '/category/gloves?gclid=Cj0KCQjw' })).toBe(`${BASE}/category/gloves`)
    })

    it('strips msclkid', () => {
      expect(buildCanonical({ path: '/product/glove?msclkid=abc123' })).toBe(`${BASE}/product/glove`)
    })

    it('preserves non-tracking params (page cursor)', () => {
      expect(
        buildCanonical({ path: '/category/gloves?page=2&after=cursor123' }),
      ).toBe(`${BASE}/category/gloves?page=2&after=cursor123`)
    })

    it('strips tracking params but preserves legitimate params', () => {
      expect(
        buildCanonical({ path: '/category/gloves?page=2&utm_source=email&after=abc' }),
      ).toBe(`${BASE}/category/gloves?page=2&after=abc`)
    })

    it('parent-unfiltered strategy already strips all params (no double-strip issue)', () => {
      expect(
        buildCanonical({ path: '/category/gloves?utm_source=google', strategy: 'parent-unfiltered' }),
      ).toBe(`${BASE}/category/gloves`)
    })
  })
})
