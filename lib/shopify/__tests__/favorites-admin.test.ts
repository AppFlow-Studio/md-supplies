import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    shopifyStoreDomain: 'test.myshopify.com',
    shopifyAdminClientId: 'test-client-id',
    shopifyAdminClientSecret: 'test-client-secret',
  },
}))

import {
  getCustomerFavorites,
  addCustomerFavorite,
  removeCustomerFavorite,
  pruneCustomerFavorites,
  __resetFavoritesShopIdentityCacheForTests,
} from '../favorites-admin'
import { __resetAdminTokenCacheForTests } from '../admin-token'

const CUSTOMER = 'gid://shopify/Customer/7412345'
const PRODUCT_A = 'gid://shopify/Product/1'
const PRODUCT_B = 'gid://shopify/Product/2'

function adminResponse(data: unknown) {
  return { ok: true, json: async () => ({ data }) }
}

function tokenExchangeResponse(accessToken = 'test-admin-token') {
  return { ok: true, text: async () => '', json: async () => ({ access_token: accessToken, expires_in: 3600 }) }
}

/** Read-only path: no token/identity check, no mutation — just the metafield read. */
function mockRead(value: string | null) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(tokenExchangeResponse())
    .mockResolvedValueOnce(adminResponse({ customer: { favorites: value ? { value } : null } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * Read-then-write path: token exchange, read (the productId membership
 * check happens BEFORE the shop-identity guard, so a no-op add/remove never
 * pays for it — see favorites-admin.ts), shop identity, metafieldsSet.
 */
function mockReadWrite(currentValue: string | null, shop = 'test.myshopify.com') {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(tokenExchangeResponse())
    .mockResolvedValueOnce(adminResponse({ customer: { favorites: currentValue ? { value: currentValue } : null } }))
    .mockResolvedValueOnce(adminResponse({ shop: { myshopifyDomain: shop } }))
    .mockResolvedValueOnce(adminResponse({ metafieldsSet: { metafields: [], userErrors: [] } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentRecords(fetchMock: ReturnType<typeof vi.fn>, callIndex = 3) {
  const body = JSON.parse(fetchMock.mock.calls[callIndex][1].body)
  return JSON.parse(body.variables.metafields[0].value) as Array<{ productId: string; variantId: string | null }>
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', 'test.myshopify.com')
  __resetFavoritesShopIdentityCacheForTests()
  __resetAdminTokenCacheForTests()
})

afterEach(() => vi.unstubAllEnvs())

describe('getCustomerFavorites', () => {
  it('returns [] when no metafield is set', async () => {
    mockRead(null)
    expect(await getCustomerFavorites(CUSTOMER)).toEqual([])
  })

  it('parses a valid JSON list', async () => {
    mockRead(JSON.stringify([{ productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' }]))
    const result = await getCustomerFavorites(CUSTOMER)
    expect(result).toEqual([{ productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' }])
  })

  it('never throws on a malformed value — fails to empty rather than crashing the page', async () => {
    mockRead('{not valid json')
    expect(await getCustomerFavorites(CUSTOMER)).toEqual([])
  })

  it('drops entries missing required fields rather than passing them through', async () => {
    mockRead(JSON.stringify([{ productId: PRODUCT_A, createdAt: 'x' }, { variantId: 'no-product-id' }, 'not-an-object']))
    const result = await getCustomerFavorites(CUSTOMER)
    expect(result).toEqual([{ productId: PRODUCT_A, variantId: null, createdAt: 'x' }])
  })
})

describe('addCustomerFavorite — idempotency (no duplicate records)', () => {
  it('appends a new record with a createdAt timestamp on an empty list', async () => {
    const fetchMock = mockReadWrite(null)
    const result = await addCustomerFavorite(CUSTOMER, PRODUCT_A, null)
    expect(result).toHaveLength(1)
    expect(result[0].productId).toBe(PRODUCT_A)
    expect(typeof result[0].createdAt).toBe('string')
    expect(sentRecords(fetchMock)).toEqual([{ productId: PRODUCT_A, variantId: null, createdAt: result[0].createdAt }])
  })

  it('is a no-op when the product is already favorited — no second record, no mutation call', async () => {
    const existing = JSON.stringify([{ productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' }])
    const fetchMock = mockRead(existing) // no shop-identity/mutation calls expected
    const result = await addCustomerFavorite(CUSTOMER, PRODUCT_A, null)
    expect(result).toHaveLength(1)
    // Only the read happened (token + one GraphQL call) — never reaching a
    // third (identity) or fourth (metafieldsSet) call proves no mutation
    // was attempted for a duplicate add.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps a variant id when one is supplied', async () => {
    const fetchMock = mockReadWrite(null)
    await addCustomerFavorite(CUSTOMER, PRODUCT_A, 'gid://shopify/ProductVariant/9')
    expect(sentRecords(fetchMock)[0].variantId).toBe('gid://shopify/ProductVariant/9')
  })
})

describe('removeCustomerFavorite — idempotency', () => {
  it('removes an existing record', async () => {
    const existing = JSON.stringify([
      { productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { productId: PRODUCT_B, variantId: null, createdAt: '2026-01-02T00:00:00.000Z' },
    ])
    const fetchMock = mockReadWrite(existing)
    const result = await removeCustomerFavorite(CUSTOMER, PRODUCT_A)
    expect(result.map((r) => r.productId)).toEqual([PRODUCT_B])
    expect(sentRecords(fetchMock).map((r) => r.productId)).toEqual([PRODUCT_B])
  })

  it('is a no-op when the product was never favorited — no mutation call', async () => {
    const existing = JSON.stringify([{ productId: PRODUCT_B, variantId: null, createdAt: '2026-01-02T00:00:00.000Z' }])
    const fetchMock = mockRead(existing)
    const result = await removeCustomerFavorite(CUSTOMER, PRODUCT_A)
    expect(result.map((r) => r.productId)).toEqual([PRODUCT_B])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('addCustomerFavorite / removeCustomerFavorite — shop-identity gate', () => {
  it('refuses the write when the token authenticates against another shop', async () => {
    mockReadWrite(null, 'daebb2-76.myshopify.com')
    await expect(addCustomerFavorite(CUSTOMER, PRODUCT_A, null)).rejects.toThrow(/PRODUCTION store/)
  })
})

describe('pruneCustomerFavorites — orphan cleanup', () => {
  it('drops records whose product no longer resolves (deleted/unpublished) and writes the trimmed list', async () => {
    const existing = JSON.stringify([
      { productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { productId: PRODUCT_B, variantId: null, createdAt: '2026-01-02T00:00:00.000Z' },
    ])
    const fetchMock = mockReadWrite(existing)
    const result = await pruneCustomerFavorites(CUSTOMER, new Set([PRODUCT_A]))
    expect(result.map((r) => r.productId)).toEqual([PRODUCT_A])
    expect(sentRecords(fetchMock).map((r) => r.productId)).toEqual([PRODUCT_A])
  })

  it('never issues a mutation when every favorite still resolves', async () => {
    const existing = JSON.stringify([{ productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' }])
    const fetchMock = mockRead(existing)
    const result = await pruneCustomerFavorites(CUSTOMER, new Set([PRODUCT_A, PRODUCT_B]))
    expect(result.map((r) => r.productId)).toEqual([PRODUCT_A])
    // Read-only: token exchange + the metafield read, nothing else.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
