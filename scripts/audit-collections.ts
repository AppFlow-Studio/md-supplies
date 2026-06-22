import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS_AUDIT } from '../lib/shopify/queries/collections'
import { ROADMAP_CATEGORIES } from '../lib/category-nav'
import {
  buildCollectionFlags,
  buildRoadmapCoverage,
  type AuditCollectionInput,
} from '../lib/category-nav-audit'

type RawCollection = {
  handle: string
  title: string
  image: { url: string } | null
  seo: { title: string | null; description: string | null }
  products: { nodes: { id: string }[] }
}

function statusIcon(flag: boolean): string {
  return flag ? '⚠️' : '✅'
}

async function main() {
  const data = await storefrontFetch<{ collections: { nodes: RawCollection[] } }>(
    GET_COLLECTIONS_AUDIT,
    { first: 250 },
  )
  const raw = data.collections.nodes

  const collections: AuditCollectionInput[] = raw.map((c) => ({
    handle: c.handle,
    title: c.title,
    hasProduct: c.products.nodes.length > 0,
    image: c.image,
    seo: c.seo,
  }))

  const coverage = buildRoadmapCoverage(collections, ROADMAP_CATEGORIES)
  const flags = buildCollectionFlags(collections, ROADMAP_CATEGORIES)

  const lines: string[] = []
  lines.push('# Category Nav Audit Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('## Roadmap Coverage (§3.1)')
  lines.push('')
  lines.push('| Category | Group | Status | Matched Handles |')
  lines.push('|---|---|---|---|')
  for (const c of coverage) {
    lines.push(`| ${c.displayName} | ${c.navGroup} | ${c.status} | ${c.matchedHandles.join(', ') || '—'} |`)
  }

  lines.push('')
  lines.push('## Collection Flags (§4.2)')
  lines.push('')
  lines.push('| Handle | Title | Excluded | Zero Product | Missing Image | Missing SEO Title | Missing SEO Desc | Unmapped Orphan |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const f of flags) {
    lines.push(
      `| ${f.handle} | ${f.title} | ${statusIcon(f.excluded)} | ${statusIcon(f.zeroProduct)} | ${statusIcon(f.missingImage)} | ${statusIcon(f.missingSeoTitle)} | ${statusIcon(f.missingSeoDescription)} | ${statusIcon(f.unmappedOrphan)} |`,
    )
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-nav-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
