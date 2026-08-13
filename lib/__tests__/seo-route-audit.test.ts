import { describe, it, expect } from 'vitest'
import { CATEGORY_TREE_L1, getCategorySlug } from '@/lib/category-tree'
import { INDUSTRIES, SUPPORTED_INDUSTRIES } from '@/lib/industries'
import { ROADMAP_CATEGORIES, getShopifyHandle } from '@/lib/category-nav'
import { CATEGORY_IMAGE_CONFIG, CATEGORY_IMAGE_FALLBACK } from '@/lib/category-images'
import { getCategoryBannerConfig } from '@/lib/bunnycdn'
import { filterRegistry, industryFilterRegistry, DEFAULT_FACET_RULES, getFacetRules } from '@/lib/filter-registry'
import { SITE_URL } from '@/lib/seo/constants'

// Programmatic half of the route-by-route SEO audit (spec §"SEO verification
// artifact"). The narrative table lives in docs/audits/; these are the checks
// that must not silently rot, so they run in CI instead.

const CATEGORY_SLUGS = CATEGORY_TREE_L1.map(getCategorySlug)
const INDUSTRY_SLUGS = SUPPORTED_INDUSTRIES.map((i) => i.slug)

describe('route registry completeness', () => {
  it('registers exactly the 25 approved categories', () => {
    expect(CATEGORY_TREE_L1).toHaveLength(25)
  })

  it('registers exactly the 5 approved industries as indexable', () => {
    expect(INDUSTRY_SLUGS.sort()).toEqual([
      'clinics-doctors-offices',
      'home-health',
      'hrt-clinics',
      'pharmacies',
      'urgent-care',
    ])
  })

  it('gives every category a unique public slug', () => {
    expect(new Set(CATEGORY_SLUGS).size).toBe(CATEGORY_SLUGS.length)
  })

  it('gives every category a unique display name and a non-empty description', () => {
    const names = CATEGORY_TREE_L1.map((c) => c.displayName)
    expect(new Set(names).size).toBe(names.length)
    for (const c of CATEGORY_TREE_L1) {
      expect(c.shortDescription.trim().length, c.displayName).toBeGreaterThan(20)
    }
  })

  it('gives every industry a non-empty description', () => {
    for (const i of SUPPORTED_INDUSTRIES) {
      expect(i.description.trim().length, i.slug).toBeGreaterThan(20)
    }
  })
})

describe('hero imagery', () => {
  it('resolves a curated (non-fallback) image for all 25 categories', () => {
    const unresolved = CATEGORY_TREE_L1.filter(
      (c) => getCategoryBannerConfig(c.collectionHandle).path.endsWith(CATEGORY_IMAGE_FALLBACK.file),
    ).map((c) => c.displayName)
    expect(unresolved).toEqual([])
  })

  it('gives every category hero a focal position, so the crop is deliberate', () => {
    for (const c of CATEGORY_TREE_L1) {
      expect(getCategoryBannerConfig(c.collectionHandle).focalPosition, c.displayName).toBeTruthy()
    }
  })

  it('gives every industry an uploaded hero image', () => {
    for (const i of SUPPORTED_INDUSTRIES) {
      expect(i.image, i.slug).toMatch(/^\/api\/bunny\/industries\//)
    }
  })

  it('has an image entry for every placeholderSlug the nav registry references', () => {
    const missing = ROADMAP_CATEGORIES
      .filter((c) => !(c.placeholderSlug in CATEGORY_IMAGE_CONFIG))
      .map((c) => c.displayName)
    expect(missing).toEqual([])
  })
})

describe('canonical URL hygiene', () => {
  it('uses an absolute production origin with no localhost or preview host', () => {
    expect(SITE_URL).toMatch(/^https:\/\//)
    expect(SITE_URL).not.toMatch(/localhost|127\.0\.0\.1|vercel\.app|ngrok/i)
    expect(SITE_URL.endsWith('/')).toBe(false)
  })

  it('mints no duplicate canonical among the 30 detail routes', () => {
    const urls = [
      ...CATEGORY_SLUGS.map((s) => `${SITE_URL}/category/${s}`),
      ...INDUSTRY_SLUGS.map((s) => `${SITE_URL}/industries/${s}`),
    ]
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls).toHaveLength(30)
  })

  it('never emits a category URL that the proxy would redirect', () => {
    // proxy.ts 301s /category/face-coverings → /category/face-masks as a
    // subtree. Any registry-derived URL still using the raw Shopify handle
    // would be an internal link into a redirect and a redirecting entry in the
    // sitemap.
    expect(CATEGORY_SLUGS).not.toContain('face-coverings')
    expect(CATEGORY_SLUGS).toContain('face-masks')
  })

  it('resolves every public slug back to a real Shopify handle', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      expect(getShopifyHandle(getCategorySlug(l1)), l1.displayName).toBe(l1.collectionHandle)
    }
  })
})

describe('facet registry covers every public route', () => {
  it('has an explicit entry for all 25 category slugs — none on the bare default', () => {
    const missing = CATEGORY_SLUGS.filter((s) => !(s in filterRegistry))
    expect(missing).toEqual([])
    for (const slug of CATEGORY_SLUGS) {
      expect(getFacetRules(slug).length, slug).toBeGreaterThan(DEFAULT_FACET_RULES.length)
    }
  })

  it('has an explicit entry for all 5 industry slugs', () => {
    const missing = INDUSTRY_SLUGS.filter((s) => !(s in industryFilterRegistry))
    expect(missing).toEqual([])
  })
})

describe('industry indexability is consistent across grid, metadata and sitemap', () => {
  it('excludes every industry without a validated assortment', () => {
    const unbacked = INDUSTRIES.filter((i) => !i.tag).map((i) => i.slug)
    // These render noindex and must not appear in the sitemap or the grid.
    expect(unbacked.length).toBeGreaterThan(0)
    for (const slug of unbacked) {
      expect(INDUSTRY_SLUGS).not.toContain(slug)
    }
  })
})
