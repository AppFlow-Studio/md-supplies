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
  it.each([
    'SHOPIFY_STORE_DOMAIN',
    'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
    'SHOPIFY_ADMIN_ACCESS_TOKEN',
    'RESEND_API_KEY',
    'BUNNYCDN_STORAGE_ACCESS_KEY',
  ])('throws for missing %s', async (varName) => {
    stubRequired(varName)
    await expect(import('@/lib/env.server')).rejects.toThrow(
      `[env] Missing required server variable: ${varName}. Check .env.local (dev) or your deployment environment (prod).`
    )
  })
})
