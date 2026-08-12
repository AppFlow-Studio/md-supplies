import { describe, it, expect } from 'vitest'
import {
  parsePageSize,
  formatResultCount,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  isPageSize,
} from '@/lib/catalog/page-size'

describe('per-page control', () => {
  it('offers exactly the approved choices, in order', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 30, 50, 100])
  })

  it('defaults to 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20)
    expect(parsePageSize(undefined)).toBe(20)
  })

  it('divides evenly by the two-column phone grid', () => {
    // The spec ties the default to the mobile grid; a 20-item page fills 10
    // complete rows with no orphan.
    expect(DEFAULT_PAGE_SIZE % 2).toBe(0)
  })

  it('accepts every approved value', () => {
    for (const n of PAGE_SIZE_OPTIONS) {
      expect(parsePageSize(String(n)), String(n)).toBe(n)
    }
  })

  it('falls back safely for invalid, negative, decimal or oversized values', () => {
    for (const bad of ['0', '-20', '1.5', '20.0', '9999', '1e2', 'abc', '', ' ', '25', '020', ' 20 ']) {
      expect(parsePageSize(bad), JSON.stringify(bad)).toBe(DEFAULT_PAGE_SIZE)
    }
  })

  it('takes the first value when the param repeats, rather than throwing', () => {
    expect(parsePageSize(['50', '10'])).toBe(50)
    expect(parsePageSize(['bogus'])).toBe(DEFAULT_PAGE_SIZE)
  })

  it('rejects non-approved integers via the type guard too', () => {
    expect(isPageSize(20)).toBe(true)
    expect(isPageSize(25)).toBe(false)
  })
})

describe('result count label', () => {
  it('uses the exact requested wording', () => {
    expect(formatResultCount(20, 307)).toBe('Showing 20 products of 307')
  })

  it('handles singular grammar on both numbers', () => {
    expect(formatResultCount(1, 1)).toBe('Showing 1 product of 1')
    expect(formatResultCount(1, 42)).toBe('Showing 1 product of 42')
  })

  it('reports the RENDERED count on a partial last page, not the page size', () => {
    // 307 products at 20 per page: page 16 renders 7.
    expect(formatResultCount(7, 307)).toBe('Showing 7 products of 307')
  })

  it('does not hardcode any total', () => {
    expect(formatResultCount(3, 9)).toBe('Showing 3 products of 9')
    expect(formatResultCount(1234, 5678)).toBe('Showing 1234 products of 5678')
  })

  it('reports zero results in words, not as a pair of zeroes', () => {
    // "Showing 0 products of 0" is called out in the spec as misleading
    // feedback; the grid's empty state owns the recovery action and this line
    // must agree with it.
    expect(formatResultCount(0, 0)).toBe('No products found')
  })
})
