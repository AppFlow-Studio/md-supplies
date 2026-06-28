import { describe, it, expect } from 'vitest'
import nextConfig from '@/next.config'

describe('next.config headers()', () => {
  it('returns exactly one rule matching all routes', async () => {
    const rules = await nextConfig.headers!()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe('/(.*)')
  })

  it('includes all five required security headers', async () => {
    const rules = await nextConfig.headers!()
    const keys = rules[0].headers.map((h) => h.key)
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
    expect(keys).toContain('Referrer-Policy')
    expect(keys).toContain('Permissions-Policy')
    expect(keys).toContain('Content-Security-Policy-Report-Only')
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

  it('CSP Report-Only contains required directives and sources', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')
    const value = h?.value ?? ''
    expect(value).toContain("default-src 'self'")
    expect(value).toContain('https://www.googletagmanager.com')
    expect(value).toContain('https://cdn.shopify.com')
    expect(value).toContain("object-src 'none'")
    expect(value).toContain("frame-ancestors 'self'")
    expect(value).toContain("base-uri 'self'")
  })

  it('does NOT ship an enforcing Content-Security-Policy header', async () => {
    const rules = await nextConfig.headers!()
    const keys = rules[0].headers.map((h) => h.key)
    expect(keys).not.toContain('Content-Security-Policy')
  })
})
