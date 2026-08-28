// Exact facet counts for search-sourced product sets.
//
// Why this exists: on `Query.search`, the `count` Shopify puts on each
// `productFilters` value is not the number of products the value matches. It
// is derived from a window over the result set and moves with `first`.
// Measured live on 2026-08-26 against
// `tag:"category:home-care" AND tag:"subcategory:bedside-commodes"` (32
// products):
//
//   first: 1   -> Bedside Commodes 17
//   first: 20  -> Bedside Commodes 24
//   first: 250 -> Bedside Commodes 17
//   truth      -> Bedside Commodes 32
//
// and on Home Care -> Shower Commodes (10 products): "Shower Commode" counted
// 2 but matched 5, "Shower Commodes" counted 2 but matched 4 — the reported
// "shows 1, returns more when clicked" defect. Room Furniture's "Bed" counted
// 221 against a true 304. Collection-sourced routes are unaffected:
// `Collection.products.filters` counts are exact (spot-checked against a full
// walk on all the Home Care values involved).
//
// The fix is to ask the API the question we actually want answered — "how many
// products match this scope AND this value" — once per value, batched into a
// single aliased operation so it costs one request rather than N. The number
// beside a value is then, by construction, the number of products clicking it
// returns.

import { storefrontFetch } from '@/lib/shopify/storefront'
import { buildSearchFacetCountsQuery } from '@/lib/shopify/queries/products'
import { expandFilterInput, expandFilterInputs } from '@/lib/catalog/facet-canonicalization'
import { logServerError } from '@/lib/log-error'
import type { CollectionFilter } from '@/lib/shopify/types'

/**
 * Above this many values across the whole rail, the batch is not worth the
 * round-trip budget and Shopify's own (approximate) counts are kept instead.
 *
 * The widest search-sourced route on the live catalogue is Apparel at 86
 * values, which answered in ~1.7s as one request; the typical L2 subcategory
 * page needs ~10. 120 leaves headroom for catalogue growth while keeping a
 * pathological route from turning one page render into a fan-out.
 */
export const MAX_EXACT_COUNT_VALUES = 120

/** Aliases per Storefront operation. 86 in one request is proven to work; 40
 *  keeps each operation small enough to stay well inside the API's query-cost
 *  budget, and the chunks run concurrently so wall time barely moves. */
const CHUNK_SIZE = 40

/** `filter.p.m.custom.brand_name` -> `brand_name`; null for non-metafield facets. */
function metafieldKeyFromFacetId(facetId: string): string | null {
  const match = /^filter\.[pv]\.m\.custom\.(.+)$/.exec(facetId)
  return match ? match[1] : null
}

/** True when this active filter string selects a value from `facet`'s group. */
function belongsToFacet(input: string, facet: CollectionFilter): boolean {
  const key = metafieldKeyFromFacetId(facet.id)
  if (!key) return false
  try {
    const parsed = JSON.parse(input) as Record<string, unknown>
    const mf = (parsed.productMetafield ?? parsed.variantMetafield) as { key?: unknown } | undefined
    return typeof mf?.key === 'string' && mf.key === key
  } catch {
    return false
  }
}

type CountRequest = { facetIndex: number; valueIndex: number; filters: Record<string, unknown>[] }

/**
 * Replaces every LIST facet value's count with the exact number of products
 * matching `searchQuery` AND that value AND the selections active in OTHER
 * facet groups.
 *
 * That is the conventional faceted-search definition, and it makes the first
 * click on any value land on exactly the advertised number. Selections within
 * the SAME group are excluded from a value's own count on purpose: those are
 * ORed by the Storefront API, so including them would report the union rather
 * than what the value itself contributes.
 *
 * PRICE_RANGE groups are returned untouched — their single value carries
 * bounds, not a count.
 *
 * Fails soft. A Storefront error here degrades to Shopify's own counts (what
 * shipped before this module) rather than taking the category page down with
 * it; the failure is logged with its scope.
 */
export async function applyExactFacetCounts(
  searchQuery: string,
  facets: CollectionFilter[],
  activeFilterInputs: readonly string[],
  cacheTags: string[],
): Promise<CollectionFilter[]> {
  const requests: CountRequest[] = []

  facets.forEach((facet, facetIndex) => {
    if (facet.type === 'PRICE_RANGE') return
    const otherGroupFilters = expandFilterInputs(
      activeFilterInputs.filter((input) => !belongsToFacet(input, facet)),
    )
    facet.values.forEach((value, valueIndex) => {
      requests.push({
        facetIndex,
        valueIndex,
        filters: [...otherGroupFilters, ...expandFilterInput(value.input)],
      })
    })
  })

  if (requests.length === 0) return facets
  if (requests.length > MAX_EXACT_COUNT_VALUES) return facets

  const chunks: CountRequest[][] = []
  for (let i = 0; i < requests.length; i += CHUNK_SIZE) {
    chunks.push(requests.slice(i, i + CHUNK_SIZE))
  }

  let results: (number | null)[][]
  try {
    results = await Promise.all(chunks.map((chunk) => fetchChunk(searchQuery, chunk, cacheTags)))
  } catch (err) {
    logServerError(`facet-counts (${requests.length} values)`, err)
    return facets
  }

  const counts = new Map<string, number>()
  chunks.forEach((chunk, chunkIndex) => {
    chunk.forEach((request, i) => {
      const total = results[chunkIndex][i]
      if (total !== null) counts.set(`${request.facetIndex}:${request.valueIndex}`, total)
    })
  })

  return facets.map((facet, facetIndex) => {
    if (facet.type === 'PRICE_RANGE') return facet
    return {
      ...facet,
      values: facet.values.map((value, valueIndex) => {
        const exact = counts.get(`${facetIndex}:${valueIndex}`)
        return exact === undefined ? value : { ...value, count: exact }
      }),
    }
  })
}

async function fetchChunk(
  searchQuery: string,
  chunk: CountRequest[],
  cacheTags: string[],
): Promise<(number | null)[]> {
  const variables: Record<string, unknown> = { query: searchQuery }
  chunk.forEach((request, i) => {
    variables[`f${i}`] = request.filters
  })

  const data = await storefrontFetch<Record<string, { totalCount: number } | null>>(
    buildSearchFacetCountsQuery(chunk.length),
    variables,
    { next: { revalidate: 300, tags: cacheTags } },
  )

  return chunk.map((_, i) => data[`c${i}`]?.totalCount ?? null)
}
