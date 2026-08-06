import 'server-only'
import { serverEnv } from '@/lib/env.server'

// Re-exchanged this many seconds before Shopify's own expiry, so a request
// already in flight when the token turns over never gets one that expires
// mid-request.
const EXPIRY_SAFETY_MARGIN_SECONDS = 60

type CachedToken = { accessToken: string; expiresAt: number }

let cached: CachedToken | null = null
let inFlight: Promise<string> | null = null

async function exchangeClientCredentials(): Promise<CachedToken> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: serverEnv.shopifyAdminClientId,
    client_secret: serverEnv.shopifyAdminClientSecret,
  })
  const res = await fetch(`https://${serverEnv.shopifyStoreDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `[admin-token] client_credentials exchange failed: HTTP ${res.status} ${res.statusText} ${text.slice(0, 300)}`,
    )
  }
  const json: { access_token: string; expires_in: number } = await res.json()
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(0, json.expires_in - EXPIRY_SAFETY_MARGIN_SECONDS) * 1000,
  }
}

/**
 * A live Admin API access token, exchanged (and re-exchanged) via the
 * client_credentials grant as needed. The QA custom app issues short-lived
 * tokens (~24h) rather than a static shpat_ credential, so this fetches on
 * demand and caches for the process instead of reading a static env var.
 *
 * Concurrent callers during a refresh share one in-flight exchange. A failed
 * exchange is never cached, so a transient error is recoverable on retry.
 */
export async function getAdminAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken
  inFlight ??= exchangeClientCredentials()
    .then((token) => {
      cached = token
      inFlight = null
      return token.accessToken
    })
    .catch((err) => {
      inFlight = null
      throw err
    })
  return inFlight
}

/** Test-only: clears the cached/in-flight token so tests don't leak state. */
export function __resetAdminTokenCacheForTests(): void {
  cached = null
  inFlight = null
}
