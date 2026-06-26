import { describe, it, expect } from 'vitest'
import {
  getCategoryBannerPath,
  getSubcategoryBannerPath,
  getProductPlaceholderPath,
  GLOBAL_PRODUCT_PLACEHOLDER,
} from '../bunnycdn'

describe('getCategoryBannerPath', () => {
  it('resolves a top-level category handle to its curated placeholder image', () => {
    expect(getCategoryBannerPath('gloves')).toBe('/api/bunny/categories/gloves-placeholder.jpeg')
  })

  it('falls back to the global placeholder when the handle matches no roadmap category', () => {
    expect(getCategoryBannerPath('totally-unknown-handle')).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })
})

describe('getSubcategoryBannerPath', () => {
  it('resolves a subcategory handle to its parent category placeholder image', () => {
    expect(getSubcategoryBannerPath('gloves-nitrile')).toBe('/api/bunny/categories/gloves-placeholder.jpeg')
  })

  it('falls back to the global placeholder when the handle matches no roadmap category', () => {
    expect(getSubcategoryBannerPath('totally-unknown-handle')).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })
})

describe('getProductPlaceholderPath', () => {
  it('resolves a top-level category handle to its placeholder', () => {
    expect(getProductPlaceholderPath('gloves')).toBe('/api/bunny/categories/gloves-placeholder.jpeg')
  })

  it('resolves a subcategory handle to its parent placeholder', () => {
    expect(getProductPlaceholderPath('gloves-nitrile')).toBe('/api/bunny/categories/gloves-placeholder.jpeg')
  })

  it('falls back to the global placeholder when no category handle is given', () => {
    expect(getProductPlaceholderPath(undefined)).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
    expect(getProductPlaceholderPath(null)).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })

  it('falls back to the global placeholder when the handle matches no roadmap category', () => {
    expect(getProductPlaceholderPath('totally-unknown-handle')).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })

  it('resolves a newly-mapped handle to its category placeholder', () => {
    // "Respiratory" was empty before Task 1 filled matchedHandles: ['respiratory'].
    expect(getProductPlaceholderPath('respiratory')).toBe('/api/bunny/categories/respiratory-placeholder.jpeg')
  })
})
