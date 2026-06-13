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
} = {}) {
  const collections = overrides.collections ?? []
  const products = overrides.products ?? []
  const articles = overrides.articles ?? []

  mockFetch.mockImplementation((query: string) => {
    if (query.includes('GetCollections(')) {
      return Promise.resolve({ collections: { nodes: collections.map(h => ({ handle: h })) } })
    }
    if (query.includes('GetAllProductHandles')) {
      return Promise.resolve({
        products: {
          nodes: products.map(h => ({ handle: h })),
          pageInfo: { hasNextPage: false, endCursor: '' },
        },
      })
    }
    if (query.includes('GetAllArticleHandles')) {
      return Promise.resolve({
        blogs: {
          nodes: [
            {
              handle: 'news',
              articles: { nodes: articles.map(h => ({ handle: h })) },
            },
          ],
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

  it('emits /category/<handle> for each Shopify collection', async () => {
    setupDefaultMocks({ collections: ['gloves', 'masks', 'exam-gloves-nitrile'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).toContain('https://mdsupplies.com/category/masks')
    expect(urls).toContain('https://mdsupplies.com/category/exam-gloves-nitrile')
  })

  it('excludes brands and brands-* collection handles', async () => {
    setupDefaultMocks({ collections: ['brands', 'brands-dynarex', 'gloves'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.every(u => !u.includes('/brands'))).toBe(true)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
  })

  it('emits /product/<handle> for each Shopify product', async () => {
    setupDefaultMocks({ products: ['exam-gloves-3xl', 'surgical-mask-50pk'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/product/exam-gloves-3xl')
    expect(urls).toContain('https://mdsupplies.com/product/surgical-mask-50pk')
  })

  it('paginates products across multiple pages', async () => {
    let productCallCount = 0
    mockFetch.mockImplementation((query: string, variables?: Record<string, unknown>) => {
      if (query.includes('GetCollections(')) {
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

  it('does not emit noindexed /industries/<slug> detail pages in sitemap', async () => {
    setupDefaultMocks()
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.every(u => !u.match(/\/industries\/[a-z]/))).toBe(true)
    // The /industries hub page should still be in STATIC_URLS
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
})
