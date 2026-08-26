import { describe, it, expect, vi, beforeEach } from 'vitest'

// app/sitemap.xml/route.ts (hand-built index) and app/sitemaps/sitemap.ts
// (generateSitemaps(), the special file serving the actual shard children)
// each independently compute the same shard-id list off
// getProductShardCount(). Nothing else locks them together — if one side's
// id-naming convention drifted, the index would link to shard URLs
// generateSitemaps() never actually serves (or vice versa), and neither
// side would fail on its own. This test imports both real implementations
// and asserts every <loc> the index emits corresponds 1:1 to an id
// generateSitemaps() returns.
vi.mock('@/lib/seo/sitemap', () => ({
  getProductShardCount: vi.fn(),
}))

import { getProductShardCount } from '@/lib/seo/sitemap'
const mockGetProductShardCount = vi.mocked(getProductShardCount)

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
}

describe('sitemap index <-> shard-children invariant (app/sitemap.xml <-> app/sitemaps/sitemap.ts)', () => {
  beforeEach(() => {
    mockGetProductShardCount.mockReset()
  })

  it('every <loc> in the hand-built index corresponds to an id generateSitemaps() actually returns, with no extras', async () => {
    mockGetProductShardCount.mockResolvedValue(3)

    const { generateSitemaps } = await import('../../../app/sitemaps/sitemap')
    const { GET } = await import('../../../app/sitemap.xml/route')

    const ids = (await generateSitemaps()).map((s) => s.id)
    const res = await GET()
    const body = await res.text()
    const locs = extractLocs(body)

    expect(locs.length).toBeGreaterThan(0)

    // Every emitted <loc> must map to an id generateSitemaps() knows about.
    const locIds = locs.map((loc) => {
      const match = loc.match(/\/sitemaps\/sitemap\/([^/]+)\.xml$/)
      expect(match, loc).not.toBeNull()
      return match![1]
    })
    expect(new Set(locIds)).toEqual(new Set(ids))

    // And every id generateSitemaps() returns must be represented in the
    // index (no orphaned shard child the index never links to).
    for (const id of ids) {
      expect(locs, id).toContain(`https://mdsupplies.com/sitemaps/sitemap/${id}.xml`)
    }
  })

  it('shard count of 0 still emits the content shard on both sides (base case)', async () => {
    mockGetProductShardCount.mockResolvedValue(0)

    const { generateSitemaps } = await import('../../../app/sitemaps/sitemap')
    const { GET } = await import('../../../app/sitemap.xml/route')

    const ids = (await generateSitemaps()).map((s) => s.id)
    expect(ids).toEqual(['content'])

    const res = await GET()
    const locs = extractLocs(await res.text())
    expect(locs).toEqual(['https://mdsupplies.com/sitemaps/sitemap/content.xml'])
  })
})
