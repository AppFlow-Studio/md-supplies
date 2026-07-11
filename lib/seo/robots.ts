import type { PageType, RobotsInput } from './types'
import { IS_STAGING } from '@/lib/site-config'

/**
 * True when the site is running in staging mode.
 * Consumed by Track A (A4) for sitemap / robots.txt generation.
 * Derived in lib/site-config.ts: VERCEL_ENV !== 'production' means staging
 * automatically (M11); NEXT_PUBLIC_IS_STAGING is the manual override.
 */
export const STAGING_GUARD = IS_STAGING

const UTILITY_TYPES = new Set<PageType>(['utility'])

/**
 * Returns the correct robots meta directive for a page.
 *
 * Priority order:
 * 1. Staging guard — `noindex,nofollow` for every page.
 * 2. Explicit `noIndex` or utility page type — `noindex,follow`.
 * 3. Thin content — `noindex,follow`.
 * 4. All other public pages — `index,follow`.
 */
export function buildRobots(input: RobotsInput): string {
  const {
    pageType,
    isStaging = STAGING_GUARD,
    isThinContent = false,
    noIndex = false,
  } = input

  if (isStaging) return 'noindex,nofollow'
  if (noIndex || UTILITY_TYPES.has(pageType)) return 'noindex,follow'
  if (isThinContent) return 'noindex,follow'
  return 'index,follow'
}
