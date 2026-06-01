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
})
