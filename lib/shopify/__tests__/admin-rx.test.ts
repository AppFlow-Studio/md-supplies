import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    shopifyStoreDomain: 'test.myshopify.com',
    shopifyAdminToken: 'test-admin-token',
  },
}))

import { setCustomerRxDocument, __resetShopIdentityCacheForTests } from '../admin'

const CUSTOMER = 'gid://shopify/Customer/7412345'

function adminResponse(data: unknown) {
  return {
    ok: true,
    json: async () => ({ data }),
  }
}

/**
 * Call order for a mutation: ShopIdentity, then GetCustomerRxState, then
 * metafieldsSet. The identity call comes first because every Admin write now
 * confirms which shop the token authenticates against before touching data.
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
  const body = JSON.parse(fetchMock.mock.calls[2][1].body)
  return body.variables.metafields as Array<{ key: string; value: string }>
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', 'test.myshopify.com')
  // The identity result is held for the process, so clear it between cases.
  __resetShopIdentityCacheForTests()
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

describe('setCustomerRxDocument — shop-identity gate', () => {
  it('verifies the authenticated shop before reading or writing anything', async () => {
    const fetchMock = mockAdmin({ document: null, verified: null })
    await setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf')
    const firstQuery = JSON.parse(fetchMock.mock.calls[0][1].body).query
    expect(firstQuery).toContain('myshopifyDomain')
  })

  it('refuses the write when the token authenticates against another shop', async () => {
    // A correct-looking configuration paired with a credential belonging to a
    // different store: the case only asking Shopify can catch.
    const fetchMock = mockAdmin({ document: null, verified: null }, 'daebb2-76.myshopify.com')
    await expect(
      setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf'),
    ).rejects.toThrow(/PRODUCTION store/)
    // Identity was asked, and nothing else was sent.
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('refuses the write when Shopify reports no shop identity', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(adminResponse({ shop: null }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      setCustomerRxDocument(CUSTOMER, 'rx-documents/7412345/new.pdf'),
    ).rejects.toThrow(/did not report a shop identity/)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not cache a failed verification, so a transient error is recoverable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network down')))
    await expect(setCustomerRxDocument(CUSTOMER, 'a.pdf')).rejects.toThrow(/could not verify/)

    // Same process, no reset: a healthy retry must now succeed.
    const fetchMock = mockAdmin({ document: null, verified: null })
    await expect(setCustomerRxDocument(CUSTOMER, 'a.pdf')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
