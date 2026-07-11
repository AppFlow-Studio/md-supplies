export const SITE_NAME = 'MDSupplies' as const

export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
).replace(/\/$/, '')

/**
 * Staging status (audit H5/M11). Derived from Vercel's automatic VERCEL_ENV
 * so every preview/branch deploy ships noindex WITHOUT anyone remembering to
 * set a flag. NEXT_PUBLIC_IS_STAGING remains a manual override, both ways:
 *
 *   'true'   → force staging (e.g. a production-slot Vercel deploy that is
 *              not yet the live site — pre-domain-cutover).
 *   'false'  → force live.
 *   unset    → staging iff running on Vercel outside the production env;
 *              local dev (no VERCEL_ENV) is not staging.
 */
export const IS_STAGING = (() => {
  const manual = process.env.NEXT_PUBLIC_IS_STAGING
  if (manual === 'true') return true
  if (manual === 'false') return false
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV
  return vercelEnv != null && vercelEnv !== 'production'
})()

/**
 * Base-URL guard (audit H4/C1): a real production deployment must use an
 * allowlisted origin. C1 shipped because a dev ngrok tunnel sat in
 * NEXT_PUBLIC_SITE_URL and nothing in build, types, or tests objected —
 * every canonical, og:url, sitemap entry, and JSON-LD URL resolved to it.
 * This throws at build time (module scope, imported by every page), so a
 * bad value can never reach production again. Dev tunnels and *.vercel.app
 * hosts are rejected by not being on the allowlist.
 */
const PRODUCTION_ALLOWED_ORIGINS = [
  'https://mdsupplies.com',
  'https://www.mdsupplies.com',
]

if (
  process.env.VERCEL_ENV === 'production' &&
  !IS_STAGING &&
  !PRODUCTION_ALLOWED_ORIGINS.includes(SITE_ORIGIN)
) {
  throw new Error(
    `[site-config] NEXT_PUBLIC_SITE_URL resolves to "${SITE_ORIGIN}" on a production deployment. ` +
      `Allowed production origins: ${PRODUCTION_ALLOWED_ORIGINS.join(', ')}. ` +
      `Fix the Vercel environment variable — or, if this deployment is intentionally ` +
      `not the live site, set NEXT_PUBLIC_IS_STAGING=true.`,
  )
}

export const SHOPIFY_CUSTOMER_ACCOUNT_URL =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL ?? ''

export const SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID ?? ''
