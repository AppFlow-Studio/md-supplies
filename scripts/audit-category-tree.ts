// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import {
  fetchProductTagSummaries,
  buildL1Tiles,
  buildL2Tree,
  CATEGORY_TREE_L1,
} from '../lib/category-tree'

loadEnvConfig(process.cwd())

async function main() {
  const summaries = await fetchProductTagSummaries()
  const l1Tiles = buildL1Tiles(summaries)
  const l2Nodes = buildL2Tree(summaries)

  const approvedTags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
  const liveCategoryTags = new Set(summaries.flatMap((s) => s.categories))
  const noiseTags = [...liveCategoryTags].filter((t) => !approvedTags.has(t)).sort()

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
  lines.push(`Total distinct subcategory: values: ${l2Nodes.length}`)

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-tree-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
