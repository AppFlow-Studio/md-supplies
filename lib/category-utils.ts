import { cache } from 'react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
import { getAllowedHandles } from '@/lib/category-nav'
import {
  getL1ByHandle,
  getL1ByTag,
  getSubcategoriesOf,
  getCrossLinkedInto,
  subcategoryTitle,
} from '@/lib/category-tree'

// Page size and the Storefront API `first` argument ceiling (250) that bounds
// how deep deterministic category pagination can go before falling back to
// page 1 instead of requesting more items than Shopify allows in one query.
export const CATEGORY_PAGE_SIZE = 9
const STOREFRONT_MAX_FIRST = 250
export const MAX_CATEGORY_PAGE = Math.floor((STOREFRONT_MAX_FIRST - 1) / CATEGORY_PAGE_SIZE)

type SlimCollection = { handle: string; title: string }

const fetchAllCollections = cache(async (): Promise<SlimCollection[]> => {
  try {
    const data = await storefrontFetch<{ collections: { nodes: SlimCollection[] } }>(
      GET_COLLECTIONS,
      { first: 250 },
      { next: { revalidate: 3600, tags: ['shopify', 'collections'] } },
    )
    return data.collections.nodes
  } catch {
    return []
  }
})

// Subcategories of an L1 come from the tag-backbone registry (category
// kind only — attribute values render as facets, never tiles/routes). The
// live collection list just gates which subs have a browsable collection
// page today, matched on handle (convention `<parent>-<sub>`, bare `<sub>`
// fallback) — never on title.
export async function getSubcategories(
  parentSlug: string,
): Promise<{ label: string; slug: string }[]> {
  const l1 = getL1ByHandle(parentSlug)
  if (!l1) return []
  const all = await fetchAllCollections()
  const liveHandles = new Set(all.map((c) => c.handle))
  return getSubcategoriesOf(l1.tag)
    .filter((s) => liveHandles.has(`${parentSlug}-${s.tag}`) || liveHandles.has(s.tag))
    .map((s) => ({ label: subcategoryTitle(s.tag), slug: s.tag }))
}

// Returns sibling subcategories of the current subcategory (same parent, different sub).
export async function getSiblingSubcategories(
  parentSlug: string,
  currentSubSlug: string,
): Promise<{ label: string; catSlug: string; subSlug: string }[]> {
  const subs = await getSubcategories(parentSlug)
  return subs
    .filter((s) => s.slug !== currentSubSlug)
    .map((s) => ({ label: s.label, catSlug: parentSlug, subSlug: s.slug }))
}

/**
 * Boundary subcategories canonically owned by ANOTHER L1 but cross-linked
 * into this one (3 hardcoded splits) — links point at the ONE canonical URL
 * under the owning parent, so no duplicate-content twins.
 */
export function getCrossLinkedSubcategories(
  parentSlug: string,
): { label: string; catSlug: string; subSlug: string }[] {
  const l1 = getL1ByHandle(parentSlug)
  if (!l1) return []
  return getCrossLinkedInto(l1.tag).flatMap((s) => {
    const owner = getL1ByTag(s.parentTag)
    return owner ? [{ label: subcategoryTitle(s.tag), catSlug: owner.handle, subSlug: s.tag }] : []
  })
}

// Returns up to 6 other collections that are not the current page or its subcategories.
export async function getRelatedCategories(
  excludeSlug: string,
): Promise<{ label: string; slug: string }[]> {
  const all = await fetchAllCollections()
  const allowed = getAllowedHandles()
  return all
    .filter(
      (c) =>
        c.handle !== excludeSlug &&
        !c.handle.startsWith(`${excludeSlug}-`) &&
        !EXCLUDED_COLLECTION_HANDLES.has(c.handle) &&
        allowed.has(c.handle),
    )
    .slice(0, 6)
    .map((c) => ({ label: c.title, slug: c.handle }))
}

/**
 * Picks the product's primary category for breadcrumbs (audit L12): the first
 * of its collections that is an approved, navigable category (in the roadmap
 * allowlist and not excluded), falling back to the first non-excluded
 * collection, else null (caller keeps its generic "Shop" crumb).
 */
export function getPrimaryCollection(
  collections: { handle: string; title: string }[],
): { handle: string; title: string } | null {
  const allowed = getAllowedHandles()
  const navigable = collections.filter((c) => !EXCLUDED_COLLECTION_HANDLES.has(c.handle))
  return navigable.find((c) => allowed.has(c.handle)) ?? navigable[0] ?? null
}
