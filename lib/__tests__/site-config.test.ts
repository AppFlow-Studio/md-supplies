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

describe('IS_STAGING derivation (H5/M11)', () => {
  it('is true on a Vercel preview deploy without any manual flag', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const { IS_STAGING } = await import('@/lib/site-config')
    expect(IS_STAGING).toBe(true)
  })

  it('is false on a Vercel production deploy without any manual flag', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    const { IS_STAGING } = await import('@/lib/site-config')
    expect(IS_STAGING).toBe(false)
  })

  it('is false in local dev (no VERCEL_ENV, no flag)', async () => {
    const { IS_STAGING } = await import('@/lib/site-config')
    expect(IS_STAGING).toBe(false)
  })

  it("manual NEXT_PUBLIC_IS_STAGING='true' overrides a production VERCEL_ENV", async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_IS_STAGING', 'true')
    const { IS_STAGING } = await import('@/lib/site-config')
    expect(IS_STAGING).toBe(true)
  })

  it("manual NEXT_PUBLIC_IS_STAGING='false' overrides a preview VERCEL_ENV", async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_IS_STAGING', 'false')
    const { IS_STAGING } = await import('@/lib/site-config')
    expect(IS_STAGING).toBe(false)
  })
})

describe('production base-URL guard (H4)', () => {
  it('fails a production build when the base URL is an ngrok tunnel', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://ovary-panoramic-stack.ngrok-free.dev')
    await expect(import('@/lib/site-config')).rejects.toThrow(/production deployment/)
  })

  it('fails a production build on a *.vercel.app base URL', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://md-supplies-rho.vercel.app')
    await expect(import('@/lib/site-config')).rejects.toThrow(/Allowed production origins/)
  })

  it('fails a production build on any arbitrary base URL', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://totally-wrong.example.com')
    await expect(import('@/lib/site-config')).rejects.toThrow()
  })

  it('passes a production build on the canonical domain', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mdsupplies.com')
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://mdsupplies.com')
  })

  it('does not fire on preview deploys (dev URLs are fine there)', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://something.ngrok-free.dev')
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://something.ngrok-free.dev')
  })

  it('does not fire when the production-slot deploy is flagged staging (pre-cutover)', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_IS_STAGING', 'true')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://md-supplies-rho.vercel.app')
    const { IS_STAGING } = await import('@/lib/site-config')
    expect(IS_STAGING).toBe(true)
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
