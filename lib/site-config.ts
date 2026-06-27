export const SITE_NAME = 'MDSupplies' as const

export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
).replace(/\/$/, '')

export const SHOPIFY_CUSTOMER_ACCOUNT_URL =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL ?? ''

export const SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID ?? ''
