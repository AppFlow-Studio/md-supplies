import { SITE_URL } from './constants'
import type { CanonicalInput } from './types'

const TRACKING_PARAMS = new Set(['gclid', 'msclkid'])

function stripTrackingParams(path: string): string {
  const qIdx = path.indexOf('?')
  if (qIdx === -1) return path
  const base = path.slice(0, qIdx)
  const params = new URLSearchParams(path.slice(qIdx + 1))
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key) || key.startsWith('utm_')) {
      params.delete(key)
    }
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/**
 * Generates the canonical URL for a page.
 *
 * - `'self'` (default) — canonical points to the page itself, tracking params stripped.
 * - `'parent-unfiltered'` — strips query string / uses `basePath`; for paginated
 *   or filtered pages that should canonical to the unfiltered parent.
 * - `'base-product'` — variant URLs canonical to the base product URL via `basePath`.
 */
export function buildCanonical(input: CanonicalInput): string {
  const { path, strategy = 'self', basePath } = input

  switch (strategy) {
    case 'self':
      return `${SITE_URL}${stripTrackingParams(path)}`
    case 'parent-unfiltered':
      return `${SITE_URL}${basePath ?? path.split('?')[0]}`
    case 'base-product':
      return `${SITE_URL}${basePath ?? path}`
  }
}
