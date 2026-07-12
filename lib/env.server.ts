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

// Lazy getters: each variable is validated on first property access at runtime,
// NOT at import time. This lets `next build` succeed with an empty env (CI runs
// the build without secrets) while still throwing a clear error if a required
// variable is actually needed to serve a request. Accessing a module that reads
// `serverEnv.shopifyStoreDomain` at request time will throw if it is unset.
export const serverEnv = {
  get shopifyStoreDomain()     { return required('SHOPIFY_STORE_DOMAIN') },
  get shopifyStorefrontToken() { return required('SHOPIFY_STOREFRONT_ACCESS_TOKEN') },
  // No Admin API credential: the app is Storefront-read-only by design. If a
  // scoped, read-only Admin need ever becomes real, add a narrowly-scoped
  // token here — never a full read/write one.
  // HMAC secret for verifying Shopify webhooks (app/api/revalidate). For
  // admin-created webhooks this is the shared secret shown under
  // Settings → Notifications → Webhooks in the Shopify admin.
  get shopifyWebhookSecret()   { return required('SHOPIFY_WEBHOOK_SECRET') },
  get resendApiKey()           { return required('RESEND_API_KEY') },
  get resendFromEmail()        { return optional('RESEND_FROM_EMAIL', 'noreply@mdsupplies.com') },
  get resendToEmail()          { return optional('RESEND_TO_EMAIL', 'team@mdsupplies.com') },
  get bunnyCdnAccessKey()      { return required('BUNNYCDN_STORAGE_ACCESS_KEY') },
  get bunnyCdnHostname()       { return optional('BUNNYCDN_STORAGE_HOSTNAME', 'ny.storage.bunnycdn.com') },
  get bunnyCdnZone()           { return optional('BUNNYCDN_STORAGE_ZONE', 'md-supplies') },
}
