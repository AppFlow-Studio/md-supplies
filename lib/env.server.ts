import 'server-only'
import { assertShopDomainAllowed } from '@/lib/shopify/shop-guard'

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

// Lazy getters: each variable is validated on first property access at runtime,
// NOT at import time. This lets `next build` succeed with an empty env (CI runs
// the build without secrets) while still throwing a clear error if a required
// variable is actually needed to serve a request. Accessing a module that reads
// `serverEnv.shopifyStoreDomain` at request time will throw if it is unset.
export const serverEnv = {
  // Every Storefront and Admin URL is built from this value, so the shop guard
  // sits here rather than at each call site: one gate covers runtime, server
  // actions, scripts and the CI build. Returns the normalized host, so URLs are
  // built from the checked value rather than the raw input.
  get shopifyStoreDomain()     { return assertShopDomainAllowed(required('SHOPIFY_STORE_DOMAIN')) },
  get shopifyStorefrontToken() { return required('SHOPIFY_STOREFRONT_ACCESS_TOKEN') },
  // Admin API credential for the RX prescription gate ONLY (P0 launch-gate
  // ticket): writing/reading the compliance.rx_document / rx_verified
  // customer metafields server-side. Custom Admin app scoped to
  // read_customers + write_customers — nothing broader. (Custom admin apps
  // are allowed on Basic; the Plus-only limit is Functions in custom apps.)
  // This app issues short-lived tokens via the client_credentials grant
  // rather than a static shpat_ token, so the client id/secret pair — not an
  // access token — is what's configured; lib/shopify/admin-token.ts exchanges
  // and caches the actual token.
  get shopifyAdminClientId()     { return required('SHOPIFY_ADMIN_CLIENT_ID') },
  get shopifyAdminClientSecret() { return required('SHOPIFY_ADMIN_CLIENT_SECRET') },
  // HMAC secret for verifying Shopify webhooks (app/api/revalidate). For
  // admin-created webhooks this is the shared secret shown under
  // Settings → Notifications → Webhooks in the Shopify admin.
  get shopifyWebhookSecret()   { return required('SHOPIFY_WEBHOOK_SECRET') },
  get resendApiKey()           { return required('RESEND_API_KEY') },
  get resendFromEmail()        { return optional('RESEND_FROM_EMAIL', 'noreply@mdsupplies.com') },
  // IZ-COMMS-01: support@ is the only approved recipient. The default used to be
  // team@, which the plan forbids, so an unset RESEND_TO_EMAIL silently sent every
  // contact and sourcing submission to the wrong inbox.
  get resendToEmail()          { return optional('RESEND_TO_EMAIL', 'support@mdsupplies.com') },
  get bunnyCdnAccessKey()      { return required('BUNNYCDN_STORAGE_ACCESS_KEY') },
  get bunnyCdnHostname()       { return optional('BUNNYCDN_STORAGE_HOSTNAME', 'ny.storage.bunnycdn.com') },
  get bunnyCdnZone()           { return optional('BUNNYCDN_STORAGE_ZONE', 'md-supplies') },
}
