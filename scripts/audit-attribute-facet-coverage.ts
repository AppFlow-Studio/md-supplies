// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-attribute-facet-coverage.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTION_FILTERS_ONLY } from '../lib/shopify/queries/collections'
import {
  CATEGORY_TREE_L1,
  isAttributeSubcategoryTag,
  resolveCanonicalCategory,
} from '../lib/category-tree'
import { fetchProductTagSummaries } from '../lib/category-tree-data.server'
import { APPROVED_METAFIELDS } from '../lib/filter-registry'

loadEnvConfig(process.cwd())

type CollectionFiltersResponse = {
  collection: {
    products: {
      filters: { id: string; label: string; type: string; values: { id: string; label: string; count: number }[] }[]
    }
  } | null
}

async function main() {
  const summaries = await fetchProductTagSummaries()

  const subParentCounts = new Map<string, Map<string, number>>()
  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    if (!category) continue
    for (const sub of summary.subcategories) {
      if (!isAttributeSubcategoryTag(sub)) continue
      let counts = subParentCounts.get(sub)
      if (!counts) {
        counts = new Map()
        subParentCounts.set(sub, counts)
      }
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
  }

  const parentByTag = new Map<string, string>()
  for (const [sub, counts] of subParentCounts.entries()) {
    const [dominant] = [...counts.entries()].sort((a, b) => b[1] - a[1])
    parentByTag.set(sub, dominant[0])
  }

  const tagsByParent = new Map<string, string[]>()
  for (const [tag, parentTag] of parentByTag.entries()) {
    const list = tagsByParent.get(parentTag) ?? []
    list.push(tag)
    tagsByParent.set(parentTag, list)
  }

  const lines: string[] = []
  lines.push('# Attribute-Subcategory Tag -> Metafield Facet Coverage Audit')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(
    'For each L1 category that has attribute-patterned subcategory: tags today, ' +
      'this lists the tags, their live Storefront collection filters, and whether ' +
      'any filter matches an already-approved metafield (lib/filter-registry.ts) ' +
      'that could represent the attribute -- i.e. "wire now" vs. "needs a new ' +
      'Shopify metafield definition first."',
  )
  lines.push('')

  for (const [parentTag, tags] of [...tagsByParent.entries()].sort()) {
    const l1 = CATEGORY_TREE_L1.find((c) => c.tag === parentTag)
    lines.push(`## ${l1?.displayName ?? parentTag} (\`${parentTag}\`)`)
    lines.push('')
    lines.push(`Attribute tags (${tags.length}): ${tags.sort().map((t) => `\`${t}\``).join(', ')}`)
    lines.push('')

    if (!l1) {
      lines.push('_No approved L1 collection handle for this tag -- cannot check live filters._')
      lines.push('')
      continue
    }

    const data = await storefrontFetch<CollectionFiltersResponse>(GET_COLLECTION_FILTERS_ONLY, {
      handle: l1.collectionHandle,
    })
    const filters = data.collection?.products.filters ?? []

    if (filters.length === 0) {
      lines.push(`_No live filters returned for \`${l1.collectionHandle}\`._`)
      lines.push('')
      continue
    }

    lines.push('| Filter ID | Label | Matches an approved metafield? |')
    lines.push('|---|---|---|')
    for (const filter of filters) {
      const matchedRule = Object.entries(APPROVED_METAFIELDS).find(([, rule]) => rule.matches(filter.id))
      lines.push(
        `| \`${filter.id}\` | ${filter.label} | ${matchedRule ? `YES (\`${matchedRule[0]}\`)` : 'no'} |`,
      )
    }
    lines.push('')
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/attribute-subcategory-facet-coverage-report.md', report)
  console.log(report)
}

main().catch(console.error)
