export type ProductTagRecord = { handle: string; tags: string[] }

export type BoundaryOverride = {
  subcategoryTag: string
  parentTag: string
  crossLinkTag: string
}

export type L1Config = {
  /** `category:` tag value, e.g. 'exam-room' — identity key, never title */
  tag: string
  /** Shopify collection handle backing the L1 page route */
  handle: string
  displayName: string
  navGroup: 'primary' | 'more'
  placeholderSlug: string
}

export type CategoryTreeData = {
  generatedAt: string
  totalProducts: number
  /** products with no category: tag at all (out-of-tree, ~68) */
  outOfTreeCount: number
  l1: { tag: string; productCount: number }[]
  /** every subcategory: value with per-parent co-occurrence counts */
  l2: { tag: string; parents: Record<string, number> }[]
  /** products carrying 2+ category: tags (for the override table) */
  multiCategoryProducts: { handle: string; categoryTags: string[] }[]
}

export type SubcategoryNode = {
  tag: string
  parentTag: string
  crossLinkTag?: string
  kind: 'category' | 'attribute'
  productCount: number
}
