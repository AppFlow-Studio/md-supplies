import { ROADMAP_CATEGORIES } from '@/lib/category-nav'

// Curated per-category imagery lives in one flat `categories/` folder on the
// md-supplies BunnyCDN storage zone (verified directly against the storage API):
// zone-root-relative `.jpeg` files named `${placeholderSlug}-placeholder.jpeg`.
// There is no separate banner set yet, so category/subcategory banners and the
// per-category product placeholder all resolve to the same file until dedicated
// banner photography is uploaded. lib/bunnycdn.ts turns `file` into a proxy path.

// Single source of truth for category hero banner assets.
// `file` is the BunnyCDN filename relative to the categories/ zone path.
// When Deepika delivers approved assets, update only the `file` value for each entry.
// `alt` is used in the <img> alt attribute — describes the category, not the image.

export type CategoryImageEntry = {
  /** Filename within the `categories/` folder on BunnyCDN storage. */
  file: string
  /** Descriptive alt text for the category hero/banner image. */
  alt: string
}

/** Used when a handle matches no roadmap category (or the category has no entry). */
export const CATEGORY_IMAGE_FALLBACK: CategoryImageEntry = {
  file: 'medical-supplies-placeholder.jpeg',
  alt: 'Assorted medical supplies',
}

/** Keyed by RoadmapCategory.placeholderSlug — kept in sync with the roadmap list. */
export const CATEGORY_IMAGE_CONFIG: Record<string, CategoryImageEntry> =
  Object.fromEntries(
    ROADMAP_CATEGORIES.map((category) => [
      category.placeholderSlug,
      {
        file: `${category.placeholderSlug}-placeholder.jpeg`,
        alt: `${category.displayName} medical supplies`,
      },
    ]),
  )
