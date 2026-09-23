import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The catalog data head is mocked — this test guards the ROUTE's contract
// (input validation, per-IP rate limit, server-side source/cacheTags derivation,
// response shape + Cache-Control), NOT the Shopify pipeline (covered elsewhere).
vi.mock('@/lib/catalog/resolve-catalog-view', () => ({
  resolveCatalogView: vi.fn(),
}))
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: vi.fn(() => false),
  clientIp: vi.fn(() => '127.0.0.1'),
}))
// Subcategory resolution walks the live L2 tree; unused by the L1 tests below.
vi.mock('@/lib/category-tree-data.server', () => ({
  fetchProductTagSummaries: vi.fn(async () => []),
}))

import { resolveCatalogView } from '@/lib/catalog/resolve-catalog-view'
import { isRateLimited } from '@/lib/rate-limit'
import { GET } from '../route'

const mockResolve = vi.mocked(resolveCatalogView)
const mockRateLimited = vi.mocked(isRateLimited)

function req(qs: string): NextRequest {
  return new NextRequest(`http://localhost:3999/api/catalog${qs}`)
}

const OK_RESOLUTION = {
  status: 'ok' as const,
  products: [{ id: 'gid://shopify/Product/1', handle: 'p1' }],
  filters: [],
  categoryFacet: undefined,
  filterLabelMap: new Map([['{"a":1}', 'A']]),
  reviewSummaries: new Map(),
  total: 1,
  hasNext: false,
  renderedCount: 1,
  title: 'Gloves',
  handle: 'gloves',
  searchQuery: undefined,
}

beforeEach(() => {
  mockResolve.mockReset()
  mockRateLimited.mockReset().mockReturnValue(false)
})

describe('GET /api/catalog', () => {
  it('429s when the per-IP rate limit trips (before any resolution)', async () => {
    mockRateLimited.mockReturnValue(true)
    const res = await GET(req('?slug=gloves'))
    expect(res.status).toBe(429)
    expect(mockResolve).not.toHaveBeenCalled()
  })

  it('400s when slug is missing', async () => {
    const res = await GET(req(''))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'missing_slug' })
  })

  it('404s when the slug resolves to neither an L1 nor a featured subcategory', async () => {
    const res = await GET(req('?slug=not-a-real-category-xyz'))
    expect(res.status).toBe(404)
    expect(mockResolve).not.toHaveBeenCalled()
  })

  it('resolves a real L1 slug with the SAME cacheTags the page uses, and returns the view + Cache-Control', async () => {
    mockResolve.mockResolvedValue(OK_RESOLUTION)
    const res = await GET(req('?slug=gloves&filter=%7B%22a%22%3A1%7D&sort=PRICE_ASC'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300')

    // The load-bearing contract: cacheTags carry 'shopify' + 'products' so the
    // Shopify webhook (revalidateTag('products'/'collections')) invalidates this
    // route's fetches exactly as it does the server-rendered page's.
    expect(mockResolve).toHaveBeenCalledTimes(1)
    const arg = mockResolve.mock.calls[0][0]
    expect(arg.cacheTags).toEqual(expect.arrayContaining(['shopify', 'products']))
    expect(arg.currentPage).toBe(1)
    expect(arg.sortKey).toBe('PRICE')

    // filterLabelMap is serialized as entries for the client to reconstruct.
    const body = await res.json()
    expect(body.filterLabelMap).toEqual([['{"a":1}', 'A']])
    expect(body.products).toHaveLength(1)
  })

  it('400s (out_of_range) on an invalid page so the client resets to page 1', async () => {
    const res = await GET(req('?slug=gloves&page=0'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'out_of_range' })
  })

  it('maps a deep-page miss (empty_past_end) to 400 out_of_range', async () => {
    mockResolve.mockResolvedValue({ status: 'empty_past_end' })
    const res = await GET(req('?slug=gloves&page=99'))
    expect(res.status).toBe(400)
  })
})
