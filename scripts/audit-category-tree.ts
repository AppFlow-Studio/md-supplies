// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import {
  fetchProductTagSummaries,
  buildL1Tiles,
  buildL2Tree,
  CATEGORY_TREE_L1,
  isAttributeSubcategoryTag,
} from '../lib/category-tree'

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

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-tree-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
