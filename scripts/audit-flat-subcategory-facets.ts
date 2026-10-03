// Which subcategory pages lose their filters because they canonicalize to a
// flat /category/<tag> collection (FIX-duplicate-category-urls)?
//
// For every L2 node that also exists as a standalone Shopify collection, this
// reports the facets Shopify actually returns for that collection and how many
// of them the rail shows when keyed on the flat slug vs on the parent L1.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-flat-subcategory-facets.ts
import { loadEnvConfig } from '@next/env'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTION_FILTERS_ONLY } from '../lib/shopify/queries/collections'
import { CATEGORY_TREE_L1, buildL2Tree, getCategorySlug } from '../lib/category-tree'
import { fetchProductTagSummaries } from '../lib/category-tree-data.server'
import { getAllowedFacets } from '../lib/filter-registry'
import type { CollectionFilter } from '../lib/shopify/types'

loadEnvConfig(process.cwd())

type Resp = { collection: { products: { filters: CollectionFilter[] } } | null }

async function main() {
  const nodes = buildL2Tree(await fetchProductTagSummaries())
  const rows: string[] = []
  for (const node of nodes) {
    const data = await storefrontFetch<Resp>(GET_COLLECTION_FILTERS_ONLY, { handle: node.tag })
    if (!data.collection) continue
    const facets = data.collection.products.filters
    const l1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)
    const parentKey = l1 ? getCategorySlug(l1) : '(none)'
    const asFlat = getAllowedFacets(node.tag, facets).map((f) => f.label)
    const asParent = l1 ? getAllowedFacets(parentKey, facets).map((f) => f.label) : []
    rows.push(
      [node.tag, parentKey, facets.length, asFlat.length, asParent.length, asParent.join(' / ')].join('\t'),
    )
  }
  console.log(['flatHandle', 'parentKey', 'shopifyFacets', 'shownAsFlat', 'shownAsParent', 'parentFacetLabels'].join('\t'))
  for (const r of rows) console.log(r)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
