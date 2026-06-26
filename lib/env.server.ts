import 'server-only'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(
    `[env] Missing required server variable: ${name}. Check .env.local (dev) or your deployment environment (prod).`
  )
  return v
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback
}

export const serverEnv = {
  shopifyStoreDomain:     required('SHOPIFY_STORE_DOMAIN'),
  shopifyStorefrontToken: required('SHOPIFY_STOREFRONT_ACCESS_TOKEN'),
  shopifyAdminToken:      required('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  resendApiKey:           required('RESEND_API_KEY'),
  resendFromEmail:        optional('RESEND_FROM_EMAIL', 'noreply@mdsupplies.com'),
  resendToEmail:          optional('RESEND_TO_EMAIL', 'team@mdsupplies.com'),
  bunnyCdnAccessKey:      required('BUNNYCDN_STORAGE_ACCESS_KEY'),
  bunnyCdnHostname:       optional('BUNNYCDN_STORAGE_HOSTNAME', 'ny.storage.bunnycdn.com'),
  bunnyCdnZone:           optional('BUNNYCDN_STORAGE_ZONE', 'md-supplies'),
} as const
