import { describe, it, expect } from 'vitest'
import nextConfig from '@/next.config'

describe('next.config headers()', () => {
  it('returns exactly one rule matching all routes', async () => {
    const rules = await nextConfig.headers!()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe('/(.*)')
  })

  it('includes all four required static security headers', async () => {
    const rules = await nextConfig.headers!()
    const keys = rules[0].headers.map((h) => h.key)
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
    expect(keys).toContain('Referrer-Policy')
    expect(keys).toContain('Permissions-Policy')
  })

  it('X-Content-Type-Options is nosniff', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'X-Content-Type-Options')
    expect(h?.value).toBe('nosniff')
  })

  it('X-Frame-Options is SAMEORIGIN', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'X-Frame-Options')
    expect(h?.value).toBe('SAMEORIGIN')
  })

  it('Referrer-Policy is strict-origin-when-cross-origin', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'Referrer-Policy')
    expect(h?.value).toBe('strict-origin-when-cross-origin')
  })

  // CSP (enforcing + Report-Only) is generated per-request in proxy.ts, not
  // here — a fresh nonce needs a request, which this static config doesn't
  // have. Covered by lib/__tests__/csp.test.ts and __tests__/proxy.test.ts.
  it('does not ship any Content-Security-Policy header from this static config', async () => {
    const rules = await nextConfig.headers!()
    const keys = rules[0].headers.map((h) => h.key)
    expect(keys).not.toContain('Content-Security-Policy')
    expect(keys).not.toContain('Content-Security-Policy-Report-Only')
  })
})
