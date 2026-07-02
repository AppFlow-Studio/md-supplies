import { ROADMAP_CATEGORIES } from '@/lib/category-nav'
import { CATEGORY_IMAGE_CONFIG, CATEGORY_IMAGE_FALLBACK, type CategoryImageEntry } from '@/lib/category-images'

// All BunnyCDN reads go through the same-origin proxy route (app/api/bunny/[...path]/route.ts)
// because the storage zone has no public Pull Zone — only the private Storage API, which
// requires an AccessKey header a plain <img>/next/image src can never send. The proxy keeps
// that key server-side and lets next/image treat these as ordinary local paths (no remotePatterns).
const PROXY_PREFIX = '/api/bunny'

const CATEGORIES_PATH = 'categories'

export const GLOBAL_PRODUCT_PLACEHOLDER = `${PROXY_PREFIX}/${CATEGORIES_PATH}/${CATEGORY_IMAGE_FALLBACK.file}`

export const LOGO_PATH = `${PROXY_PREFIX}/logo/logo.avif`

function findRoadmapCategory(handle: string) {
  return ROADMAP_CATEGORIES.find((category) =>
    category.matchedHandles.some((h) => handle === h || handle.startsWith(`${h}-`)),
  )
}

function resolveEntry(handle: string): CategoryImageEntry {
  const category = findRoadmapCategory(handle)
  if (!category) return CATEGORY_IMAGE_FALLBACK
  return CATEGORY_IMAGE_CONFIG[category.placeholderSlug] ?? CATEGORY_IMAGE_FALLBACK
}

/** Returns the BunnyCDN proxy path and descriptive alt text for a category hero banner. */
export function getCategoryBannerConfig(handle: string): { path: string; alt: string } {
  const entry = resolveEntry(handle)
  return {
    path: `${PROXY_PREFIX}/${CATEGORIES_PATH}/${entry.file}`,
    alt:  entry.alt,
  }
}

/** @deprecated Use getCategoryBannerConfig instead */
export function getCategoryBannerPath(handle: string): string {
  return getCategoryBannerConfig(handle).path
}

export function getSubcategoryBannerPath(handle: string): string {
  return getCategoryBannerConfig(handle).path
}

export function getProductPlaceholderPath(categoryHandle?: string | null): string {
  if (!categoryHandle) return GLOBAL_PRODUCT_PLACEHOLDER
  return getCategoryBannerConfig(categoryHandle).path
}

const INDUSTRIES_PATH = 'industries'

export function getIndustryImagePath(filename: string): string {
  return `${PROXY_PREFIX}/${INDUSTRIES_PATH}/${filename}`
}
