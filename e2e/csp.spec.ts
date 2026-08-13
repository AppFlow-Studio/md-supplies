import { test, expect } from '@playwright/test'

/**
 * CSP regression guard.
 *
 * History: /blog and /blog/[handle] emitted exactly ONE script tag without the
 * request nonce. Under `strict-dynamic` the 'self' source is ignored entirely,
 * so a nonce-less same-origin script is blocked outright — which is what the
 * long-standing console error on those routes actually was. Cause: a client
 * component ("use client" + a server action) rendered inside a `loading.tsx`
 * Suspense fallback; Next emitted its chunk preload without stamping the nonce.
 *
 * These tests are deliberately structural rather than console-based. A console
 * assertion only fires when a violation happens to be reached at load; counting
 * nonce-less script tags catches the defect on every route, every time, and
 * fails with the offending src rather than a generic CSP string.
 */

const ROUTES = [
  '/',
  '/blog',
  '/blog/types-of-needles',
  '/faq',
  '/about',
  '/contact',
  '/partners',
  '/industries',
  '/cart',
  '/account',
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
for (const path of ROUTES) {
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

test('the enforcing CSP keeps strict-dynamic and never allows unsafe-inline for scripts', async ({ page }) => {
  const res = await page.goto('/blog/types-of-needles', { waitUntil: 'domcontentloaded' })
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

test('the response nonce matches the nonce rendered into the document', async ({ request }) => {
  // Must be ONE request: a fresh nonce is minted per request, so comparing a
  // header from one fetch against HTML from another always "fails".
  const res = await request.get('/blog/types-of-needles')
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
