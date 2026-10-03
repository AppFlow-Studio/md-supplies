import {
  CATEGORY_TREE_L1,
  getCategorySlug,
  getFeaturedSubcategoryBySlug,
  getL1ByCollectionHandle,
  getShopifyHandle,
  type L2Node,
} from '@/lib/category-tree'
import { filterRegistry } from '@/lib/filter-registry'

/**
 * Which filter-registry entry a /category/<slug> collection page gates its
 * facets on.
 *
 * The registry is keyed on L1 slugs (plus the odd featured subcategory with
 * its own row, like Trocars). Two kinds of collection page have no row of
 * their own and used to fall back to DEFAULT_FACET_RULES (Price +
 * Availability only), hiding every metafield facet Shopify returned for them:
 *
 *  - the FLAT canonical of a duplicate subcategory (FIX-duplicate-category-
 *    urls: /category/sterilization/sterilization-pouches redirects to
 *    /category/sterilization-pouches). 84 of the 103 flat collections in the
 *    QA store lost Size / Needle Gauge / Material / … this way
 *    (scripts/audit-flat-subcategory-facets.ts);
 *  - a featured subcategory without its own row (e.g. Respiratory Testing).
 *
 * Both are children of an L1, and the nested subcategory route already gates
 * on the parent's key, so they inherit it. Only the ALLOWLIST is inherited —
 * a facet still renders only if Shopify actually returns it with non-zero
 * counts for this collection, so nothing here invents filter values.
 *
 * `l2Nodes` is null when the caller didn't (or couldn't) load the tag tree;
 * flat pages then keep the safe default.
 */
export function resolveCategoryFacetKey(slug: string, l2Nodes: readonly L2Node[] | null): string {
  if (filterRegistry[slug]) return slug

  const handle = getShopifyHandle(slug)
  if (getL1ByCollectionHandle(handle)) return slug

  const parentTag =
    getFeaturedSubcategoryBySlug(handle)?.parentTag ??
    l2Nodes?.find((node) => node.tag === handle)?.parentTag
  const parent = parentTag ? CATEGORY_TREE_L1.find((c) => c.tag === parentTag) : undefined
  return parent ? getCategorySlug(parent) : slug
}

/** True when resolving `slug` needs the L2 tag tree (so callers can skip the scan). */
export function facetKeyNeedsTagTree(slug: string): boolean {
  if (filterRegistry[slug]) return false
  const handle = getShopifyHandle(slug)
  return !getL1ByCollectionHandle(handle) && !getFeaturedSubcategoryBySlug(handle)
}
