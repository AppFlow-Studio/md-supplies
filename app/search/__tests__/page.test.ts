import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

// DEV-FAV-01: SearchPage now checks getSession() for the favorites heart
// state. Not under test here — every case in this file exercises a guest
// visitor's search results, so this stays a plain "signed out" stub.
vi.mock('@/lib/shopify/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import SearchPage from '../page'

const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

function getRedirectPath(err: unknown): string {
  // next/navigation's redirect() throws an Error whose `.digest` encodes
  // the target, e.g. "NEXT_REDIRECT;replace;/search?q=gloves;307;".
  const digest = (err as { digest?: string }).digest ?? ''
  return digest.split(';')[2] ?? ''
}

describe('search page deterministic page-N pagination (DEV-LAUNCH-06)', () => {
  it('requests first = currentPage * pageSize + 1 with no cursor, for a direct deep-page visit', async () => {
    mockFetch.mockResolvedValue({
      search: { totalCount: 0, productFilters: [], nodes: [] },
    })

    await SearchPage({
      searchParams: Promise.resolve({ q: 'gloves', page: '3' }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ query: 'gloves', first: 37, after: null }),
    )
  })

  it('redirects to page 1 (q/sort/filter preserved) when the Storefront fetch fails on a deep page', async () => {
    mockFetch.mockRejectedValue(new Error('Storefront API HTTP 500'))

    let caught: unknown
    try {
      await SearchPage({
        searchParams: Promise.resolve({
          q: 'gloves',
          sort: 'PRICE_ASC',
          filter: ['{"available":true}'],
          page: '4',
        }),
      })
    } catch (err) {
      caught = err
    }

    const path = getRedirectPath(caught)
    expect(path).toContain('q=gloves')
    expect(path).toContain('sort=PRICE_ASC')
    expect(path).not.toContain('page=')
  })

  it('lets the error surface (no redirect) when the failure happens on page 1', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))

    const result = await SearchPage({
      searchParams: Promise.resolve({ q: 'gloves' }),
    })

    expect(result).toBeTruthy()
  })

  it('redirects to page 1 when the requested page exceeds MAX_SEARCH_PAGE', async () => {
    let caught: unknown
    try {
      await SearchPage({
        searchParams: Promise.resolve({ q: 'gloves', page: '999' }),
      })
    } catch (err) {
      caught = err
    }

    const path = getRedirectPath(caught)
    expect(path).toContain('q=gloves')
    expect(path).not.toContain('page=')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
