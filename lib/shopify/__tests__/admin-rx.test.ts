import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    shopifyStoreDomain: 'test.myshopify.com',
    shopifyAdminClientId: 'test-client-id',
    shopifyAdminClientSecret: 'test-client-secret',
  },
}))

import { setCustomerRxDocument, __resetShopIdentityCacheForTests } from '../admin'
import { __resetAdminTokenCacheForTests } from '../admin-token'

const CUSTOMER = 'gid://shopify/Customer/7412345'

function adminResponse(data: unknown) {
  return {
    ok: true,
    json: async () => ({ data }),
  }
}

function tokenExchangeResponse(accessToken = 'test-admin-token') {
  return {
    ok: true,
    text: async () => '',
    json: async () => ({ access_token: accessToken, expires_in: 3600 }),
  }
}

/**
 * Call order for a mutation: token exchange, ShopIdentity, then
 * GetCustomerRxState, then metafieldsSet. The token exchange comes first
 * because the QA custom app issues short-lived tokens via client_credentials
 * rather than a static access token (see lib/shopify/admin-token.ts). The
 * identity call comes next because every Admin write confirms which shop the
 * token authenticates against before touching data.
 *
 * @param shop the shop Shopify reports back, defaulting to the one this suite
 *             stands in for. Pass another to exercise the refusal path.
 */
function mockAdmin(
  state: { document: string | null; verified: string | null },
  shop = 'test.myshopify.com',
) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(tokenExchangeResponse())
    .mockResolvedValueOnce(adminResponse({ shop: { myshopifyDomain: shop } }))
    .mockResolvedValueOnce(
      adminResponse({
        customer: {
          document: state.document ? { value: state.document } : null,
          verified: state.verified ? { value: state.verified } : null,
        },
      }),
    )
    .mockResolvedValueOnce(adminResponse({ metafieldsSet: { metafields: [], userErrors: [] } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentMetafields(fetchMock: ReturnType<typeof vi.fn>) {
  const body = JSON.parse(fetchMock.mock.calls[3][1].body)
  return body.variables.metafields as Array<{ key: string; value: string }>
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', 'test.myshopify.com')
  // The identity result and the admin token are both held for the process,
  // so clear them between cases.
  __resetShopIdentityCacheForTests()
  __resetAdminTokenCacheForTests()
})

afterEach(() => vi.unstubAllEnvs())

describe('setCustomerRxDocument — replaced-document threat', () => {
  it('initializes rx_verified=false on a first upload', async () => {
    const fetchMock = mockAdmin({ document: null, verified: null })
    await setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf')
    const verified = sentMetafields(fetchMock).find((m) => m.key === 'rx_verified')
    expect(verified?.value).toBe('false')
  })

  it('does NOT touch an existing rx_verified flag on a plain set (TOCTOU guard)', async () => {
    const fetchMock = mockAdmin({ document: null, verified: 'true' })
    await setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf')
    expect(sentMetafields(fetchMock).find((m) => m.key === 'rx_verified')).toBeUndefined()
  })

  it('force-resets rx_verified=false when replacing a verified document', async () => {
    const fetchMock = mockAdmin({ document: 'rx-documents/7412345/old.pdf', verified: 'true' })
    await setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf', { resetVerified: true })
    const verified = sentMetafields(fetchMock).find((m) => m.key === 'rx_verified')
    expect(verified?.value).toBe('false')
  })
})

describe('setCustomerRxDocument — admin token exchange', () => {
  it('exchanges client credentials for an access token before the first Admin call', async () => {
    const fetchMock = mockAdmin({ document: null, verified: null })
    await setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://test.myshopify.com/admin/oauth/access_token')
    const body = new URLSearchParams(init.body as string)
    expect(body.get('grant_type')).toBe('client_credentials')
  })

  it('sends the exchanged token as X-Shopify-Access-Token on the identity check', async () => {
    const fetchMock = mockAdmin({ document: null, verified: null })
    await setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf')
    const identityHeaders = fetchMock.mock.calls[1][1].headers
    expect(identityHeaders['X-Shopify-Access-Token']).toBe('test-admin-token')
  })
})

describe('setCustomerRxDocument — shop-identity gate', () => {
  it('verifies the authenticated shop before reading or writing anything', async () => {
    const fetchMock = mockAdmin({ document: null, verified: null })
    await setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf')
    const identityQuery = JSON.parse(fetchMock.mock.calls[1][1].body).query
    expect(identityQuery).toContain('myshopifyDomain')
  })

  it('refuses the write when the token authenticates against another shop', async () => {
    // A correct-looking configuration paired with a credential belonging to a
    // different store: the case only asking Shopify can catch.
    const fetchMock = mockAdmin({ document: null, verified: null }, 'daebb2-76.myshopify.com')
    await expect(
      setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf'),
    ).rejects.toThrow(/PRODUCTION store/)
    // Token exchange + identity check were sent, and nothing else was.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('refuses the write when Shopify reports no shop identity', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenExchangeResponse())
      .mockResolvedValueOnce(adminResponse({ shop: null }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf'),
    ).rejects.toThrow(/did not report a shop identity/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed verification, so a transient error is recoverable', async () => {
    // Token exchange succeeds (and is cached) on the first attempt; the
    // ShopIdentity call itself fails. The retry must not re-request a token
    // — the cached one is reused — and must succeed once ShopIdentity does.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenExchangeResponse())
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(adminResponse({ shop: { myshopifyDomain: 'test.myshopify.com' } }))
      .mockResolvedValueOnce(adminResponse({ customer: { document: null, verified: null } }))
      .mockResolvedValueOnce(adminResponse({ metafieldsSet: { metafields: [], userErrors: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(setCustomerRxDocument(CUSTOMER, 'a.pdf')).rejects.toThrow(/could not verify/)

    // Same process, no reset: a healthy retry must now succeed.
    await expect(setCustomerRxDocument(CUSTOMER, 'a.pdf')).resolves.toBeUndefined()
    // 1 token exchange + 1 failed identity check + 3 successful retry calls —
    // the token is NOT re-fetched on retry.
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})
