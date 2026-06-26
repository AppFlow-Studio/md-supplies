export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env.server')

    const { SHOPIFY_CUSTOMER_ACCOUNT_URL, SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID } =
      await import('./lib/site-config')

    if (!SHOPIFY_CUSTOMER_ACCOUNT_URL)
      throw new Error(
        '[env] Missing required server variable: SHOPIFY_CUSTOMER_ACCOUNT_URL. Check .env.local (dev) or your deployment environment (prod).'
      )
    if (!SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID)
      throw new Error(
        '[env] Missing required server variable: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID. Check .env.local (dev) or your deployment environment (prod).'
      )
  }
}
