/**
 * Which Shopify shop this build is permitted to reach.
 *
 * Every Storefront and Admin URL in the app is built from
 * `serverEnv.shopifyStoreDomain`, so gating that one getter gates the whole
 * surface: runtime, server actions, scripts, seeders and the CI build, which
 * prerenders ISR pages against live Shopify data.
 *
 * The QA branch must talk to the QA development store and nothing else. The
 * risk is not a typo, it is *inheritance*: CI and Vercel Preview read
 * repository-level and project-level environment variables that point at the
 * production store, so a QA build can silently acquire production credentials
 * without anyone choosing that. This guard turns that silent acquisition into
 * a loud, immediate failure.
 *
 * Reaching production is therefore opt-in and explicit: it requires setting
 * SHOPIFY_ALLOWED_SHOP_DOMAIN to the production host on purpose. Inheriting it
 * by accident always fails closed.
 *
 * Deliberately free of `server-only` so scripts, token utilities and tests can
 * apply the same rule. It holds no secrets, only hostnames and comparison.
 */

/** The live production storefront. Never a permitted target on this branch. */
export const PRODUCTION_SHOP_DOMAIN = 'daebb2-76.myshopify.com'

/** The QA development store this branch is built and tested against. */
export const QA_SHOP_DOMAIN = 'md-supplies-qa-shipping-and-checkout.myshopify.com'

export class ShopDomainNotAllowedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShopDomainNotAllowedError'
  }
}

/**
 * Reduce a configured value to a bare host so the comparison cannot be
 * sidestepped by presentation. A scheme, trailing slash, path, port, uppercase
 * or stray whitespace must not make the production host read as "not
 * production": `https://DAEBB2-76.myshopify.com/` and `daebb2-76.myshopify.com`
 * are the same shop and both must be rejected the same way.
 *
 * Returns '' for anything unusable, which callers treat as a failure rather
 * than as an empty allowance.
 */
export function normalizeShopDomain(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return ''
  let value = raw.trim().toLowerCase()
  if (!value) return ''
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '') // scheme
  value = value.replace(/^[^/@]*@/, '') // userinfo
  value = value.split(/[/?#]/)[0] // path, query, fragment
  value = value.replace(/:\d+$/, '') // port
  return value
}

/**
 * The single shop this build may reach. Defaults to the QA store, so an
 * environment that simply forgets to declare its target cannot fall through to
 * production.
 */
export function allowedShopDomain(): string {
  return normalizeShopDomain(process.env.SHOPIFY_ALLOWED_SHOP_DOMAIN) || QA_SHOP_DOMAIN
}

/**
 * Assert a shop host is the one this build may reach, and return it normalized
 * so callers build URLs from the checked value rather than the raw input.
 *
 * @param raw     the host to check, configured or reported by Shopify
 * @param source  where it came from, quoted in the error so a failure names
 *                the thing an operator has to go and change
 */
export function assertShopDomainAllowed(
  raw: string | null | undefined,
  source = 'SHOPIFY_STORE_DOMAIN',
): string {
  const allowed = allowedShopDomain()
  const domain = normalizeShopDomain(raw)

  if (!domain) {
    throw new ShopDomainNotAllowedError(
      `[shop-guard] ${source} is missing or unreadable. This build may only reach ${allowed}; ` +
        `refusing to continue without a verified shop host.`,
    )
  }

  // Checked before the production rule so a deliberate production build, which
  // must set SHOPIFY_ALLOWED_SHOP_DOMAIN on purpose, is still possible.
  if (domain === allowed) return domain

  if (domain === PRODUCTION_SHOP_DOMAIN) {
    throw new ShopDomainNotAllowedError(
      `[shop-guard] ${source} resolves to the PRODUCTION store (${PRODUCTION_SHOP_DOMAIN}), ` +
        `but this build may only reach ${allowed}. This is the CI/Preview inheritance case: ` +
        `the environment supplied production Shopify variables to a QA build. Point ${source} ` +
        `at the QA store rather than relaxing this guard.`,
    )
  }

  throw new ShopDomainNotAllowedError(
    `[shop-guard] ${source} resolves to ${domain}, but this build may only reach ${allowed}.`,
  )
}
