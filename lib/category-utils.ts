import { cache } from 'react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
import { getAllowedHandles } from '@/lib/category-nav'

export const STOREFRONT_MAX_FIRST = 250

// Historical category page size. Category and industry routes now read their
// size from ?per_page= (lib/catalog/page-size.ts, default 20); this constant
// survives only for the e2e fixture helper that sizes its seed data.
export const CATEGORY_PAGE_SIZE = 9

/**
 * Absolute page ceiling for category/industry routes.
 *
 * This used to be `(250 - 1) / 9 = 27`, forced by the old fetch strategy asking
 * for every product up to the requested page in one `first:` argument. Cursor
 * paging removed that ceiling; what remains is the product index's own cap
 * (5,000 items — see lib/catalog/product-index.ts), which at the smallest
 * offered page size of 10 lands at page 500. A request beyond it is a crawler
 * or a hand-edited URL, and bounces to page 1 rather than walking the index
 * without limit.
 */
export const MAX_CATEGORY_PAGE = 500

// Same deterministic-page-N model as categories (DEV-LAUNCH-06): /search used
// to page via a Shopify cursor advanced through a "Load More" button, which
// never reflected a stable, deep-linkable, Back/Forward-safe URL the way
// category pagination does. Kept at the search page's original per-request
// size (12) rather than aligned to CATEGORY_PAGE_SIZE — no reason to change
// result density, just how paging through it works.
export const SEARCH_PAGE_SIZE = 12
export const MAX_SEARCH_PAGE = Math.floor((STOREFRONT_MAX_FIRST - 1) / SEARCH_PAGE_SIZE)

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

// Returns subcollections of a parent slug using the handle convention:
// /category/gloves → finds collections like gloves-nitrile, gloves-latex, etc.
export async function getSubcategories(
  parentSlug: string,
): Promise<{ label: string; slug: string }[]> {
  const all = await fetchAllCollections()
  const prefix = `${parentSlug}-`
  return all
    .filter((c) => c.handle.startsWith(prefix))
    .map((c) => ({ label: c.title, slug: c.handle.slice(prefix.length) }))
}

// Returns sibling subcollections of the current subcategory (same parent, different sub).
export async function getSiblingSubcategories(
  parentSlug: string,
  currentSubSlug: string,
): Promise<{ label: string; catSlug: string; subSlug: string }[]> {
  const all = await fetchAllCollections()
  const prefix = `${parentSlug}-`
  const self = `${parentSlug}-${currentSubSlug}`
  return all
    .filter((c) => c.handle.startsWith(prefix) && c.handle !== self)
    .map((c) => ({
      label: c.title,
      catSlug: parentSlug,
      subSlug: c.handle.slice(prefix.length),
    }))
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
