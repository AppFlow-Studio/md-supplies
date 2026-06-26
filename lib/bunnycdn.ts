import { ROADMAP_CATEGORIES } from '@/lib/category-nav'

// All BunnyCDN reads go through the same-origin proxy route (app/api/bunny/[...path]/route.ts)
// because the storage zone has no public Pull Zone — only the private Storage API, which
// requires an AccessKey header a plain <img>/next/image src can never send. The proxy keeps
// that key server-side and lets next/image treat these as ordinary local paths (no remotePatterns).
const PROXY_PREFIX = '/api/bunny'

// Zone-root-relative, .jpeg — matches the actual upload (verified directly against the
// storage API), not the §3.4 nested-namespace/.webp layout the plan assumed. The uploaded
// set is one flat folder of curated per-category images; there is no separate banner set
// yet, so category/subcategory banners and the product placeholder for a category all
// resolve to the same file until dedicated banner photography is uploaded.
const CATEGORIES_PATH = 'categories'

export const GLOBAL_PRODUCT_PLACEHOLDER = `${PROXY_PREFIX}/${CATEGORIES_PATH}/medical-supplies-placeholder.jpeg`

export const LOGO_PATH = `${PROXY_PREFIX}/logo/logo.avif`

function findRoadmapCategory(handle: string) {
  return ROADMAP_CATEGORIES.find((category) =>
    category.matchedHandles.some((h) => handle === h || handle.startsWith(`${h}-`)),
  )
}

function placeholderPathFor(handle: string): string {
  const category = findRoadmapCategory(handle)
  if (!category) return GLOBAL_PRODUCT_PLACEHOLDER
  return `${PROXY_PREFIX}/${CATEGORIES_PATH}/${category.placeholderSlug}-placeholder.jpeg`
}

export function getCategoryBannerPath(handle: string): string {
  return placeholderPathFor(handle)
}

export function getSubcategoryBannerPath(handle: string): string {
  return placeholderPathFor(handle)
}

export function getProductPlaceholderPath(categoryHandle?: string | null): string {
  if (!categoryHandle) return GLOBAL_PRODUCT_PLACEHOLDER
  return placeholderPathFor(categoryHandle)
}

const INDUSTRIES_PATH = 'industries'

export function getIndustryImagePath(filename: string): string {
  return `${PROXY_PREFIX}/${INDUSTRIES_PATH}/${filename}`
}
