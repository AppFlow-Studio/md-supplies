// DEV-LAUNCH-06 — READ-ONLY Storefront API probe of the QA store's actual
// catalog, to bootstrap real fixture handles/GIDs for e2e coverage instead of
// hardcoded production-only handles (12 Playwright tests were failing for
// exactly that reason — see docs/TASK-REGISTER-2026-08-03.md, C-01).
//
// No Admin API, no writes. Every query goes through the same storefrontFetch
// this app's server components use, against whichever store .env.local
// points at (QA per lib/shopify/shop-guard.ts's default).
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/qa-catalog-fixtures.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync, mkdirSync } from 'fs'

loadEnvConfig(process.cwd())

import { storefrontFetch } from '../lib/shopify/storefront'
import { CATEGORY_TREE_L1 } from '../lib/category-tree'
import { INDUSTRIES } from '../lib/industries'
import { OCC_HUB } from '../lib/occ'
import { getOccCollectionHandle } from '../lib/occ-collection'
import { ROADMAP_CATEGORIES } from '../lib/category-nav'

const PAGE_SIZE = 250
const MAX_COUNTED = 1000 // matches lib/category-results-source.ts MAX_MEMBERSHIP_IDS

const GET_COLLECTION_FIXTURE = `#graphql
  query GetCollectionFixture($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      handle
      title
      products(first: $first, after: $after) {
        nodes { id handle }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

const SEARCH_TAG_SAMPLE = `#graphql
  query SearchTagSample($query: String!, $first: Int!) {
    search(query: $query, first: $first, types: PRODUCT) {
      nodes {
        ... on Product { id handle }
      }
    }
  }
`

type CollectionFixtureResult = {
  handle: string
  exists: boolean
  gid: string | null
  title: string | null
  productCount: number
  countIsCapped: boolean
  sampleProducts: { handle: string; gid: string }[]
  error?: string
}

async function fetchCollectionFixture(handle: string): Promise<CollectionFixtureResult> {
  try {
    let after: string | null = null
    let count = 0
    let gid: string | null = null
    let title: string | null = null
    const sampleProducts: { handle: string; gid: string }[] = []
    let capped = false

    while (true) {
      const data: {
        collection: {
          id: string
          handle: string
          title: string
          products: {
            nodes: { id: string; handle: string }[]
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
          }
        } | null
      } = await storefrontFetch(
        GET_COLLECTION_FIXTURE,
        { handle, first: PAGE_SIZE, after },
        { cache: 'no-store' },
      )
      if (!data.collection) {
        return { handle, exists: false, gid: null, title: null, productCount: 0, countIsCapped: false, sampleProducts: [] }
      }
      gid = data.collection.id
      title = data.collection.title
      for (const n of data.collection.products.nodes) {
        count++
        if (sampleProducts.length < 3) sampleProducts.push({ handle: n.handle, gid: n.id })
      }
      if (count >= MAX_COUNTED) { capped = true; break }
      const { hasNextPage, endCursor } = data.collection.products.pageInfo
      if (!hasNextPage || !endCursor) break
      after = endCursor
    }

    return { handle, exists: true, gid, title, productCount: count, countIsCapped: capped, sampleProducts }
  } catch (err) {
    return {
      handle, exists: false, gid: null, title: null, productCount: 0, countIsCapped: false, sampleProducts: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

type IndustryFixtureResult = {
  slug: string
  tag: string
  sampleCount: number
  sampleProducts: { handle: string; gid: string }[]
  error?: string
}

async function fetchIndustryTagFixture(slug: string, tag: string): Promise<IndustryFixtureResult> {
  try {
    const data = await storefrontFetch<{ search: { nodes: { id: string; handle: string }[] } }>(
      SEARCH_TAG_SAMPLE,
      { query: `tag:"${tag}"`, first: 5 },
      { cache: 'no-store' },
    )
    const nodes = data.search.nodes
    return {
      slug, tag, sampleCount: nodes.length,
      sampleProducts: nodes.map((n) => ({ handle: n.handle, gid: n.id })),
    }
  } catch (err) {
    return { slug, tag, sampleCount: 0, sampleProducts: [], error: err instanceof Error ? err.message : String(err) }
  }
}

async function main() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN ?? '(unset)'
  const lines: string[] = []
  lines.push('# DEV-LAUNCH-06 — QA-store catalog fixtures (read-only, Storefront API)')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Store queried: \`${storeDomain}\``)
  lines.push('')
  lines.push(
    'Bootstrapped by `scripts/qa-catalog-fixtures.ts` (read-only Storefront API ' +
      'queries, no Admin scope needed) because no canonical "Izzy QA fixture ' +
      'handles and GIDs" registry exists yet for category/OCC/industry browsing ' +
      '(the closest analog, `data/shipping-facts-qa.json`, is scoped to shipping ' +
      'display only). Use the handles/GIDs below for e2e fixtures instead of ' +
      'production-specific IDs. Re-run this script whenever QA store data changes.',
  )
  lines.push('')

  // ── L1 categories ─────────────────────────────────────────────────────────
  lines.push('## L1 categories')
  lines.push('')
  lines.push('| Tag (route slug*) | Collection handle | Live on QA? | GID | Product count | Sample products |')
  lines.push('|---|---|---|---|---|---|')

  const canonicalSlugOf = new Map(
    ROADMAP_CATEGORIES.filter((c) => c.canonicalSlug).map((c) => [c.matchedHandles[0], c.canonicalSlug!]),
  )

  const l1Results: { tag: string; result: CollectionFixtureResult }[] = []
  for (const l1 of CATEGORY_TREE_L1) {
    const result = await fetchCollectionFixture(l1.collectionHandle)
    l1Results.push({ tag: l1.tag, result })
    const routeSlug = canonicalSlugOf.get(l1.collectionHandle) ?? l1.collectionHandle
    const live = result.exists ? '✅' : (result.error ? `❌ (${result.error})` : '❌ not found')
    const count = result.exists ? `${result.productCount}${result.countIsCapped ? '+' : ''}` : '—'
    const samples = result.sampleProducts.map((p) => p.handle).join(', ') || '—'
    lines.push(
      `| \`${l1.tag}\` (\`${routeSlug}\`) | \`${l1.collectionHandle}\` | ${live} | \`${result.gid ?? '—'}\` | ${count} | ${samples} |`,
    )
  }
  lines.push('')
  lines.push('\\* Route slug is the collection handle unless a `canonicalSlug` override exists in `lib/category-nav.ts` (only `face-masks` today).')
  lines.push('')

  // ── OCC ───────────────────────────────────────────────────────────────────
  lines.push('## OCC')
  lines.push('')
  const occHandle = getOccCollectionHandle()
  const occResult = await fetchCollectionFixture(occHandle)
  lines.push(`Canonical handle resolved by \`getOccCollectionHandle()\`: \`${occHandle}\``)
  lines.push('')
  lines.push('| Live on QA? | GID | Product count | Sample products |')
  lines.push('|---|---|---|---|')
  lines.push(
    `| ${occResult.exists ? '✅' : '❌'} | \`${occResult.gid ?? '—'}\` | ${occResult.exists ? `${occResult.productCount}${occResult.countIsCapped ? '+' : ''}` : '—'} | ${occResult.sampleProducts.map((p) => p.handle).join(', ') || '—'} |`,
  )
  lines.push('')
  lines.push(
    `**Status**: resolves on the QA store as of this run ${occResult.exists ? '(handle exists, see GID above)' : '(handle NOT FOUND — OCC page will render its "temporarily unavailable" fallback)'}. ` +
      'Production canonical confirmation is still pending Izzy (IZ-01 in docs/TASK-REGISTER-2026-08-03.md) — this only verifies the QA store, not production.',
  )
  lines.push('')

  lines.push('### OCC-adjacent collections (subcategory nav links, not registry-backed)')
  lines.push('')
  lines.push('| Handle | Live on QA? | GID | Product count |')
  lines.push('|---|---|---|---|')
  for (const cat of OCC_HUB.eligibleCategories) {
    const r = await fetchCollectionFixture(cat.handle)
    lines.push(`| \`${cat.handle}\` | ${r.exists ? '✅' : '❌'} | \`${r.gid ?? '—'}\` | ${r.exists ? r.productCount : '—'} |`)
  }
  lines.push('')

  // ── Industries (tag-backed) ──────────────────────────────────────────────
  lines.push('## Industries (tag-backed discovery)')
  lines.push('')
  lines.push('| Slug | Tag | Products found on QA (capped at 5) | Sample products |')
  lines.push('|---|---|---|---|')
  const taggedIndustries = INDUSTRIES.filter((i) => i.tag)
  for (const industry of taggedIndustries) {
    const r = await fetchIndustryTagFixture(industry.slug, industry.tag!)
    const status = r.error ? `❌ (${r.error})` : String(r.sampleCount)
    lines.push(`| \`${industry.slug}\` | \`${industry.tag}\` | ${status} | ${r.sampleProducts.map((p) => p.handle).join(', ') || '—'} |`)
  }
  lines.push('')

  // ── Machine-readable sidecar for e2e/helpers/qa-fixtures.ts ──────────────
  const sidecar = {
    generatedAt: new Date().toISOString(),
    storeDomain,
    l1Categories: l1Results.map(({ tag, result }) => ({
      tag,
      collectionHandle: result.handle,
      routeSlug: canonicalSlugOf.get(result.handle) ?? result.handle,
      exists: result.exists,
      gid: result.gid,
      productCount: result.productCount,
      sampleProducts: result.sampleProducts,
    })),
    occ: { handle: occHandle, exists: occResult.exists, gid: occResult.gid, productCount: occResult.productCount, sampleProducts: occResult.sampleProducts },
    industries: await Promise.all(
      taggedIndustries.map(async (industry) => {
        const r = await fetchIndustryTagFixture(industry.slug, industry.tag!)
        return { slug: industry.slug, tag: industry.tag, sampleCount: r.sampleCount, sampleProducts: r.sampleProducts }
      }),
    ),
  }

  mkdirSync('docs/launch', { recursive: true })
  mkdirSync('e2e/helpers', { recursive: true })
  writeFileSync('docs/launch/DEV-LAUNCH-06-qa-fixtures.md', lines.join('\n') + '\n')
  writeFileSync('e2e/helpers/qa-fixtures.json', JSON.stringify(sidecar, null, 2) + '\n')

  console.log('Wrote docs/launch/DEV-LAUNCH-06-qa-fixtures.md')
  console.log('Wrote e2e/helpers/qa-fixtures.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
