// THROWAWAY investigation script for Fix 1 (final-review-fix-report).
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/investigate-dropdown-dupes.ts
import { loadEnvConfig } from '@next/env'
import {
  buildL2Tree,
  CATEGORY_TREE_L1,
  FEATURED_SUBCATEGORIES,
  getTopSubcategoriesForParent,
  getSubcategoriesForParent,
  humanizeTag,
} from '../lib/category-tree'
import { fetchProductTagSummaries } from '../lib/category-tree-data.server'

loadEnvConfig(process.cwd())

const TARGETS = ['pharmacy-products', 'disinfectants', 'surgery-procedure']
const MAX_DROPDOWN_CHILDREN = 3

async function main() {
  const summaries = await fetchProductTagSummaries()
  const l2Nodes = buildL2Tree(summaries)

  for (const tag of TARGETS) {
    const l1 = CATEGORY_TREE_L1.find((c) => c.tag === tag)!
    console.log(`\n=== ${l1.displayName} (tag: ${tag}) ===`)

    const allChildren = getSubcategoriesForParent(tag, l2Nodes)
    console.log(`All L2 nodes under this parent (${allChildren.length}):`)
    for (const n of allChildren.sort((a, b) => b.productCount - a.productCount)) {
      const selfDupe = n.tag === tag ? '  <-- SELF-DUPLICATE (subcategory tag === parent category tag)' : ''
      console.log(`  subcategory:${n.tag}  productCount=${n.productCount}  humanized="${humanizeTag(n.tag)}"${selfDupe}`)
    }

    const featured = FEATURED_SUBCATEGORIES.filter((s) => s.parentTag === tag)
    console.log(`Featured subcategories for this parent (${featured.length}):`)
    for (const f of featured) {
      console.log(`  slug=${f.slug} collectionHandle=${f.collectionHandle} displayName="${f.displayName}"`)
    }

    const remainingSlots = MAX_DROPDOWN_CHILDREN - featured.length
    const top = remainingSlots > 0 ? getTopSubcategoriesForParent(tag, l2Nodes, remainingSlots) : []
    console.log(`Tag-derived children that would render in dropdown today (top ${remainingSlots}):`)
    for (const t of top) {
      console.log(`  subcategory:${t.tag}  productCount=${t.productCount}  humanized="${humanizeTag(t.tag)}"`)
    }
    console.log(
      `RENDERED DROPDOWN CHILDREN TODAY: [${[...featured.map((f) => f.displayName), ...top.map((t) => humanizeTag(t.tag))].join(', ')}]`,
    )
  }
}

main().catch(console.error)
