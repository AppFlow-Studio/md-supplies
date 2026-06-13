import { cache } from 'react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'

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
  return all
    .filter(
      (c) => c.handle !== excludeSlug && !c.handle.startsWith(`${excludeSlug}-`),
    )
    .slice(0, 6)
    .map((c) => ({ label: c.title, slug: c.handle }))
}
