import { SITE_URL } from './constants'
import type { CanonicalInput } from './types'

/**
 * Generates the canonical URL for a page.
 *
 * - `'self'` (default) — canonical points to the page itself.
 * - `'parent-unfiltered'` — strips query string / uses `basePath`; for paginated
 *   or filtered pages that should canonical to the unfiltered parent.
 * - `'base-product'` — variant URLs canonical to the base product URL via `basePath`.
 */
export function buildCanonical(input: CanonicalInput): string {
  const { path, strategy = 'self', basePath } = input

  switch (strategy) {
    case 'self':
      return `${SITE_URL}${path}`
    case 'parent-unfiltered':
      return `${SITE_URL}${basePath ?? path.split('?')[0]}`
    case 'base-product':
      return `${SITE_URL}${basePath ?? path}`
  }
}
