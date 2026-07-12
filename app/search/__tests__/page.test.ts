import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
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

describe('search page bad-cursor handling (NF10)', () => {
  it('redirects to page 1 with q/sort/filter preserved when a stale `after` cursor errors', async () => {
    mockFetch.mockRejectedValue(new Error('Cursor is invalid'))

    let caught: unknown
    try {
      await SearchPage({
        searchParams: Promise.resolve({
          q: 'gloves',
          sort: 'PRICE_ASC',
          filter: ['{"available":true}'],
          after: 'stale-cursor',
        }),
      })
    } catch (err) {
      caught = err
    }

    const path = getRedirectPath(caught)
    expect(path).toContain('q=gloves')
    expect(path).toContain('sort=PRICE_ASC')
    expect(path).not.toContain('after=')
  })

  it('still shows the empty state (no redirect) when there is no `after` cursor', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))

    const result = await SearchPage({
      searchParams: Promise.resolve({ q: 'gloves' }),
    })

    expect(result).toBeTruthy()
  })
})
