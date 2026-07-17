// Regenerates lib/category-tree/tree.data.json + docs/category-tree-report.md
// from the live catalog. Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/build-category-tree.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_ALL_PRODUCT_TAGS } from '../lib/shopify/queries/products'
import { GET_ALL_COLLECTION_HANDLES } from '../lib/shopify/queries/collections'
import { deriveTreeData, resolveParent, classifySubcategoryTag } from '../lib/category-tree/derive'
import {
  L1_CATEGORIES, BOUNDARY_OVERRIDES, DUAL_CATEGORY_OVERRIDES,
  EXCLUDED_CATEGORY_TAGS, FORCE_CLASSIFICATION,
} from '../lib/category-tree/config'
import type { ProductTagRecord } from '../lib/category-tree/types'

type Page<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }

async function paginate<T>(query: string, key: 'products' | 'collections'): Promise<T[]> {
  const out: T[] = []
  let after: string | null = null
  while (true) {
    const data: Record<string, Page<T>> = await storefrontFetch<Record<string, Page<T>>>(
      query, { first: 250, after }, { cache: 'no-store' },
    )
    const page = data[key]
    out.push(...page.nodes)
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break
    after = page.pageInfo.endCursor
  }
  return out
}

async function main() {
  const products = await paginate<ProductTagRecord>(GET_ALL_PRODUCT_TAGS, 'products')
  const collections = await paginate<{ handle: string; title: string }>(GET_ALL_COLLECTION_HANDLES, 'collections')
  const collectionHandles = new Set(collections.map((c) => c.handle))

  const data = deriveTreeData(products, DUAL_CATEGORY_OVERRIDES)
  writeFileSync('lib/category-tree/tree.data.json', JSON.stringify(data, null, 2) + '\n')

  // ── Report ──
  const configuredTags = new Set(L1_CATEGORIES.map((c) => c.tag))
  const discovered = data.l1.filter((c) => !EXCLUDED_CATEGORY_TAGS.has(c.tag))
  const unknownTags = discovered.filter((c) => !configuredTags.has(c.tag))
  const missingTags = [...configuredTags].filter((t) => !discovered.some((c) => c.tag === t))
  const missingL1Collections = L1_CATEGORIES.filter((c) => !collectionHandles.has(c.handle))

  const boundary = data.l2.filter((s) => Object.keys(s.parents).length > 1)
  const attributes = data.l2.filter((s) => classifySubcategoryTag(s.tag, FORCE_CLASSIFICATION) === 'attribute')

  const junkHandle = 'categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays'
  const lines: string[] = [
    '# Category tree report', '',
    `Generated ${data.generatedAt} — ${data.totalProducts} products, ${collections.length} collections.`, '',
    '## Stale "Categories" collection check (ticket task)', '',
    `- Junk collection \`${junkHandle}\` (title "Categories") live: ${collectionHandles.has(junkHandle)}`,
    `- \`frontpage\` ("Home page") live: ${collectionHandles.has('frontpage')}`,
    '- The rebuilt app/categories page renders ONLY from lib/category-tree (tag backbone) — neither collection is a data source. The previously deployed page filtered the raw collection list, and the junk handle was already denied via lib/excluded-categories.ts.', '',
    '## L1 reconciliation', '',
    `- Discovered category: tags (excl. occ/pharmaceuticals): ${discovered.length} (expect 26)`,
    `- Tags discovered but NOT configured: ${unknownTags.map((c) => `${c.tag} (${c.productCount})`).join(', ') || 'none'}`,
    `- Tags configured but NOT discovered: ${missingTags.join(', ') || 'none'}`,
    `- Configured L1 collection handles missing live: ${missingL1Collections.map((c) => c.handle).join(', ') || 'none'}`, '',
    '## Sanity counts (ticket: Exam Room largest ~845, Dental ~149; catalog moves daily)', '',
    ...data.l1.map((c) => `- ${c.tag}: ${c.productCount}`), '',
    `- out-of-tree (no category: tag): ${data.outOfTreeCount} (ticket expects ~68)`, '',
    '## Multi-category products (override table reconciliation)', '',
    ...data.multiCategoryProducts.map((p) => {
      const covered = p.handle in DUAL_CATEGORY_OVERRIDES
        ? 'overridden'
        : 'NOT OVERRIDDEN (falls back alphabetical — BLOCKED items expected here)'
      return `- ${p.handle}: [${p.categoryTags.join(', ')}] — ${covered}`
    }), '',
    `## Boundary subcategories (${boundary.length} with >1 parent; 3 hardcoded, rest dominant)`, '',
    ...boundary.map((s) => {
      const r = resolveParent(s.tag, s.parents, BOUNDARY_OVERRIDES)
      return `- ${s.tag}: ${JSON.stringify(s.parents)} → ${r?.parentTag}${r?.crossLinkTag ? ` (x-link ${r.crossLinkTag})` : ''}`
    }), '',
    `## Attribute-classified subcategory values (${attributes.length}; ticket expects ~80 — facets, never tiles)`, '',
    ...attributes.map((s) => `- ${s.tag}`), '',
    '## Flag (not built, per ticket implementation note)', '',
    '- Compound-tag facets (e.g. "25G Hypodermic Needles") ride as-is; a clean single-"Gauge" abstraction needs a mapping pass — flagged, not launch-blocking.', '',
  ]
  writeFileSync('docs/category-tree-report.md', lines.join('\n'))
  console.log(`Wrote tree.data.json (${data.l1.length} L1, ${data.l2.length} L2) and docs/category-tree-report.md`)
}

main().catch((err) => { console.error(err); process.exit(1) })
