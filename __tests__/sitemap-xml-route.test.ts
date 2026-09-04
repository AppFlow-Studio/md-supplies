import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/seo/sitemap', () => ({
  getProductShardCount: vi.fn(),
}))

import { getProductShardCount } from '@/lib/seo/sitemap'
const mockGetProductShardCount = vi.mocked(getProductShardCount)

describe('GET /sitemap.xml — hand-built sitemap index', () => {
  beforeEach(() => {
    mockGetProductShardCount.mockReset()
  })

  it('returns a sitemapindex referencing the content shard and every product shard', async () => {
    mockGetProductShardCount.mockResolvedValue(2)
    const { GET } = await import('../app/sitemap.xml/route')

    const res = await GET()
    const body = await res.text()

    expect(res.headers.get('Content-Type')).toBe('application/xml')
    expect(body).toContain('<sitemapindex')
    expect(body).toContain('https://mdsupplies.com/sitemaps/sitemap/content.xml')
    expect(body).toContain('https://mdsupplies.com/sitemaps/sitemap/products-0.xml')
    expect(body).toContain('https://mdsupplies.com/sitemaps/sitemap/products-1.xml')
  })
})
