import { test, expect } from '@playwright/test'

/**
 * CSP regression guard.
 *
 * Two policies are in play (lib/csp.ts, proxy.ts isStrictCspPath):
 *  - STRICT_ROUTES (/account, /search) get a per-request nonce + 'strict-dynamic'.
 *    Every script on these routes must carry that request's nonce, or the
 *    browser blocks it outright.
 *  - STATIC_ROUTES (everything else) get a static policy with 'unsafe-inline'
 *    for script-src and carry no nonce at all — that's intentional, not a gap.
 *
 * History #1: /blog and /blog/[handle] (back when every route was on the
 * strict policy) emitted exactly ONE script tag without the request nonce —
 * a client component rendered inside a loading.tsx Suspense fallback whose
 * chunk preload Next didn't stamp. Public routes moved to the static
 * 'unsafe-inline' policy since (so they can be statically generated / CDN
 * cached), which is why this file no longer expects a nonce on them.
 *
 * History #2 (2026-09-20, QA report from Bilal): /account shipped ~15
 * framework/runtime script chunks (Header, Footer, cart, the React/webpack
 * runtime itself) with no nonce — most of the page's client-side
 * interactivity was silently blocked, not just the prescription-upload
 * button Bilal noticed first. Root cause: Cache Components prerenders a
 * static PPR shell, and per Next's own CSP guide, nonce-based CSP is
 * incompatible with a static shell (its scripts are baked before any request
 * exists to mint a nonce into). Fixed by giving /account and /search their
 * own root layout (app/(protected)/layout.tsx — see its doc comment) forced
 * fully dynamic via Next's documented "opting out of the static shell"
 * pattern, so nothing on those routes can be prerendered nonce-less.
 *
 * These tests are deliberately structural rather than console-based. A console
 * assertion only fires when a violation happens to be reached at load; counting
 * nonce-less script tags catches the defect on every route, every time, and
 * fails with the offending src rather than a generic CSP string.
 */

const STRICT_ROUTES = ['/account', '/search'] as const

const STATIC_ROUTES = [
  '/',
  '/blog',
  '/blog/types-of-needles',
  '/faq',
  '/about',
  '/contact',
  '/partners',
  '/industries',
  '/cart',
] as const

/**
 * Assert against the RAW SERVER HTML, never the live DOM.
 *
 * Browsers deliberately blank the `nonce` content attribute once an element is
 * parsed (the value survives only on the `.nonce` IDL property), specifically
 * to stop CSS attribute selectors exfiltrating it. So a DOM-side
 * `getAttribute('nonce')` check reports every nonce'd script as a violation —
 * it measures the redaction, not the defect. The bytes the server sent are
 * what CSP is enforced against, so that is what we inspect.
 */
for (const path of STRICT_ROUTES) {
  test(`${path} emits no script tag without the CSP nonce`, async ({ request }) => {
    const res = await request.get(path)
    expect(res.status(), `${path} did not load`).toBeLessThan(400)
    const html = await res.text()

    const offenders = (html.match(/<script\b[^>]*>/gi) ?? [])
      .filter((tag) => !/\snonce=/i.test(tag))
      .map((tag) => /\ssrc="([^"]+)"/i.exec(tag)?.[1] ?? '[inline]')

    expect(offenders, `${path}: script(s) without a nonce would be blocked by strict-dynamic`).toEqual([])
  })
}

for (const path of STRICT_ROUTES) {
  test(`the enforcing CSP on ${path} keeps strict-dynamic and never allows unsafe-inline for scripts`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    const csp = res?.headers()['content-security-policy'] ?? ''

    expect(csp, 'no enforcing CSP header').toContain('script-src')
    expect(csp).toContain("'strict-dynamic'")

    // Guard the shortcut fixes explicitly: the defect above must never be
    // "resolved" by loosening script-src.
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? ''
    expect(scriptSrc, "script-src must not allow 'unsafe-inline'").not.toContain("'unsafe-inline'")
    expect(scriptSrc, "script-src must not allow 'unsafe-eval' in production").not.toContain("'unsafe-eval'")
    expect(csp, 'object-src must stay locked down').toContain("object-src 'none'")
  })

  test(`the response nonce on ${path} matches the nonce rendered into the document`, async ({ request }) => {
    // Must be ONE request: a fresh nonce is minted per request, so comparing a
    // header from one fetch against HTML from another always "fails".
    const res = await request.get(path)
    const csp = res.headers()['content-security-policy'] ?? ''
    const headerNonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp)?.[1]
    expect(headerNonce, 'no nonce in the CSP header').toBeTruthy()

    const html = await res.text()
    const htmlNonces = Array.from(
      new Set(Array.from(html.matchAll(/\snonce="([^"]+)"/gi), (m) => m[1])),
    )

    // Exactly one nonce per document, and it must be the one being enforced — a
    // second value would mean some scripts are checked against a nonce the
    // browser will never accept.
    expect(htmlNonces).toEqual([headerNonce])
  })
}

for (const path of STATIC_ROUTES) {
  test(`${path} uses the static CSP (no nonce, no strict-dynamic)`, async ({ request }) => {
    const res = await request.get(path)
    expect(res.status(), `${path} did not load`).toBeLessThan(400)
    const csp = res.headers()['content-security-policy'] ?? ''

    expect(csp, 'no enforcing CSP header').toContain('script-src')
    expect(csp).not.toContain("'strict-dynamic'")
    expect(csp).not.toMatch(/'nonce-/)
    expect(csp, 'object-src must stay locked down').toContain("object-src 'none'")
  })
}
