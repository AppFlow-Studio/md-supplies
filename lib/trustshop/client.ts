import 'server-only'
import type { ZodType } from 'zod'
import { serverEnv } from '@/lib/env.server'
import { logTrustShopEvent, type TrustShopOperation } from './observability'

/**
 * Centralized TrustShop transport: base URL + bearer auth (built here only —
 * never returned, logged, or handed to a caller), timeout, GET-only
 * retry/backoff for transient failures, and Zod response validation. POST
 * never retries — no idempotency-key contract is documented, and an
 * automatic retry could create a duplicate review — enforced by keeping
 * trustShopGet and trustShopPost as separate functions that share no retry
 * code path.
 */

export type TrustShopErrorKind =
  | 'config'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  | 'timeout'
  | 'validation'
  | 'unknown'

export class TrustShopError extends Error {
  readonly kind: TrustShopErrorKind
  readonly httpStatus?: number

  constructor(message: string, kind: TrustShopErrorKind, opts?: { httpStatus?: number }) {
    super(message)
    this.name = 'TrustShopError'
    this.kind = kind
    this.httpStatus = opts?.httpStatus
  }
}

const REQUEST_TIMEOUT_MS = 5000
const MAX_GET_RETRIES = 2
const RETRY_BASE_DELAY_MS = 250

function classifyStatus(status: number): TrustShopErrorKind {
  if (status === 401 || status === 403) return 'config'
  if (status === 404) return 'not_found'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server'
  return 'unknown'
}

function isRetryableGet(kind: TrustShopErrorKind): boolean {
  return kind === 'rate_limited' || kind === 'server' || kind === 'timeout'
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const base = serverEnv.trustShopApiBaseUrl.replace(/\/+$/, '')
  const url = new URL(`${base}/${path.replace(/^\/+/, '')}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${serverEnv.trustShopIntegrationKey}`,
    'Content-Type': 'application/json',
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
}

type AttemptResult<T> = { ok: true; data: T; httpStatus: number } | { ok: false; error: TrustShopError }

async function attemptGet<T>(
  url: string,
  next: { revalidate: number; tags: string[] } | undefined,
  schema: ZodType<T>,
): Promise<AttemptResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(next ? { next } : {}),
    } as RequestInit)
  } catch (err) {
    return {
      ok: false,
      error: new TrustShopError(
        isTimeout(err) ? 'TrustShop request timed out' : 'TrustShop network error',
        isTimeout(err) ? 'timeout' : 'unknown',
      ),
    }
  }

  if (!res.ok) {
    const kind = classifyStatus(res.status)
    return {
      ok: false,
      error: new TrustShopError(`TrustShop GET failed with ${res.status}`, kind, { httpStatus: res.status }),
    }
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, error: new TrustShopError('TrustShop returned malformed JSON', 'validation', { httpStatus: res.status }) }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return { ok: false, error: new TrustShopError('TrustShop response failed schema validation', 'validation', { httpStatus: res.status }) }
  }

  return { ok: true, data: parsed.data, httpStatus: res.status }
}

export async function trustShopGet<T>(
  path: string,
  opts: {
    operation: TrustShopOperation
    shopifyProductId?: number
    query?: Record<string, string | number | boolean | undefined>
    schema: ZodType<T>
    next?: { revalidate: number; tags: string[] }
  },
): Promise<T> {
  const url = buildUrl(path, opts.query)
  const startedAt = Date.now()
  let attempt = 0

  for (;;) {
    const result = await attemptGet(url, opts.next, opts.schema)

    if (result.ok) {
      logTrustShopEvent({
        operation: opts.operation,
        shopifyProductId: opts.shopifyProductId,
        httpStatus: result.httpStatus,
        latencyMs: Date.now() - startedAt,
        retryCount: attempt,
        outcome: 'ok',
      })
      return result.data
    }

    const canRetry = isRetryableGet(result.error.kind) && attempt < MAX_GET_RETRIES
    if (!canRetry) {
      logTrustShopEvent({
        operation: opts.operation,
        shopifyProductId: opts.shopifyProductId,
        httpStatus: result.error.httpStatus,
        providerErrorCode: result.error.kind,
        latencyMs: Date.now() - startedAt,
        retryCount: attempt,
        outcome: 'error',
      })
      throw result.error
    }

    await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt + Math.random() * 100)
    attempt += 1
  }
}

/**
 * A single attempt, always. No retry loop exists here at all — not "retry
 * disabled by a flag," there is simply no code path that calls fetch a
 * second time for a POST.
 */
export async function trustShopPost<T>(
  path: string,
  opts: {
    operation: TrustShopOperation
    shopifyProductId?: number
    body: unknown
    schema: ZodType<T>
  },
): Promise<T> {
  const url = buildUrl(path)
  const startedAt = Date.now()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(opts.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    const kind = isTimeout(err) ? 'timeout' : 'unknown'
    logTrustShopEvent({
      operation: opts.operation,
      shopifyProductId: opts.shopifyProductId,
      providerErrorCode: kind,
      latencyMs: Date.now() - startedAt,
      retryCount: 0,
      outcome: 'error',
    })
    throw new TrustShopError(isTimeout(err) ? 'TrustShop request timed out' : 'TrustShop network error', kind)
  }

  if (!res.ok) {
    const kind = classifyStatus(res.status)
    logTrustShopEvent({
      operation: opts.operation,
      shopifyProductId: opts.shopifyProductId,
      httpStatus: res.status,
      providerErrorCode: kind,
      latencyMs: Date.now() - startedAt,
      retryCount: 0,
      outcome: 'error',
    })
    throw new TrustShopError(`TrustShop POST failed with ${res.status}`, kind, { httpStatus: res.status })
  }

  // A 2xx with an unparsable/unexpected body still means TrustShop accepted
  // the write — never retried, and never reported to the caller as a
  // failure (that would risk a user resubmitting and creating a duplicate).
  let json: unknown = {}
  try {
    json = await res.json()
  } catch {
    // fall through with json = {}
  }
  const parsed = opts.schema.safeParse(json)

  logTrustShopEvent({
    operation: opts.operation,
    shopifyProductId: opts.shopifyProductId,
    httpStatus: res.status,
    latencyMs: Date.now() - startedAt,
    retryCount: 0,
    outcome: 'ok',
  })

  return parsed.success ? parsed.data : ({} as T)
}
