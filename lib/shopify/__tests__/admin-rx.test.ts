import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    shopifyStoreDomain: 'test.myshopify.com',
    shopifyAdminToken: 'test-admin-token',
  },
}))

import { setCustomerRxDocument } from '../admin'

const CUSTOMER = 'gid://shopify/Customer/7412345'

function adminResponse(data: unknown) {
  return {
    ok: true,
    json: async () => ({ data }),
  }
}

/** First call: GetCustomerRxState; second call: metafieldsSet. */
function mockAdmin(state: { document: string | null; verified: string | null }) {
  const fetchMock = vi
    .fn()
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
  const body = JSON.parse(fetchMock.mock.calls[1][1].body)
  return body.variables.metafields as Array<{ key: string; value: string }>
}

beforeEach(() => vi.unstubAllGlobals())

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
