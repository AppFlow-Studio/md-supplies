// READ-ONLY. Surfaces variant-merge candidates for Finger Cots and any
// "mattress cover" product, the two areas Bilal flagged (Slack, 2026-09-16)
// as showing the same symptom Izzy's Aug consolidation postmortem already
// diagnosed once: products that should be one item's size/style variants
// sitting as separate standalone listings.
//
// Two independent checks, one full-catalog pass:
//
//   1. Variant-merge candidates within category:gloves / subcategory:finger-cots
//      — same detection class as the postmortem (lib/catalog/variant-candidates.ts
//      documents the exact size-synonym gap that caused it and is unit-tested
//      against a real fixture pulled from this catalog, see
//      lib/catalog/__tests__/variant-candidates.test.ts).
//   2. Every product whose title contains "mattress cover", anywhere in the
//      catalog, with whether it actually carries the finger-cots subcategory
//      tag — Bilal reported seeing these "in the finger cots sub category",
//      which is surprising on its face (lib/category-tree.ts's
//      PRODUCT_CATEGORY_OVERRIDES comment records mattress covers as a
//      room-furniture/housekeeping question, not gloves), so this is a
//      mis-tagging check, not a merge check.
//
// A candidate is exactly that — a candidate. Like the precedent
// audit/attribute-collection-candidate-report.md, nothing here is
// auto-classified or auto-merged; every group needs the same human
// confirmation (cost/shipping-profile/location match, a real cart-add,
// checkout parity) the 2026-09-16 fix already used.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-variant-candidates.ts
import 'server-only'
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_ALL_PRODUCTS_BASIC } from '../lib/shopify/queries/products'
import {
  findVariantMergeCandidates,
  findMattressCoverEntries,
  type CatalogProductSummary,
} from '../lib/catalog/variant-candidates'

const REPORT_PATH = 'audit/finger-cots-mattress-cover-variant-candidates.md'
const FINGER_COTS_QUERY = 'tag:"category:gloves" AND tag:"subcategory:finger-cots"'

async function fetchAllProducts(): Promise<CatalogProductSummary[]> {
  const products: CatalogProductSummary[] = []
  let after: string | null = null
  let pages = 0
  for (;;) {
    const data: { products: { nodes: CatalogProductSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await storefrontFetch(GET_ALL_PRODUCTS_BASIC, { first: 250, after }, { cache: 'no-store' })
    products.push(...data.products.nodes)
    pages++
    if (!data.products.pageInfo.hasNextPage) break
    after = data.products.pageInfo.endCursor
  }
  console.log(`  fetched ${products.length} live products across ${pages} page(s)`)
  return products
}

async function main() {
  console.log('Fetching live catalog...')
  const allProducts = await fetchAllProducts()

  const fingerCots = allProducts.filter((p) => p.tags.includes('subcategory:finger-cots'))
  console.log(`  ${fingerCots.length} product(s) tagged ${FINGER_COTS_QUERY}`)

  const fingerCotsGroups = findVariantMergeCandidates(fingerCots)
  const mattressCoverEntries = findMattressCoverEntries(allProducts)

  const lines: string[] = []
  lines.push('# Finger Cots & Mattress Cover — Variant-Merge Candidate Audit')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Live products scanned: ${allProducts.length}`)
  lines.push(`Products tagged \`${FINGER_COTS_QUERY}\`: ${fingerCots.length}`)
  lines.push('')

  lines.push('## ⚠ Environment caveat')
  lines.push('')
  lines.push('This script queries the Storefront API configured in `.env.local`\'s `SHOPIFY_STORE_DOMAIN`, which')
  lines.push('`lib/shopify/shop-guard.ts` defaults to the QA fixtures store unless `SHOPIFY_ALLOWED_SHOP_DOMAIN` is')
  lines.push('set to production on purpose. A short/empty result below very likely means this ran against the QA')
  lines.push('subset, not that the production catalog is clean — see `scripts/audit-redirects.ts`\'s own caveat for')
  lines.push('the same reasoning, confirmed against this exact split before.')
  lines.push('')

  lines.push('## 1. Finger Cots — variant-merge candidates')
  lines.push('')
  if (fingerCotsGroups.length === 0) {
    lines.push('None found in the scanned set — either genuinely clean, or the QA-store caveat above applies.')
  } else {
    lines.push(
      `${fingerCotsGroups.length} candidate group(s) — products that share a vendor and a title once their size ` +
        'word is removed, so they look like separate listings for one item\'s size variants:',
    )
    lines.push('')
    for (const group of fingerCotsGroups) {
      lines.push(`### ${group.vendor} — "${group.baseTitle}"`)
      lines.push('')
      lines.push('| Handle | Title | Size | Size detected via |')
      lines.push('|---|---|---|---|')
      for (const m of group.members) {
        lines.push(`| \`${m.handle}\` | ${m.title} | ${m.size} | ${m.sizeSource} |`)
      }
      lines.push('')
    }
  }

  lines.push('## 2. "Mattress Cover" products — mis-tag/mis-placement check')
  lines.push('')
  if (mattressCoverEntries.length === 0) {
    lines.push('None found in the scanned set.')
  } else {
    lines.push(`${mattressCoverEntries.length} product(s) with "mattress cover" in the title:`)
    lines.push('')
    lines.push('| Handle | Title | Carries `subcategory:finger-cots`? | Tags |')
    lines.push('|---|---|---|---|')
    for (const e of mattressCoverEntries) {
      lines.push(`| \`${e.handle}\` | ${e.title} | ${e.taggedFingerCots ? '**YES**' : 'no'} | ${e.tags.join(', ')} |`)
    }
    lines.push('')
    const misTagged = mattressCoverEntries.filter((e) => e.taggedFingerCots)
    if (misTagged.length > 0) {
      lines.push(
        `**${misTagged.length} of these actually carry the finger-cots subcategory tag** — that explains Bilal's ` +
          'report directly and is a tagging fix, not a merge. The rest carrying no such tag means the sighting has ' +
          'a different cause (nav, search, or a stale page) and needs a live click-through to pin down.',
      )
    } else {
      lines.push(
        '**None of these carry the finger-cots subcategory tag** — the reported sighting is not explained by ' +
          'product tagging and needs a live click-through (nav / search / a stale cached page) to pin down.',
      )
    }
  }
  lines.push('')

  const report = lines.join('\n')
  writeFileSync(REPORT_PATH, report)
  console.log(`\nWrote ${REPORT_PATH}`)
  console.log(
    `\nSummary: ${fingerCotsGroups.length} finger-cots merge candidate group(s), ` +
      `${mattressCoverEntries.length} mattress-cover product(s) (${mattressCoverEntries.filter((e) => e.taggedFingerCots).length} tagged finger-cots)`,
  )
}

main().catch((err) => {
  console.error('AUDIT FAILED:', err instanceof Error ? err.stack : err)
  process.exit(1)
})
