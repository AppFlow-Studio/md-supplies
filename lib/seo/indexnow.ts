import 'server-only'
import { logServerError } from '@/lib/log-error'
import { SITE_URL } from './constants'

// IndexNow (master plan §20, P1-07): tells Bing/participating search
// engines about a materially changed URL immediately instead of waiting for
// their next scheduled crawl. The key is NOT a secret — the protocol's own
// verification step requires it to be publicly fetchable at
// https://<host>/<key>.txt (see public/<key>.txt, committed alongside this
// file), so it is a plain source constant, not a deployment secret.
export const INDEXNOW_KEY = '6ab0ab204d6626dd77238e2dd79d0bdd233b45554444839e9db394a15eb1eb40'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/**
 * Best-effort, non-blocking IndexNow submission for one URL. Never throws —
 * a failed ping must not break the caller (the Shopify revalidate webhook,
 * which needs to keep responding promptly regardless of IndexNow's
 * availability). Failures are logged via the existing structured
 * server-error logger, without ever including the key itself.
 */
export async function submitUrlToIndexNow(url: string): Promise<void> {
  const host = new URL(SITE_URL).host
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    })
    if (!res.ok) {
      logServerError('indexnow-submit', new Error(`IndexNow responded ${res.status} for ${url}`))
    }
  } catch (err) {
    logServerError('indexnow-submit', err)
  }
}
