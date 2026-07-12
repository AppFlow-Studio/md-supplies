// Run with the react-server condition so the `server-only` guard inside
// lib/shopify/storefront.ts resolves to its empty stub, and env vars come
// from .env.local (loaded below — storefront.ts no longer loads them):
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-collections.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS_AUDIT } from '../lib/shopify/queries/collections'
import { ROADMAP_CATEGORIES } from '../lib/category-nav'
import {
  buildCollectionFlags,
  buildRoadmapCoverage,
  buildSurfaceReport,
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

function handleList(handles: string[]): string {
  return handles.length === 0 ? '_none_' : handles.map((h) => `\`${h}\``).join(', ')
}

loadEnvConfig(process.cwd())

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
  const surface = buildSurfaceReport(collections, ROADMAP_CATEGORIES)

  const lines: string[] = []
  lines.push('# Category Nav Audit Report — §5.5 Surfaces Mismatch')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // §1 — Roadmap Coverage
  lines.push('## §1 Roadmap Coverage (§3.1)')
  lines.push('')
  lines.push('| Category | Group | Status | Matched Handles |')
  lines.push('|---|---|---|---|')
  for (const c of coverage) {
    lines.push(`| ${c.displayName} | ${c.navGroup} | ${c.status} | ${c.matchedHandles.join(', ') || '—'} |`)
  }

  // §2 — Collection Flags
  lines.push('')
  lines.push('## §2 Collection Flags (§4.2)')
  lines.push('')
  lines.push('| Handle | Title | Excluded | Zero Product | Missing Image | Missing SEO Title | Missing SEO Desc | Unmapped Orphan |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const f of flags) {
    lines.push(
      `| ${f.handle} | ${f.title} | ${statusIcon(f.excluded)} | ${statusIcon(f.zeroProduct)} | ${statusIcon(f.missingImage)} | ${statusIcon(f.missingSeoTitle)} | ${statusIcon(f.missingSeoDescription)} | ${statusIcon(f.unmappedOrphan)} |`,
    )
  }

  // §3 — Nav Surface Primary
  lines.push('')
  lines.push('## §3 Nav Surface — Primary')
  lines.push('')
  lines.push('Handles rendered in the header desktop mega-menu and mobile drawer "Categories" column, and footer "Top Categories" column.')
  lines.push('')
  lines.push(handleList(surface.navPrimary))

  // §4 — Nav Surface More
  lines.push('')
  lines.push('## §4 Nav Surface — More')
  lines.push('')
  lines.push('Handles rendered in the header desktop mega-menu and mobile drawer "More Categories" column, and footer "More Categories" column.')
  lines.push('')
  lines.push(handleList(surface.navMore))

  // §5 — Hub Primary Strip
  lines.push('')
  lines.push('## §5 Hub Surface — Primary Strip')
  lines.push('')
  lines.push('Handles shown in the "Popular Categories" strip on /categories (roadmap primary order, first 8).')
  lines.push('')
  lines.push(handleList(surface.navPrimary.slice(0, 8)))

  // §6 — Hub All Categories
  lines.push('')
  lines.push('## §6 Hub Surface — All Categories')
  lines.push('')
  lines.push('All handles eligible to appear in the "Browse All Categories" grid on /categories.')
  lines.push('')
  lines.push(handleList(surface.hubAll))

  // §7 — Sitemap
  lines.push('')
  lines.push('## §7 Sitemap Surface — /category/* URLs')
  lines.push('')
  lines.push('Handles emitted as /category/{handle} in sitemap.xml (same allowlist as Hub All).')
  lines.push('')
  lines.push(handleList(surface.hubAll))

  // §8 — Related Categories
  lines.push('')
  lines.push('## §8 Internal Links Surface — Related Categories Pool')
  lines.push('')
  lines.push('Handles eligible to appear in the "Related Categories" block on collection and product pages.')
  lines.push('')
  lines.push(handleList(surface.relatedPool))

  // §9 — Orphan Handles
  lines.push('')
  lines.push('## §9 Orphan Handles — Not In Any Roadmap Surface')
  lines.push('')
  lines.push('Live Shopify collections that are not in ROADMAP_CATEGORIES.matchedHandles and not in EXCLUDED_COLLECTION_HANDLES. These do not appear on any public-facing surface.')
  lines.push('')
  if (surface.orphanHandles.length === 0) {
    lines.push('_No orphan handles found._')
  } else {
    lines.push('| Handle |')
    lines.push('|---|')
    for (const h of surface.orphanHandles) {
      lines.push(`| ${h} |`)
    }
  }

  // §10 — Surface Consistency
  lines.push('')
  lines.push('## §10 Surface Consistency — Hub-Only Handles')
  lines.push('')
  lines.push('Handles present in Hub All / Sitemap but absent from Nav. These are synthesized sub-handles (e.g. individual Apparel sub-collections). This is expected behaviour — nav collapses them to one parent entry.')
  lines.push('')
  if (surface.hubOnlyHandles.length === 0) {
    lines.push('_All hub handles also appear in nav (no synthesized categories)._')
  } else {
    lines.push(handleList(surface.hubOnlyHandles))
  }

  // §11 — Action Items
  lines.push('')
  lines.push('## §11 Action Items — Unmapped Roadmap Categories')
  lines.push('')
  lines.push('Roadmap categories with no live Shopify collection. Catalog team must create these collections.')
  lines.push('')
  if (surface.actionItems.length === 0) {
    lines.push(`_All ${ROADMAP_CATEGORIES.length} roadmap categories are mapped to at least one live Shopify collection._`)
  } else {
    lines.push('| Category |')
    lines.push('|---|')
    for (const name of surface.actionItems) {
      lines.push(`| ${name} |`)
    }
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-nav-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
