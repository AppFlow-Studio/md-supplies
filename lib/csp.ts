export const CSP_REPORT_URI = '/api/csp-report'

/** Per-request nonce, matching the recipe in the Next.js CSP guide
 *  (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md)
 *  so Next's automatic nonce-extraction from the CSP header keeps working. */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

// The allowed Shopify origin comes from the environment (QA vs production
// store), never a hardcoded domain: a deployment pointed at the QA store must
// not silently keep the production store reachable, and vice versa. No env ⇒
// no Shopify origin in the policy (deliberately no fallback).
function shopifyOrigin(): string {
  return process.env.SHOPIFY_STORE_DOMAIN ? ` https://${process.env.SHOPIFY_STORE_DOMAIN}` : ''
}

// Directives shared verbatim by the strict (nonce) and static policies — only
// script-src differs between them, so everything else is defined once here to
// guarantee the two policies can never drift on the non-script surface.
function sharedDirectives(): string[] {
  const shopify = shopifyOrigin()
  return [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.shopify.com https://www.googletagmanager.com https://www.google-analytics.com",
    "font-src 'self'",
    `connect-src 'self'${shopify} https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net`,
    `frame-src https://shopify.com https://checkout.shopify.com${shopify}`,
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `report-uri ${CSP_REPORT_URI}`,
  ]
}

/** STRICT per-request-nonce policy. Used for routes that must stay dynamically
 *  rendered anyway (session/PII pages like /account, and /search which reflects
 *  user query input) — see proxy.ts `isStrictCspPath`. Next.js auto-stamps this
 *  nonce onto the framework/chunk scripts it emits, by reading the CSP from the
 *  request header (proxy.ts sets it). Used identically for the enforcing and the
 *  parallel Report-Only header (M10 regression canary). */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval'" : ''}`,
    ...sharedDirectives(),
  ].join('; ')
}

/** STATIC policy for public, cacheable routes (category, product, marketing,
 *  etc.). It carries NO per-request nonce, so those routes can be statically
 *  generated / ISR'd and served from the CDN instead of re-rendering a function
 *  on every (mostly bot) hit — the whole point of this change. The cost is
 *  `'unsafe-inline'` for scripts (Next 16 emits ~21 per-page inline RSC flight
 *  scripts that a static config-level CSP cannot nonce/hash — see
 *  spike/csp-static findings). This weakens INLINE-script XSS protection only;
 *  external-script ('self'), object-src, base-uri and frame-ancestors are
 *  unchanged, and these pages render trusted Shopify data with no session or
 *  reflected user input. `experimental.sri` (next.config) adds integrity hashes
 *  to the external chunks as defense-in-depth. */
export function buildStaticCsp(isDev: boolean): string {
  return [
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval'" : ''}`,
    ...sharedDirectives(),
  ].join('; ')
}
