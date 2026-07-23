import { describe, it, expect, vi } from 'vitest'
import { buildCsp, generateNonce, CSP_REPORT_URI } from '@/lib/csp'

describe('generateNonce', () => {
  it('produces a fresh value every call', () => {
    expect(generateNonce()).not.toBe(generateNonce())
  })
})

describe('buildCsp', () => {
  it('is enforcing-ready: no unsafe-inline in script-src', () => {
    const csp = buildCsp('abc123', false)
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'))!
    expect(scriptSrc).not.toContain('unsafe-inline')
    expect(scriptSrc).toContain("'nonce-abc123'")
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).toContain('https://www.googletagmanager.com')
  })

  it('adds unsafe-eval only in dev (React dev-mode stack traces)', () => {
    expect(buildCsp('n', true)).toContain("'unsafe-eval'")
    expect(buildCsp('n', false)).not.toContain("'unsafe-eval'")
  })

  it('carries the report-uri directive', () => {
    expect(buildCsp('n', false)).toContain(`report-uri ${CSP_REPORT_URI}`)
  })

  it('preserves the pre-existing allowlist (img/connect/frame/etc.)', () => {
    const csp = buildCsp('n', false)
    expect(csp).toContain('https://cdn.shopify.com')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("base-uri 'self'")
  })

  it('allows exactly the configured Shopify store origin (env-driven, no hardcode)', () => {
    vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
    const csp = buildCsp('n', false)
    const connectSrc = csp.split('; ').find((d) => d.startsWith('connect-src'))!
    const frameSrc = csp.split('; ').find((d) => d.startsWith('frame-src'))!
    expect(connectSrc).toContain('https://test.myshopify.com')
    expect(frameSrc).toContain('https://test.myshopify.com')
    // The production store must never ride along via a hardcoded fallback.
    expect(csp).not.toContain('daebb2-76.myshopify.com')
    vi.unstubAllEnvs()
  })

  it('omits any Shopify origin when SHOPIFY_STORE_DOMAIN is unset (no fallback)', () => {
    vi.stubEnv('SHOPIFY_STORE_DOMAIN', '')
    const csp = buildCsp('n', false)
    expect(csp).not.toContain('myshopify.com')
    vi.unstubAllEnvs()
  })
})
