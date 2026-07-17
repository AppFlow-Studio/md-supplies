import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSitemapUrls } from '../sitemap'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

function setupDefaultMocks(overrides: {
  collections?: string[]
  products?: string[]
  articles?: string[]
  productTags?: { handle: string; tags: string[] }[]
} = {}) {
  const collections = overrides.collections ?? []
  const products = overrides.products ?? []
  const articles = overrides.articles ?? []
  const productTags = overrides.productTags ?? []

  mockFetch.mockImplementation((query: string, variables?: Record<string, unknown>) => {
    if (query.includes('GetCollectionsForSitemap')) {
      return Promise.resolve({
        collections: {
          nodes: collections.map((h) => ({ handle: h, updatedAt: '2026-06-01T00:00:00Z' })),
        },
      })
    }
    if (query.includes('GetAllProductHandles')) {
      return Promise.resolve({
        products: {
          nodes: products.map((h) => ({ handle: h, updatedAt: '2026-06-01T00:00:00Z' })),
          pageInfo: { hasNextPage: false, endCursor: '' },
        },
      })
    }
    if (query.includes('GetAllProductTags')) {
      return Promise.resolve({
        products: {
          nodes: productTags,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })
    }
    if (query.includes('GetAllArticleHandles')) {
      return Promise.resolve({
        blogs: {
          nodes: [{
            handle: 'news',
            articles: { nodes: articles.map((h) => ({ handle: h, publishedAt: '2026-06-01T00:00:00Z' })) },
          }],
        },
      })
    }
    return Promise.reject(new Error(`Unexpected query: ${String(query).slice(0, 60)}`))
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('getSitemapUrls', () => {
  it('returns empty array on staging without calling Shopify', async () => {
    expect(await getSitemapUrls(true)).toHaveLength(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('includes all static URLs on production', async () => {
    setupDefaultMocks()
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.some(u => u === 'https://mdsupplies.com/')).toBe(true)
    expect(urls.some(u => u.endsWith('/categories'))).toBe(true)
    expect(urls.some(u => u.endsWith('/industries'))).toBe(true)
    expect(urls.some(u => u.endsWith('/partners'))).toBe(true)
    expect(urls.some(u => u.endsWith('/blog'))).toBe(true)
  })

  it('emits /category/<handle> only for roadmap-allowed handles', async () => {
    setupDefaultMocks({ collections: ['gloves', 'needles-syringes', 'non-roadmap-handle'] })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).toContain('https://mdsupplies.com/category/needles-syringes')
    expect(urls).not.toContain('https://mdsupplies.com/category/non-roadmap-handle')
  })

  it('excludes §2.4 removed and hidden-at-launch handles (not in allowlist)', async () => {
    setupDefaultMocks({ collections: ['gloves', 'pharmaceuticals', 'office-supplies'] })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).not.toContain('https://mdsupplies.com/category/pharmaceuticals')
    expect(urls).not.toContain('https://mdsupplies.com/category/office-supplies')
  })

  it('does not emit /category/<handle> for a sub-collection handle that is not an approved L1 (leaked sub-collection bugfix)', async () => {
    setupDefaultMocks({ collections: ['gloves', 'disposable-3-2mm-3-5mm-trocars'] })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).not.toContain('https://mdsupplies.com/category/disposable-3-2mm-3-5mm-trocars')
  })

  it('includes lastmod on category entries from updatedAt', async () => {
    setupDefaultMocks({ collections: ['gloves'] })
    const entries = await getSitemapUrls(false)
    const entry = entries.find((e) => e.url === 'https://mdsupplies.com/category/gloves')
    expect(entry?.lastModified).toEqual(new Date('2026-06-01T00:00:00Z'))
  })

  it('emits /product/<handle> for each Shopify product', async () => {
    setupDefaultMocks({ products: ['exam-gloves-3xl', 'surgical-mask-50pk'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/product/exam-gloves-3xl')
    expect(urls).toContain('https://mdsupplies.com/product/surgical-mask-50pk')
  })

  it('includes lastmod on product entries from updatedAt', async () => {
    setupDefaultMocks({ products: ['exam-gloves-3xl'] })
    const entries = await getSitemapUrls(false)
    const entry = entries.find((e) => e.url === 'https://mdsupplies.com/product/exam-gloves-3xl')
    expect(entry?.lastModified).toEqual(new Date('2026-06-01T00:00:00Z'))
  })

  it('includes lastmod on article entries from publishedAt', async () => {
    setupDefaultMocks({ articles: ['hrt-supply-guide'] })
    const entries = await getSitemapUrls(false)
    const entry = entries.find((e) => e.url === 'https://mdsupplies.com/blog/hrt-supply-guide')
    expect(entry?.lastModified).toEqual(new Date('2026-06-01T00:00:00Z'))
  })

  it('paginates products across multiple pages', async () => {
    let productCallCount = 0
    mockFetch.mockImplementation((query: string, variables?: Record<string, unknown>) => {
      if (query.includes('GetCollectionsForSitemap')) {
        return Promise.resolve({ collections: { nodes: [] } })
      }
      if (query.includes('GetAllProductHandles')) {
        productCallCount++
        if (productCallCount === 1) {
          return Promise.resolve({
            products: {
              nodes: [{ handle: 'p1' }, { handle: 'p2' }],
              pageInfo: { hasNextPage: true, endCursor: 'cursor-abc' },
            },
          })
        }
        expect(variables?.after).toBe('cursor-abc')
        return Promise.resolve({
          products: {
            nodes: [{ handle: 'p3' }],
            pageInfo: { hasNextPage: false, endCursor: '' },
          },
        })
      }
      if (query.includes('GetAllArticleHandles')) {
        return Promise.resolve({ blogs: { nodes: [] } })
      }
      return Promise.reject(new Error('Unexpected query'))
    })

    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/product/p1')
    expect(urls).toContain('https://mdsupplies.com/product/p2')
    expect(urls).toContain('https://mdsupplies.com/product/p3')
  })

  it('emits /partners/<slug> for every partner in static config', async () => {
    setupDefaultMocks()
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.filter(u => u.includes('/partners/')).length).toBeGreaterThan(0)
  })

  it('emits /industries/<slug> detail pages and the /industries hub', async () => {
    setupDefaultMocks()
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    // Industry detail pages are index,follow content pages (closeout §12.2) →
    // they must appear in the sitemap.
    expect(urls).toContain('https://mdsupplies.com/industries/hrt-clinics')
    expect(urls).toContain('https://mdsupplies.com/industries/urgent-care')
    // The /industries hub page is still present (from STATIC_URLS).
    expect(urls.some(u => u.endsWith('/industries'))).toBe(true)
  })

  it('emits /blog/<handle> for each article', async () => {
    setupDefaultMocks({ articles: ['best-exam-gloves-2025', 'hrt-supply-guide'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/blog/best-exam-gloves-2025')
    expect(urls).toContain('https://mdsupplies.com/blog/hrt-supply-guide')
  })

  it('degrades gracefully when Shopify is unreachable — returns static list only', async () => {
    mockFetch.mockRejectedValue(new Error('Network timeout'))
    const urls = await getSitemapUrls(false)
    expect(urls.length).toBeGreaterThan(0)
    const paths = urls.map(e => new URL(e.url).pathname)
    expect(paths).toContain('/')
    expect(paths).toContain('/categories')
  })

  it('never emits /b2b, /account, /cart, /search, /api URLs', async () => {
    setupDefaultMocks()
    const NEVER = ['/b2b', '/account', '/cart', '/search', '/api']
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    for (const excluded of NEVER) {
      const match = urls.find(u => new URL(u).pathname.startsWith(excluded))
      expect(match, `Sitemap must not contain ${excluded}`).toBeUndefined()
    }
  })

  it('homepage has priority 1', async () => {
    setupDefaultMocks()
    const entry = (await getSitemapUrls(false)).find(e => e.url === 'https://mdsupplies.com/')
    expect(entry?.priority).toBe(1)
  })

  it('all URLs use production SITE_URL', async () => {
    setupDefaultMocks({ collections: ['gloves'], products: ['exam-gloves'], articles: ['guide'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    for (const url of urls) {
      expect(url.startsWith('https://mdsupplies.com')).toBe(true)
    }
  })

  it('emits /category/<l1>/<sub> for a real subcategory tag', async () => {
    setupDefaultMocks({
      productTags: [
        { handle: 'p1', tags: ['category:gloves', 'subcategory:exam-gloves'] },
        { handle: 'p2', tags: ['category:gloves', 'subcategory:exam-gloves'] },
      ],
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves/exam-gloves')
  })

  it('emits only the canonical URL for a boundary subcategory, never the cross-link URL', async () => {
    setupDefaultMocks({
      productTags: [
        { handle: 'p1', tags: ['category:room-furniture', 'subcategory:exam-tables'] },
      ],
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/seating/exam-tables')
    expect(urls).not.toContain('https://mdsupplies.com/category/exam-room/exam-tables')
  })

  it('omits a sitemap URL for an attribute-patterned subcategory tag', async () => {
    setupDefaultMocks({
      productTags: [
        { handle: 'p1', tags: ['category:needles-syringes', 'subcategory:25g-hypodermic-needles'] },
      ],
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).not.toContain('https://mdsupplies.com/category/needles-syringes/25g-hypodermic-needles')
  })

  it('degrades gracefully when the product-tag fetch fails, keeping the rest of the sitemap intact', async () => {
    mockFetch.mockImplementation((query: string) => {
      if (query.includes('GetAllProductTags')) return Promise.reject(new Error('tag scan failed'))
      if (query.includes('GetCollectionsForSitemap')) return Promise.resolve({ collections: { nodes: [] } })
      if (query.includes('GetAllProductHandles')) {
        return Promise.resolve({ products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: '' } } })
      }
      if (query.includes('GetAllArticleHandles')) return Promise.resolve({ blogs: { nodes: [] } })
      return Promise.reject(new Error('Unexpected query'))
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/')
    expect(urls.some((u) => u.includes('/category/'))).toBe(false)
  })
})
