// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import {
  buildL1Tiles,
  buildL2Tree,
  CATEGORY_TREE_L1,
  getCategorySlug,
  getTopSubcategoriesForParent,
  isAttributeSubcategoryTag,
} from '../lib/category-tree'
import { fetchProductTagSummaries } from '../lib/category-tree-data.server'
import { fetchAllCollectionHandles } from '../lib/shopify/collection-handles.server'

loadEnvConfig(process.cwd())

async function main() {
  const summaries = await fetchProductTagSummaries()
  const l1Tiles = buildL1Tiles(summaries)
  const l2Nodes = buildL2Tree(summaries)

  const approvedTags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
  const liveCategoryTags = new Set(summaries.flatMap((s) => s.categories))
  const noiseTags = [...liveCategoryTags].filter((t) => !approvedTags.has(t)).sort()
  const allSubcategoryTags = new Set(summaries.flatMap((s) => s.subcategories))
  const attributeTags = [...allSubcategoryTags].filter(isAttributeSubcategoryTag).sort()

  const lines: string[] = []
  lines.push('# Category Tree Audit Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Total products scanned: ${summaries.length}`)
  lines.push('')

  lines.push('## L1 tiles (product counts)')
  lines.push('')
  lines.push('| Tag | Display Name | Product Count |')
  lines.push('|---|---|---|')
  for (const tile of [...l1Tiles].sort((a, b) => b.productCount - a.productCount)) {
    lines.push(`| ${tile.tag} | ${tile.displayName} | ${tile.productCount} |`)
  }

  lines.push('')
  lines.push('## Live category: tag values NOT in the L1 allowlist (catalog noise)')
  lines.push('')
  if (noiseTags.length === 0) {
    lines.push('_None found._')
  } else {
    for (const tag of noiseTags) lines.push(`- \`${tag}\``)
  }

  lines.push('')
  lines.push('## L2 boundary subcategories (nest under >1 category: tag)')
  lines.push('')
  const boundaryNodes = l2Nodes.filter((n) => n.crossLinkParentTag)
  lines.push('| Subcategory | Canonical Parent | Cross-link Parent | Product Count |')
  lines.push('|---|---|---|---|')
  for (const n of boundaryNodes) {
    lines.push(`| ${n.tag} | ${n.parentTag} | ${n.crossLinkParentTag} | ${n.productCount} |`)
  }

  lines.push('')
  lines.push('## Subcategory: values excluded as attribute-patterned (never routed)')
  lines.push('')
  lines.push(`${attributeTags.length} of ${allSubcategoryTags.size} distinct subcategory: values excluded.`)
  lines.push('')
  if (attributeTags.length === 0) {
    lines.push('_None found._')
  } else {
    for (const tag of attributeTags) lines.push(`- \`${tag}\``)
  }

  lines.push('')
  lines.push(`Total routable subcategory: values (post attribute-exclusion): ${l2Nodes.length}`)

  const liveHandles = new Set((await fetchAllCollectionHandles()).map((c) => c.handle))

  lines.push('')
  lines.push('## Frontend category → Shopify collection reconciliation')
  lines.push('')
  lines.push('| Frontend Category | Route | Configured Shopify Handle | Live Collection Exists? | Parent | Children (top 4) | Status |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const l1 of CATEGORY_TREE_L1) {
    const slug = getCategorySlug(l1)
    const exists = liveHandles.has(l1.collectionHandle) ? 'YES' : 'NO — MISSING'
    const children = getTopSubcategoriesForParent(l1.tag, l2Nodes, 4).map((n) => n.tag).join(', ') || '_none_'
    const status = liveHandles.has(l1.collectionHandle) ? 'OK' : 'FLAG — configured handle not found live'
    lines.push(`| ${l1.displayName} | /category/${slug} | ${l1.collectionHandle} | ${exists} | — | ${children} | ${status} |`)
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-tree-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
