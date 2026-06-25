import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('SITE_NAME', () => {
  it('is MDSupplies', async () => {
    const { SITE_NAME } = await import('@/lib/site-config')
    expect(SITE_NAME).toBe('MDSupplies')
  })
})

describe('SITE_ORIGIN', () => {
  it('falls back to the production URL when NEXT_PUBLIC_SITE_URL is not set', async () => {
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://mdsupplies.com')
  })

  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dev.example.com')
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://dev.example.com')
  })

  it('strips a trailing slash from NEXT_PUBLIC_SITE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dev.example.com/')
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://dev.example.com')
  })
})

describe('Customer Account public vars', () => {
  it('returns empty string for SHOPIFY_CUSTOMER_ACCOUNT_URL when not set', async () => {
    const { SHOPIFY_CUSTOMER_ACCOUNT_URL } = await import('@/lib/site-config')
    expect(SHOPIFY_CUSTOMER_ACCOUNT_URL).toBe('')
  })

  it('returns the value of SHOPIFY_CUSTOMER_ACCOUNT_URL when set', async () => {
    vi.stubEnv('SHOPIFY_CUSTOMER_ACCOUNT_URL', 'https://shopify.com/authentication/123')
    const { SHOPIFY_CUSTOMER_ACCOUNT_URL } = await import('@/lib/site-config')
    expect(SHOPIFY_CUSTOMER_ACCOUNT_URL).toBe('https://shopify.com/authentication/123')
  })

  it('returns the value of SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID when set', async () => {
    vi.stubEnv('SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID', 'abc-uuid')
    const { SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID } = await import('@/lib/site-config')
    expect(SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID).toBe('abc-uuid')
  })
})
