import { ROADMAP_CATEGORIES } from '@/lib/category-nav'
import {
  CATEGORY_IMAGE_CONFIG,
  CATEGORY_IMAGE_FALLBACK,
  DEFAULT_HERO_FOCAL,
  type CategoryImageEntry,
} from '@/lib/category-images'

// All BunnyCDN reads go through the same-origin proxy route (app/api/bunny/[...path]/route.ts)
// because the storage zone has no public Pull Zone — only the private Storage API, which
// requires an AccessKey header a plain <img>/next/image src can never send. The proxy keeps
// that key server-side and lets next/image treat these as ordinary local paths (no remotePatterns).
const PROXY_PREFIX = '/api/bunny'

const CATEGORIES_PATH = 'categories'

export const GLOBAL_PRODUCT_PLACEHOLDER = `${PROXY_PREFIX}/${CATEGORIES_PATH}/${CATEGORY_IMAGE_FALLBACK.file}`

/**
 * Site logo — served from the bundled asset in `public/images`, NOT from the
 * BunnyCDN proxy.
 *
 * The logo is brand-critical chrome on every page: it must not depend on a
 * third-party storage credential. On 2026-08-02 every Bunny request returned
 * 401 Unauthorized (invalid storage AccessKey), and because the proxy mapped
 * every upstream failure to 404 the logo simply rendered broken sitewide. The
 * identical file already existed at public/images/logo.png, so serving it
 * locally removes the dependency entirely.
 */
export const LOGO_PATH = '/images/logo.png'

function findRoadmapCategory(handle: string) {
  return ROADMAP_CATEGORIES.find((category) =>
    category.matchedHandles.some((h) => handle === h || handle.startsWith(`${h}-`)),
  )
}

function resolveEntry(handle: string): CategoryImageEntry {
  // An exact per-handle entry wins over the roadmap lookup. Without this a
  // handle can only inherit its roadmap category's artwork AND its alt text,
  // so /category/trocars-trocar-kits (which shares the Surgery & Procedure
  // image file on purpose) could not carry its own truthful alt text —
  // findRoadmapCategory matches it to Surgery & Procedure by design.
  const direct = CATEGORY_IMAGE_CONFIG[handle]
  if (direct) return direct

  const category = findRoadmapCategory(handle)
  if (!category) return CATEGORY_IMAGE_FALLBACK
  return CATEGORY_IMAGE_CONFIG[category.placeholderSlug] ?? CATEGORY_IMAGE_FALLBACK
}

/** Returns the BunnyCDN proxy path and descriptive alt text for a category hero banner. */
export function getCategoryBannerConfig(
  handle: string,
): { path: string; alt: string; focalPosition: string } {
  const entry = resolveEntry(handle)
  return {
    path: `${PROXY_PREFIX}/${CATEGORIES_PATH}/${entry.file}`,
    alt:  entry.alt,
    focalPosition: entry.focalPosition ?? DEFAULT_HERO_FOCAL,
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

const BLOGS_PATH = 'blogs'

export function getBlogImagePath(filename: string): string {
  return `${PROXY_PREFIX}/${BLOGS_PATH}/${filename}`
}
