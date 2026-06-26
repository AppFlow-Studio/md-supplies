import { GLOBAL_PRODUCT_PLACEHOLDER } from '@/lib/bunnycdn'
import { SITE_ORIGIN, SITE_NAME } from '@/lib/site-config'

export { SITE_ORIGIN as SITE_URL, SITE_NAME }

export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}${GLOBAL_PRODUCT_PLACEHOLDER}`

export const OG_IMAGE_WIDTH = 1200 as const
export const OG_IMAGE_HEIGHT = 630 as const

export const DEFAULT_TITLE = `${SITE_NAME} — Medical & Dental Supplies`

export const DEFAULT_DESCRIPTION =
  'Medical-grade supplies at wholesale prices. Trusted by urgent care centers, HRT clinics, home health agencies, and first responders.'
