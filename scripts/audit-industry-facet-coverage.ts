// READ-ONLY facet-coverage audit for the 5 validated industry pages
// (urgent-care, hrt-clinics, home-health, clinics-doctors-offices,
// pharmacies), mirroring the methodology behind lib/filter-registry.ts's
// per-category entries: a facet is worth registering only when it is
// populated on >=60% of the tag-scoped product set AND carries 2-40 distinct
// values. No writes, no Admin API.
//
// Note: Query.search()'s productFilters (the endpoint industry/L2 tag pages
// use) does not publish filter.v.availability or filter.p.type/product_type
// at all for these tag queries — confirmed live, not a sampling artifact
// (aggregation is computed over the full matched set regardless of `first`).
// So total product count is measured independently via full pagination
// (id-only) rather than derived from an availability facet.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-industry-facet-coverage.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { storefrontFetch } from '../lib/shopify/storefront'
import { SEARCH_PRODUCTS_BY_TAG } from '../lib/shopify/queries/products'
import { INDUSTRIES, hasValidatedAssortment } from '../lib/industries'

type FilterValue = { id: string; label: string; count: number; input: string }
type Filter = { id: string; label: string; type: string; values: FilterValue[] }

async function getFacets(tagQuery: string): Promise<Filter[]> {
  const data = await storefrontFetch<{ search: { productFilters: Filter[] } }>(
    SEARCH_PRODUCTS_BY_TAG,
    { query: tagQuery, first: 1, after: null, filters: [] },
    { cache: 'no-store' },
  )
  return data.search.productFilters
}

const COUNT_QUERY = `#graphql
  query CountByTag($query: String!, $first: Int!, $after: String) {
    search(query: $query, first: $first, after: $after, types: PRODUCT) {
      nodes { ... on Product { id } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

async function countTotal(tagQuery: string): Promise<number> {
  let after: string | null = null
  let total = 0
  for (let page = 0; page < 40; page++) {
    const data: { search: { nodes: unknown[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await storefrontFetch(COUNT_QUERY, { query: tagQuery, first: 250, after }, { cache: 'no-store' })
    total += data.search.nodes.length
    if (!data.search.pageInfo.hasNextPage) break
    after = data.search.pageInfo.endCursor
  }
  return total
}

async function main() {
  const validated = INDUSTRIES.filter(hasValidatedAssortment)
  for (const industry of validated) {
    const tagQuery = `tag:"${industry.tag}"`
    console.log(`\n${'='.repeat(70)}`)
    console.log(`Industry: ${industry.name}  (collectionHandle="${industry.collectionHandle}")`)
    console.log(`Tag query: ${tagQuery}`)
    try {
      const [filters, total] = await Promise.all([getFacets(tagQuery), countTotal(tagQuery)])
      console.log(`Total products: ${total}`)
      for (const f of filters) {
        const distinctValues = f.values.length
        const populated = f.values.reduce((s, v) => s + v.count, 0)
        const pct = total > 0 ? ((populated / total) * 100).toFixed(1) : '0.0'
        const qualifies = distinctValues >= 2 && distinctValues <= 40 && total > 0 && populated / total >= 0.6
        console.log(
          `  ${f.id.padEnd(38)} distinct=${String(distinctValues).padEnd(4)} coverage=${pct}%` +
          (qualifies ? '  <-- QUALIFIES' : ''),
        )
      }
    } catch (err) {
      console.log('FAILED:', err instanceof Error ? err.message : err)
    }
  }
}

main().catch((err) => {
  console.error('AUDIT FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
