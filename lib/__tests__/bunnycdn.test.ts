import { describe, it, expect } from 'vitest'
import {
  getCategoryBannerConfig,
  getCategoryBannerPath,
  getSubcategoryBannerPath,
  getProductPlaceholderPath,
  getIndustryImagePath,
  getBlogImagePath,
  GLOBAL_PRODUCT_PLACEHOLDER,
  LOGO_PATH,
} from '../bunnycdn'

// DEV-LAUNCH-13: all six image-serving routes this module builds paths for
// (logo, category banner, subcategory banner, product placeholder, industry,
// blog) get direct coverage below — previously only three of the six had a
// dedicated test.

describe('getCategoryBannerConfig', () => {
  it('resolves a roadmap category handle to its curated image and descriptive alt', () => {
    const config = getCategoryBannerConfig('gloves')
    expect(config.path).toBe('/api/bunny/categories/gloves-placeholder.jpeg')
    expect(config.alt).toBe('Disposable exam gloves')
  })

  it('falls back to the global placeholder and its alt when the handle matches no roadmap category', () => {
    const config = getCategoryBannerConfig('totally-unknown-handle')
    expect(config.path).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
    expect(config.alt).toBe('Assorted medical supplies')
  })
})

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

describe('getIndustryImagePath', () => {
  it('builds a proxy path under the industries/ zone folder', () => {
    expect(getIndustryImagePath('urgent-care.jpeg')).toBe('/api/bunny/industries/urgent-care.jpeg')
  })
})

describe('getBlogImagePath', () => {
  it('builds a proxy path under the blogs/ zone folder', () => {
    expect(getBlogImagePath('cover.jpeg')).toBe('/api/bunny/blogs/cover.jpeg')
  })
})

describe('LOGO_PATH', () => {
  it('serves the logo from the bundled local asset, not the BunnyCDN proxy', () => {
    // Brand-critical chrome must not depend on the third-party storage
    // credential — see the constant's own comment for the 2026-08-02 incident.
    expect(LOGO_PATH).toBe('/images/logo.png')
    expect(LOGO_PATH).not.toMatch(/^\/api\/bunny\//)
  })
})
