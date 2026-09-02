import 'server-only'

/**
 * TrustShop-specific structured logging. A dedicated module rather than an
 * extension of lib/log-error.ts: that helper's (context, err) shape has no
 * room for httpStatus/latencyMs/cacheStatus/retryCount without touching every
 * existing call site. The typed `event` param here is also what keeps a
 * caller from accidentally logging a bearer token, customer email,
 * md5_email, full review body, or raw Authorization header — those simply
 * aren't fields this function accepts.
 */

export type TrustShopOperation = 'summary' | 'reviews' | 'media' | 'submit' | 'product_exists'
export type TrustShopCacheStatus = 'hit' | 'miss' | 'stale' | 'bypass'

export interface TrustShopLogEvent {
  operation: TrustShopOperation
  shopifyProductId?: number
  httpStatus?: number
  providerErrorCode?: string
  latencyMs: number
  cacheStatus?: TrustShopCacheStatus
  retryCount?: number
  outcome: 'ok' | 'error'
}

export function logTrustShopEvent(event: TrustShopLogEvent): void {
  const payload = JSON.stringify({
    provider: 'trustshop',
    level: event.outcome === 'ok' ? 'info' : 'warn',
    ...event,
    ts: new Date().toISOString(),
  })
  if (event.outcome === 'error') {
    console.error(payload)
  } else {
    console.log(payload)
  }
}
