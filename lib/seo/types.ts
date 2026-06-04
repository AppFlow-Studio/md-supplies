/** All supported page types for metadata generation. */
export type PageType =
  | 'homepage'
  | 'categories-hub'
  | 'category'
  | 'subcategory'
  | 'product'
  | 'partners'
  | 'partner-detail'
  | 'industry'
  | 'occ'
  | 'blog-hub'
  | 'blog-article'
  | 'utility'

export interface MetadataInput {
  pageType: PageType
  /** Primary page title (product name, category name, article title, etc.) */
  title?: string
  /** Page-specific description; falls back to the site default if omitted. */
  description?: string
  /** URL slug for this page (used to compute canonical + path). */
  slug?: string
  /** Slug of the parent category (subcategory pages only). */
  parentSlug?: string
  /** Absolute OG image URL; falls back to the default site-wide OG image. */
  image?: string
  /** Explicitly force noindex regardless of page type. */
  noIndex?: boolean
  /** Explicit canonical URL override — bypasses the slug-derived canonical. */
  canonical?: string
}

export type CanonicalStrategy = 'self' | 'parent-unfiltered' | 'base-product'

export interface CanonicalInput {
  /** Absolute path (e.g. `/category/gloves?page=2`). */
  path: string
  /** Defaults to `'self'`. */
  strategy?: CanonicalStrategy
  /** Required for `parent-unfiltered` and `base-product` strategies. */
  basePath?: string
}

export interface RobotsInput {
  pageType: PageType
  /** Overrides everything — returns `noindex,nofollow` for every page when true. */
  isStaging?: boolean
  /** Thin/unpopulated pages (e.g. an industry page with no products). */
  isThinContent?: boolean
  /** Explicit noindex override. */
  noIndex?: boolean
}
