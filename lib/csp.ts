export const CSP_REPORT_URI = '/api/csp-report'

/** Per-request nonce, matching the recipe in the Next.js CSP guide
 *  (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md)
 *  so Next's automatic nonce-extraction from the CSP header keeps working. */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

/** Builds the CSP header value. Used identically for both the enforcing
 *  and the parallel Report-Only header (M10) — Report-Only stays live
 *  alongside enforcing as an ongoing regression canary, not just during
 *  rollout: it reports violations independent of what enforcing already
 *  blocked, catching future policy drift before it'd need tightening. */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.shopify.com https://www.googletagmanager.com https://www.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://daebb2-76.myshopify.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
    "frame-src https://shopify.com https://checkout.shopify.com https://daebb2-76.myshopify.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `report-uri ${CSP_REPORT_URI}`,
  ].join('; ')
}
