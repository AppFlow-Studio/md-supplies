import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SESSION_COOKIES } from '@/lib/shopify/session'

const exchangeToken = vi.fn()
vi.mock('@/lib/shopify/customer', () => ({
  exchangeToken: (...args: unknown[]) => exchangeToken(...args),
  customerFetch: (...args: unknown[]) => customerFetch(...args),
}))
const customerFetch = vi.fn()

const addCustomerFavorite = vi.fn()
vi.mock('@/lib/shopify/favorites-admin', () => ({
  addCustomerFavorite: (...args: unknown[]) => addCustomerFavorite(...args),
}))

import { GET } from '../callback/route'

// The route redirects against SITE_ORIGIN (a fixed constant, see
// lib/site-config.ts), not the request's own host — REQUEST_HOST below is
// just where the test constructs the incoming NextRequest from.
const REQUEST_HOST = 'https://mdsupplies.example.com'
const SITE_ORIGIN = 'https://mdsupplies.com'

function req(query: string, cookies: Record<string, string> = {}) {
  const request = new NextRequest(new URL(`/api/auth/callback${query}`, REQUEST_HOST))
  for (const [name, value] of Object.entries(cookies)) request.cookies.set(name, value)
  return request
}

function pendingFavoriteCookie(response: Response) {
  return response.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIES.PENDING_FAVORITE}=`))
}

const validCookies = {
  [SESSION_COOKIES.CODE_VERIFIER]: 'verifier',
  [SESSION_COOKIES.OAUTH_STATE]: 'state-123',
}

beforeEach(() => {
  vi.clearAllMocks()
  exchangeToken.mockResolvedValue({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 })
})

describe('GET /api/auth/callback — guest favorite handoff (DEV-FAV-01)', () => {
  it('redirects to /account when there is no pending favorite', async () => {
    const res = await GET(req('?code=abc&state=state-123', validCookies))
    expect(res.headers.get('location')).toBe(`${SITE_ORIGIN}/account`)
    expect(addCustomerFavorite).not.toHaveBeenCalled()
  })

  it('completes the pending favorite and redirects to its stored return path', async () => {
    customerFetch.mockResolvedValue({ customer: { id: 'gid://shopify/Customer/1' } })
    const pending = JSON.stringify({ productId: 'gid://shopify/Product/1', variantId: null, next: '/product/gloves' })
    const res = await GET(
      req('?code=abc&state=state-123', { ...validCookies, [SESSION_COOKIES.PENDING_FAVORITE]: pending }),
    )
    expect(addCustomerFavorite).toHaveBeenCalledWith('gid://shopify/Customer/1', 'gid://shopify/Product/1', null)
    expect(res.headers.get('location')).toBe(`${SITE_ORIGIN}/product/gloves`)
  })

  it('deletes the pending-favorite cookie after use, even on success', async () => {
    customerFetch.mockResolvedValue({ customer: { id: 'gid://shopify/Customer/1' } })
    const pending = JSON.stringify({ productId: 'gid://shopify/Product/1', variantId: null, next: '/account' })
    const res = await GET(
      req('?code=abc&state=state-123', { ...validCookies, [SESSION_COOKIES.PENDING_FAVORITE]: pending }),
    )
    const raw = pendingFavoriteCookie(res)!
    // Deleted cookies are re-set with an empty value / immediate expiry.
    expect(raw).toMatch(/pending_favorite=;/)
  })

  it('still completes login when the favorite add fails (best-effort, never blocks auth)', async () => {
    customerFetch.mockResolvedValue({ customer: { id: 'gid://shopify/Customer/1' } })
    addCustomerFavorite.mockRejectedValue(new Error('admin down'))
    const pending = JSON.stringify({ productId: 'gid://shopify/Product/1', variantId: null, next: '/product/gloves' })
    const res = await GET(
      req('?code=abc&state=state-123', { ...validCookies, [SESSION_COOKIES.PENDING_FAVORITE]: pending }),
    )
    expect(res.headers.get('location')).toBe(`${SITE_ORIGIN}/product/gloves`)
    expect(res.headers.get('set-cookie')).toBeTruthy() // session cookies still set
  })

  it('ignores a malformed pending-favorite cookie rather than breaking login', async () => {
    const res = await GET(
      req('?code=abc&state=state-123', { ...validCookies, [SESSION_COOKIES.PENDING_FAVORITE]: '{not json' }),
    )
    expect(res.headers.get('location')).toBe(`${SITE_ORIGIN}/account`)
    expect(addCustomerFavorite).not.toHaveBeenCalled()
  })

  it('falls back to /account?auth_error=1 and clears the pending cookie on a state mismatch', async () => {
    const pending = JSON.stringify({ productId: 'gid://shopify/Product/1', variantId: null, next: '/product/gloves' })
    const res = await GET(
      req('?code=abc&state=wrong', { ...validCookies, [SESSION_COOKIES.PENDING_FAVORITE]: pending }),
    )
    expect(res.headers.get('location')).toBe(`${SITE_ORIGIN}/account?auth_error=1`)
    expect(pendingFavoriteCookie(res)).toMatch(/pending_favorite=;/)
  })
})
