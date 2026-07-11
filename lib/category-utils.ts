import { cache } from 'react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
import { getAllowedHandles } from '@/lib/category-nav'

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
