import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CollectionProduct } from '@/lib/shopify/types'

const getSession = vi.fn()
vi.mock('@/lib/shopify/session', () => ({ getSession: () => getSession() }))

const customerFetch = vi.fn()
vi.mock('@/lib/shopify/customer', () => ({ customerFetch: (...args: unknown[]) => customerFetch(...args) }))

const storefrontFetch = vi.fn()
vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: (...args: unknown[]) => storefrontFetch(...args) }))

const getCustomerFavorites = vi.fn()
const addCustomerFavorite = vi.fn()
const removeCustomerFavorite = vi.fn()
const pruneCustomerFavorites = vi.fn()
vi.mock('@/lib/shopify/favorites-admin', () => ({
  getCustomerFavorites: (...args: unknown[]) => getCustomerFavorites(...args),
  addCustomerFavorite: (...args: unknown[]) => addCustomerFavorite(...args),
  removeCustomerFavorite: (...args: unknown[]) => removeCustomerFavorite(...args),
  pruneCustomerFavorites: (...args: unknown[]) => pruneCustomerFavorites(...args),
}))

import {
  getFavoritedProductIds,
  toggleFavorite,
  removeFavoriteAction,
  getAccountFavorites,
} from '../favorites'

const CUSTOMER_ID = 'gid://shopify/Customer/1'
const PRODUCT_A = 'gid://shopify/Product/1'
const PRODUCT_B = 'gid://shopify/Product/2'

function signIn() {
  getSession.mockResolvedValue({ accessToken: 'token', refreshToken: 'r', expiresAt: Date.now() + 60_000 })
  customerFetch.mockResolvedValue({ customer: { id: CUSTOMER_ID } })
}

function signOut() {
  getSession.mockResolvedValue(null)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getFavoritedProductIds — guest cost avoidance', () => {
  it('returns [] for a guest without ever touching the Admin API', async () => {
    signOut()
    const result = await getFavoritedProductIds()
    expect(result).toEqual([])
    expect(getCustomerFavorites).not.toHaveBeenCalled()
  })

  it('returns the signed-in customer’s favorited product ids', async () => {
    signIn()
    getCustomerFavorites.mockResolvedValue([
      { productId: PRODUCT_A, variantId: null, createdAt: 'x' },
      { productId: PRODUCT_B, variantId: null, createdAt: 'y' },
    ])
    expect(await getFavoritedProductIds()).toEqual([PRODUCT_A, PRODUCT_B])
  })

  it('degrades to [] rather than throwing when the Admin read fails', async () => {
    signIn()
    getCustomerFavorites.mockRejectedValue(new Error('admin down'))
    expect(await getFavoritedProductIds()).toEqual([])
  })
})

describe('toggleFavorite', () => {
  it('refuses a guest with a concise error, and never calls the Admin API', async () => {
    signOut()
    const result = await toggleFavorite(PRODUCT_A, null)
    expect(result).toEqual({ ok: false, error: expect.stringContaining('sign in') })
    expect(addCustomerFavorite).not.toHaveBeenCalled()
    expect(removeCustomerFavorite).not.toHaveBeenCalled()
  })

  it('adds when not currently favorited', async () => {
    signIn()
    getCustomerFavorites.mockResolvedValue([])
    addCustomerFavorite.mockResolvedValue([{ productId: PRODUCT_A, variantId: null, createdAt: 'x' }])
    const result = await toggleFavorite(PRODUCT_A, null)
    expect(result).toEqual({ ok: true, favorited: true })
    expect(addCustomerFavorite).toHaveBeenCalledWith(CUSTOMER_ID, PRODUCT_A, null)
  })

  it('removes when currently favorited', async () => {
    signIn()
    getCustomerFavorites.mockResolvedValue([{ productId: PRODUCT_A, variantId: null, createdAt: 'x' }])
    removeCustomerFavorite.mockResolvedValue([])
    const result = await toggleFavorite(PRODUCT_A, null)
    expect(result).toEqual({ ok: true, favorited: false })
    expect(removeCustomerFavorite).toHaveBeenCalledWith(CUSTOMER_ID, PRODUCT_A)
  })

  it('returns a concise ok:false on an Admin failure, for the client to roll back', async () => {
    signIn()
    getCustomerFavorites.mockRejectedValue(new Error('boom'))
    const result = await toggleFavorite(PRODUCT_A, null)
    expect(result.ok).toBe(false)
  })
})

describe('removeFavoriteAction', () => {
  it('is idempotent — removing an absent favorite still reports ok', async () => {
    signIn()
    removeCustomerFavorite.mockResolvedValue([])
    const result = await removeFavoriteAction(PRODUCT_A)
    expect(result).toEqual({ ok: true })
  })

  it('reports ok:false for a guest without calling the Admin API', async () => {
    signOut()
    const result = await removeFavoriteAction(PRODUCT_A)
    expect(result).toEqual({ ok: false })
    expect(removeCustomerFavorite).not.toHaveBeenCalled()
  })
})

describe('getAccountFavorites — product lifecycle edge cases', () => {
  function product(id: string): CollectionProduct {
    return {
      id,
      title: `Product ${id}`,
      handle: id.split('/').pop()!,
      vendor: '',
      availableForSale: true,
      tags: [],
      priceRange: { minVariantPrice: { amount: '9.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '9.99', currencyCode: 'USD' } },
      images: { nodes: [] },
      variants: { nodes: [] },
    } as unknown as CollectionProduct
  }

  it('reports signedIn:false with no products for a guest', async () => {
    signOut()
    expect(await getAccountFavorites()).toEqual({ signedIn: false, products: [] })
  })

  it('resolves favorited ids to live product data via nodes(ids:)', async () => {
    signIn()
    getCustomerFavorites.mockResolvedValue([
      { productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { productId: PRODUCT_B, variantId: null, createdAt: '2026-01-02T00:00:00.000Z' },
    ])
    storefrontFetch.mockResolvedValue({ nodes: [product(PRODUCT_A), product(PRODUCT_B)] })
    const result = await getAccountFavorites()
    expect(result.signedIn).toBe(true)
    // Newest-favorited-first.
    expect(result.products.map((p) => p.id)).toEqual([PRODUCT_B, PRODUCT_A])
  })

  it('drops an orphan (deleted or unpublished product) from the rendered list and prunes it', async () => {
    signIn()
    getCustomerFavorites.mockResolvedValue([
      { productId: PRODUCT_A, variantId: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { productId: PRODUCT_B, variantId: null, createdAt: '2026-01-02T00:00:00.000Z' },
    ])
    // Shopify's nodes() returns null for anything it can no longer resolve.
    storefrontFetch.mockResolvedValue({ nodes: [product(PRODUCT_A), null] })
    pruneCustomerFavorites.mockResolvedValue([{ productId: PRODUCT_A, variantId: null, createdAt: 'x' }])
    const result = await getAccountFavorites()
    expect(result.products.map((p) => p.id)).toEqual([PRODUCT_A])
    expect(pruneCustomerFavorites).toHaveBeenCalledWith(CUSTOMER_ID, new Set([PRODUCT_A]))
  })

  it('never prunes when every favorite still resolves', async () => {
    signIn()
    getCustomerFavorites.mockResolvedValue([{ productId: PRODUCT_A, variantId: null, createdAt: 'x' }])
    storefrontFetch.mockResolvedValue({ nodes: [product(PRODUCT_A)] })
    await getAccountFavorites()
    expect(pruneCustomerFavorites).not.toHaveBeenCalled()
  })

  it('degrades to an empty list rather than throwing when the Storefront read fails', async () => {
    signIn()
    getCustomerFavorites.mockResolvedValue([{ productId: PRODUCT_A, variantId: null, createdAt: 'x' }])
    storefrontFetch.mockRejectedValue(new Error('storefront down'))
    const result = await getAccountFavorites()
    expect(result).toEqual({ signedIn: true, products: [] })
  })
})
