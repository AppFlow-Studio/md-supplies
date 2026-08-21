import { SITE_ORIGIN, SITE_NAME } from '@/lib/site-config'

export { SITE_ORIGIN as SITE_URL, SITE_NAME }

/**
 * Default social card for any page that has no image of its own.
 *
 * Was `GLOBAL_PRODUCT_PLACEHOLDER` — the grey category placeholder photo, which
 * carried no branding and rendered as an anonymous stock image in every
 * LinkedIn/Slack/iMessage preview. Now a purpose-built 1200×630 card generated
 * by scripts/generate-brand-assets.mjs. Pages that DO supply their own image
 * (products, categories with artwork) are unaffected.
 */
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og/mdsupplies-og.png`

export const OG_IMAGE_WIDTH = 1200 as const
export const OG_IMAGE_HEIGHT = 630 as const

export const DEFAULT_TITLE = `${SITE_NAME} — Medical & Dental Supplies`

export const DEFAULT_DESCRIPTION =
  'Medical-grade supplies, delivered fast. Trusted by urgent care centers, HRT clinics, home health agencies, and first responders.'

/**
 * Homepage-specific title/description.
 *
 * Deliberately NOT folded into DEFAULT_TITLE/DEFAULT_DESCRIPTION: those two are
 * the sitewide FALLBACK for any category/product/industry page whose own title
 * or description is missing, so retargeting them at "medical supplies online"
 * would silently rewrite unrelated pages' SERP entries.
 *
 * Title is 58 chars — inside Google's ~60-char display budget, so it is not
 * truncated — and leads with the primary commercial phrase rather than the
 * brand. Description leads with the same phrase, names who the store serves,
 * and lists the highest-value departments. No delivery, pricing, or
 * certification claims: nothing here asserts anything the site cannot back up
 * (see lib/claims.ts).
 */
export const HOMEPAGE_TITLE = 'Medical Supplies Online | Healthcare Supplies | MDSupplies'

export const HOMEPAGE_DESCRIPTION =
  'Shop medical supplies online for clinics, facilities, pharmacies and home care. ' +
  'Browse wound care, gloves, syringes, testing and mobility supplies at MDSupplies.'

/** og:title for the homepage — shorter than the SERP title, which needs the extra qualifier. */
export const HOMEPAGE_OG_TITLE = 'Medical Supplies Online | MDSupplies'
