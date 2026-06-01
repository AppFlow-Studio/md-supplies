export const SITE_NAME = 'MDSupplies' as const

/** Base URL — configure via NEXT_PUBLIC_SITE_URL; trailing slash stripped. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
).replace(/\/$/, '')

/** Fallback OG image used when a page supplies no page-specific image. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`

export const OG_IMAGE_WIDTH = 1200 as const
export const OG_IMAGE_HEIGHT = 630 as const

export const DEFAULT_TITLE = `${SITE_NAME} — Medical & Dental Supplies`

export const DEFAULT_DESCRIPTION =
  'Medical-grade supplies at wholesale prices. Trusted by urgent care centers, HRT clinics, home health agencies, and first responders.'
