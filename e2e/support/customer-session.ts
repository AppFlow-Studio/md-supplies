import { test as base } from '@playwright/test'

/**
 * Authenticated-route fixture. Injects a QA customer's Shopify Customer
 * Account session directly as cookies (SESSION_COOKIES in
 * lib/shopify/session.ts), bypassing the hosted OAuth UI Playwright cannot
 * drive non-interactively. Requires a real, currently-valid token obtained
 * once via manual login against the QA store — refresh it if tests start
 * failing with an auth redirect.
 *
 * Unset by default; every test using this fixture must skip with a reason
 * rather than silently pass against the redirect-to-login page.
 */
export const CUSTOMER_SESSION = {
  accessToken: process.env.E2E_CUSTOMER_ACCESS_TOKEN,
  refreshToken: process.env.E2E_CUSTOMER_REFRESH_TOKEN,
  expiresAt: process.env.E2E_CUSTOMER_EXPIRES_AT,
  orderNumber: process.env.E2E_ORDER_NUMBER,
}

export const hasCustomerSession = Boolean(
  CUSTOMER_SESSION.accessToken && CUSTOMER_SESSION.refreshToken && CUSTOMER_SESSION.expiresAt,
)

// Exact cookie names from lib/shopify/session.ts SESSION_COOKIES — must
// match precisely, this is what app/api/auth/refresh reads server-side.
const COOKIE_NAMES = {
  ACCESS_TOKEN: 'shopify_access_token',
  REFRESH_TOKEN: 'shopify_refresh_token',
  EXPIRES_AT: 'shopify_token_expires_at',
} as const

export const authenticatedTest = base.extend<{ authedPage: import('@playwright/test').Page }>({
  authedPage: async ({ page, baseURL }, use) => {
    if (hasCustomerSession) {
      const url = new URL(baseURL ?? 'http://localhost:3000')
      await page.context().addCookies([
        { name: COOKIE_NAMES.ACCESS_TOKEN, value: CUSTOMER_SESSION.accessToken!, domain: url.hostname, path: '/', httpOnly: true, secure: url.protocol === 'https:' },
        { name: COOKIE_NAMES.REFRESH_TOKEN, value: CUSTOMER_SESSION.refreshToken!, domain: url.hostname, path: '/', httpOnly: true, secure: url.protocol === 'https:' },
        { name: COOKIE_NAMES.EXPIRES_AT, value: CUSTOMER_SESSION.expiresAt!, domain: url.hostname, path: '/', httpOnly: true, secure: url.protocol === 'https:' },
      ])
    }
    // Playwright's fixture-callback parameter is idiomatically named `use`
    // (see the Playwright docs' own fixture examples), but this repo's
    // eslint-config-next core-web-vitals preset enables react-hooks/rules-of-
    // hooks globally, and that rule treats any call to a function whose name
    // starts with "use" as a React Hook invocation — a false positive here,
    // since this `use` is Playwright's fixture API, not a React hook, and
    // `authedPage` is a fixture initializer, not a component or custom hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})
