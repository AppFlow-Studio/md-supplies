import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/shopify/customer', () => ({
  generateCodeVerifier: () => 'verifier',
  generateCodeChallenge: async () => 'challenge',
  buildAuthUrl: (challenge: string, state: string) =>
    `https://shopify.example.com/authorize?challenge=${challenge}&state=${state}`,
}))

import { GET } from '../login/route'
import { SESSION_COOKIES } from '@/lib/shopify/session'

function req(path: string) {
  return new NextRequest(new URL(path, 'https://mdsupplies.example.com'))
}

function pendingFavoriteCookie(response: Response) {
  const raw = response.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${SESSION_COOKIES.PENDING_FAVORITE}=`))
  if (!raw) return null
  const value = raw.split(';')[0].split('=').slice(1).join('=')
  return JSON.parse(decodeURIComponent(value))
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/auth/login — guest favorite handoff (DEV-FAV-01)', () => {
  it('redirects to the Shopify hosted authorize URL', async () => {
    const res = await GET(req('/api/auth/login'))
    expect(res.headers.get('location')).toContain('https://shopify.example.com/authorize')
  })

  it('sets no pending-favorite cookie when no favorite was requested', async () => {
    const res = await GET(req('/api/auth/login'))
    expect(pendingFavoriteCookie(res)).toBeNull()
  })

  it('stashes productId, variantId and a validated return path when a favorite was requested', async () => {
    const res = await GET(
      req('/api/auth/login?favoriteProductId=gid%3A%2F%2Fshopify%2FProduct%2F1&favoriteVariantId=gid%3A%2F%2Fshopify%2FProductVariant%2F9&next=%2Fproduct%2Fgloves'),
    )
    expect(pendingFavoriteCookie(res)).toEqual({
      productId: 'gid://shopify/Product/1',
      variantId: 'gid://shopify/ProductVariant/9',
      next: '/product/gloves',
    })
  })

  it('stores a null variantId when none was supplied', async () => {
    const res = await GET(req('/api/auth/login?favoriteProductId=gid%3A%2F%2Fshopify%2FProduct%2F1'))
    expect(pendingFavoriteCookie(res)?.variantId).toBeNull()
  })

  it('falls back to /account for an unsafe next (open-redirect guard)', async () => {
    const res = await GET(
      req('/api/auth/login?favoriteProductId=gid%3A%2F%2Fshopify%2FProduct%2F1&next=https%3A%2F%2Fevil.example.com'),
    )
    expect(pendingFavoriteCookie(res)?.next).toBe('/account')
  })

  it('sets the pending-favorite cookie httpOnly, so it is never readable from client JS', async () => {
    const res = await GET(req('/api/auth/login?favoriteProductId=gid%3A%2F%2Fshopify%2FProduct%2F1'))
    const raw = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIES.PENDING_FAVORITE}=`))!
    expect(raw.toLowerCase()).toContain('httponly')
  })
})
