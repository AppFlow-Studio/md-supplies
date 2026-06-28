import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// All required vars — every test that imports env.server must have these set
const REQUIRED: Record<string, string> = {
  SHOPIFY_STORE_DOMAIN: 'test.myshopify.com',
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'sf-token',
  SHOPIFY_ADMIN_ACCESS_TOKEN: 'admin-token',
  RESEND_API_KEY: 're_test',
  BUNNYCDN_STORAGE_ACCESS_KEY: 'bunny-key',
}

function stubRequired(omit?: string) {
  for (const [k, v] of Object.entries(REQUIRED)) {
    if (k !== omit) vi.stubEnv(k, v)
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('serverEnv — happy path', () => {
  it('returns all required vars when set', async () => {
    stubRequired()
    const { serverEnv } = await import('@/lib/env.server')
    expect(serverEnv.shopifyStoreDomain).toBe('test.myshopify.com')
    expect(serverEnv.shopifyStorefrontToken).toBe('sf-token')
    expect(serverEnv.shopifyAdminToken).toBe('admin-token')
    expect(serverEnv.resendApiKey).toBe('re_test')
    expect(serverEnv.bunnyCdnAccessKey).toBe('bunny-key')
  })

  it('uses fallback for optional vars when not set', async () => {
    stubRequired()
    const { serverEnv } = await import('@/lib/env.server')
    expect(serverEnv.resendFromEmail).toBe('noreply@mdsupplies.com')
    expect(serverEnv.resendToEmail).toBe('team@mdsupplies.com')
    expect(serverEnv.bunnyCdnHostname).toBe('ny.storage.bunnycdn.com')
    expect(serverEnv.bunnyCdnZone).toBe('md-supplies')
  })

  it('uses set values for optional vars', async () => {
    stubRequired()
    vi.stubEnv('RESEND_FROM_EMAIL', 'custom@example.com')
    vi.stubEnv('BUNNYCDN_STORAGE_ZONE', 'my-zone')
    const { serverEnv } = await import('@/lib/env.server')
    expect(serverEnv.resendFromEmail).toBe('custom@example.com')
    expect(serverEnv.bunnyCdnZone).toBe('my-zone')
  })
})

describe('serverEnv — missing required vars', () => {
  // Validation is lazy: importing the module must NOT throw (so `next build`
  // succeeds with an empty env in CI). Accessing a missing required field at
  // runtime is what throws.
  const accessorByVar: Record<string, (e: typeof import('@/lib/env.server').serverEnv) => unknown> = {
    SHOPIFY_STORE_DOMAIN: (e) => e.shopifyStoreDomain,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: (e) => e.shopifyStorefrontToken,
    SHOPIFY_ADMIN_ACCESS_TOKEN: (e) => e.shopifyAdminToken,
    RESEND_API_KEY: (e) => e.resendApiKey,
    BUNNYCDN_STORAGE_ACCESS_KEY: (e) => e.bunnyCdnAccessKey,
  }

  it('import does not throw even when required vars are missing', async () => {
    // no env stubbed at all
    await expect(import('@/lib/env.server')).resolves.toBeDefined()
  })

  it.each(Object.keys(accessorByVar))('throws on access for missing %s', async (varName) => {
    stubRequired(varName)
    const { serverEnv } = await import('@/lib/env.server')
    expect(() => accessorByVar[varName](serverEnv)).toThrow(
      `[env] Missing required server variable: ${varName}. Check .env.local (dev) or your deployment environment (prod).`
    )
  })
})
