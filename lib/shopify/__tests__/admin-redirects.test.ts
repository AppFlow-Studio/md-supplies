import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    shopifyStoreDomain: 'test.myshopify.com',
    shopifyAdminClientId: 'test-client-id',
    shopifyAdminClientSecret: 'test-client-secret',
  },
}))

import { fetchAllShopifyRedirects } from '../admin-redirects'
import { __resetAdminTokenCacheForTests } from '../admin-token'

function tokenExchangeResponse(accessToken = 'test-admin-token') {
  return {
    ok: true,
    text: async () => '',
    json: async () => ({ access_token: accessToken, expires_in: 3600 }),
  }
}

function adminResponse(data: unknown) {
  return { ok: true, json: async () => ({ data }) }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', 'test.myshopify.com')
  __resetAdminTokenCacheForTests()
})

afterEach(() => vi.unstubAllEnvs())

describe('fetchAllShopifyRedirects', () => {
  it('exchanges an admin token before the first Admin call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenExchangeResponse())
      .mockResolvedValueOnce(
        adminResponse({
          urlRedirects: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await fetchAllShopifyRedirects()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://test.myshopify.com/admin/oauth/access_token')
    const body = new URLSearchParams(init.body as string)
    expect(body.get('grant_type')).toBe('client_credentials')
  })

  it('maps path/target nodes to from/to rows', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenExchangeResponse())
      .mockResolvedValueOnce(
        adminResponse({
          urlRedirects: {
            nodes: [
              { path: '/products/old-handle', target: '/products/new-handle' },
              { path: '/products/other-old', target: '/products/other-new' },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const rows = await fetchAllShopifyRedirects()

    expect(rows).toEqual([
      { from: '/products/old-handle', to: '/products/new-handle' },
      { from: '/products/other-old', to: '/products/other-new' },
    ])
  })

  it('follows pagination until hasNextPage is false', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenExchangeResponse())
      .mockResolvedValueOnce(
        adminResponse({
          urlRedirects: {
            nodes: [{ path: '/products/a', target: '/products/b' }],
            pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
          },
        }),
      )
      .mockResolvedValueOnce(
        adminResponse({
          urlRedirects: {
            nodes: [{ path: '/products/c', target: '/products/d' }],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const rows = await fetchAllShopifyRedirects()

    expect(rows).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(3) // token + 2 pages
    const secondPageBody = JSON.parse(fetchMock.mock.calls[2][1].body)
    expect(secondPageBody.variables.after).toBe('cursor-1')
  })

  it('throws when the store reports GraphQL errors (e.g. missing read_content scope)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenExchangeResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errors: [{ message: 'Access denied for urlRedirects field' }] }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAllShopifyRedirects()).rejects.toThrow(/Access denied/)
  })
})
