// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-attribute-collection-candidates.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS_WITH_PRODUCT_SAMPLE } from '../lib/shopify/queries/collections'
import { CATEGORY_TREE_L1, buildL1Tiles, resolveCanonicalCategory } from '../lib/category-tree'
import { fetchProductTagSummaries } from '../lib/category-tree-data.server'

loadEnvConfig(process.cwd())

const KNOWN_NON_ATTRIBUTE_HANDLES = new Set([
  'frontpage',
  'categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays',
])

const PURITY_THRESHOLD = 0.8
const MAX_PARENT_SHARE = 0.5

type CollectionsResponse = {
  collections: {
    nodes: {
      handle: string
      title: string
      products: { nodes: { handle: string }[]; pageInfo: { hasNextPage: boolean } }
    }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

async function fetchAllCollections(): Promise<CollectionsResponse['collections']['nodes']> {
  const all: CollectionsResponse['collections']['nodes'] = []
  let cursor: string | null = null
  while (true) {
    const data = await storefrontFetch<CollectionsResponse>(GET_COLLECTIONS_WITH_PRODUCT_SAMPLE, {
      first: 50,
      after: cursor,
    })
    all.push(...data.collections.nodes)
    const next = data.collections.pageInfo.endCursor
    if (!data.collections.pageInfo.hasNextPage || !next || next === cursor) break
    cursor = next
  }
  return all
}

async function main() {
  const [summaries, collections] = await Promise.all([fetchProductTagSummaries(), fetchAllCollections()])
  const l1Tiles = buildL1Tiles(summaries)
  const l1ProductCount = new Map(l1Tiles.map((t) => [t.tag, t.productCount]))
  const categoryByHandle = new Map(summaries.map((s) => [s.handle, resolveCanonicalCategory(s)] as const))
  const approvedHandles = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))

  type Candidate = { handle: string; title: string; parentTag: string; purity: number; size: number }
  const candidates: Candidate[] = []
  const unclassified: { handle: string; title: string; sampleSize: string }[] = []

  for (const collection of collections) {
    if (approvedHandles.has(collection.handle)) continue
    if (KNOWN_NON_ATTRIBUTE_HANDLES.has(collection.handle)) continue

    const sampleHandles = collection.products.nodes.map((n) => n.handle)
    if (sampleHandles.length === 0) {
      unclassified.push({ handle: collection.handle, title: collection.title, sampleSize: '0' })
      continue
    }

    const categoryCounts = new Map<string, number>()
    for (const handle of sampleHandles) {
      const category = categoryByHandle.get(handle)
      if (!category) continue
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    }

    const ranked = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])
    const hasNextPage = collection.products.pageInfo.hasNextPage
    const sampleSizeLabel = hasNextPage ? `${sampleHandles.length}+` : `${sampleHandles.length}`

    if (ranked.length === 0) {
      unclassified.push({ handle: collection.handle, title: collection.title, sampleSize: sampleSizeLabel })
      continue
    }

    const [parentTag, matchCount] = ranked[0]
    const purity = matchCount / sampleHandles.length
    const parentTotal = l1ProductCount.get(parentTag) ?? 0
    const sizeKnownExact = !hasNextPage
    const isExactAndSmall = sizeKnownExact && sampleHandles.length <= parentTotal * MAX_PARENT_SHARE

    if (purity >= PURITY_THRESHOLD && isExactAndSmall) {
      candidates.push({ handle: collection.handle, title: collection.title, parentTag, purity, size: sampleHandles.length })
    } else {
      unclassified.push({ handle: collection.handle, title: collection.title, sampleSize: sampleSizeLabel })
    }
  }

  const lines: string[] = []
  lines.push('# Attribute-Collection Candidate Audit')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Live collections scanned: ${collections.length}`)
  lines.push(`Already-approved L1 collections excluded: ${approvedHandles.size}`)
  lines.push('')
  lines.push(
    `A candidate is a collection whose exact size is known (<=50 products, no next page), whose ` +
      `sampled products are >=${Math.round(PURITY_THRESHOLD * 100)}% one L1's category: tag, and whose exact size is ` +
      `<=${Math.round(MAX_PARENT_SHARE * 100)}% of that L1's total product count -- i.e. a small, near-pure slice of one ` +
      'approved category, not an independent taxonomy branch. Anything uncertain (size unknown, low ' +
      'purity, or too large relative to its majority parent) goes to Unclassified for human review, ' +
      'never auto-classified as a candidate.',
  )
  lines.push('')

  lines.push(`## Candidates (${candidates.length})`)
  lines.push('')
  lines.push('| Handle | Title | Inferred Parent L1 | Sample Purity | Size |')
  lines.push('|---|---|---|---|---|')
  for (const c of candidates.sort((a, b) => a.parentTag.localeCompare(b.parentTag))) {
    lines.push(`| ${c.handle} | ${c.title} | ${c.parentTag} | ${Math.round(c.purity * 100)}% | ${c.size} |`)
  }

  lines.push('')
  lines.push(`## Unclassified -- needs manual review (${unclassified.length})`)
  lines.push('')
  lines.push(
    'Not an approved L1, not in the known-non-attribute list, and either has no clear majority ' +
      'category: tag, an uncertain (50+) size, or is too large relative to its majority parent to be ' +
      'confidently called an attribute slice -- could be a real subcategory, a not-yet-approved ' +
      'umbrella, a duplicate-title collection, or catalog noise.',
  )
  lines.push('')
  lines.push('| Handle | Title | Sample Size |')
  lines.push('|---|---|---|')
  for (const u of unclassified.sort((a, b) => a.handle.localeCompare(b.handle))) {
    lines.push(`| ${u.handle} | ${u.title} | ${u.sampleSize} |`)
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/attribute-collection-candidate-report.md', report)
  console.log(report)
}

main().catch(console.error)
