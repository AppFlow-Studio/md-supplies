import { describe, it, expect } from 'vitest'
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
    expect(csp).toContain('https://daebb2-76.myshopify.com')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("base-uri 'self'")
  })
})
