// READ-ONLY. Generates the two reports Juliette's directive requires
// (DEV-SHIP-03), by cross-referencing the live Storefront custom.free_shipping
// metafield against this build's own shipping-facts registry, run through the
// SAME functions the app uses (resolveCardShippingDisplay + gateFreeShippingClaim)
// so "rate-qualified" and "conflict" mean exactly what the pipeline itself
// means — not a reimplementation.
//
// No writes: does not touch Shopify data, delivery profiles, rates, metafields,
// the live theme, or data/shipping-facts-v3.json (read-only).
//
// Outputs two CSVs under scripts/output/ plus a console summary:
//   free-shipping-exceptions.csv — rate-qualified, custom.free_shipping missing,
//     grouped by vendor + delivery profile. For Juliette's approval to flip on.
//   free-shipping-conflicts.csv  — custom.free_shipping=true but rate validation
//     fails. Correctly suppressed today; listed so the metafield can be corrected.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/report-free-shipping-exceptions.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { mkdirSync, writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { resolveCardShippingDisplay } from '../lib/shipping-resolver/resolve'
import { gateFreeShippingClaim, isFreeShippingMetafieldTrue } from '../lib/shipping-resolver/free-shipping-gate'
import { getShippingFactsData } from '../lib/shipping-resolver/data'
import type { ProductRecord } from '../lib/shipping-resolver/schema'

// The registry schema is `.passthrough()`, so these fields survive parsing
// but aren't in the strict inferred type. Read defensively.
type RegistryProductExtra = ProductRecord & {
  vendor?: unknown
  variants: Record<string, { delivery_profile?: { id?: unknown; name?: unknown } }>
}

const SCAN_QUERY = `#graphql
  query FreeShippingScan($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        handle
        freeShipping: metafield(namespace: "custom", key: "free_shipping") { value }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

type ScanNode = { id: string; handle: string; freeShipping: { value: string } | null }

async function fetchAllProducts(): Promise<ScanNode[]> {
  const out: ScanNode[] = []
  let after: string | null = null
  for (let page = 0; page < 60; page++) {
    const data: { products: { nodes: ScanNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await storefrontFetch(SCAN_QUERY, { first: 250, after }, { cache: 'no-store' })
    out.push(...data.products.nodes)
    if (!data.products.pageInfo.hasNextPage) break
    after = data.products.pageInfo.endCursor
  }
  return out
}

function vendorOf(product: RegistryProductExtra): string {
  return typeof product.vendor === 'string' && product.vendor.trim() ? product.vendor.trim() : '(unknown vendor)'
}

function deliveryProfileOf(product: RegistryProductExtra): string {
  const names = new Set(
    Object.values(product.variants)
      .map((v) => (typeof v.delivery_profile?.name === 'string' ? v.delivery_profile.name : null))
      .filter((n): n is string => n !== null),
  )
  if (names.size === 0) return '(no delivery profile on file)'
  if (names.size === 1) return [...names][0]
  return `Mixed (${[...names].sort().join(', ')})`
}

/** Why the resolver did not confirm standard-free, for the conflict report. */
function suppressionReason(product: RegistryProductExtra): string {
  if (product.hold) return `held (${product.hold_reason ?? 'no reason on file'})`
  const classes = new Set(Object.values(product.variants).map((v) => v.public_display_class))
  if (classes.size !== 1) return `mixed-variant classes (${[...classes].sort().join(', ')})`
  const [sharedClass] = classes
  if (sharedClass !== 'standard-free') return `resolver class is ${sharedClass}, not standard-free`
  const rateClasses = new Set(Object.values(product.variants).map((v) => v.effective_rate_class))
  return `standard-free class but rate math disagrees (effective_rate_class: ${[...rateClasses].sort().join(', ')})`
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function writeCsv(path: string, header: string[], rows: string[][]) {
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(','))
  writeFileSync(path, lines.join('\n') + '\n', 'utf8')
}

async function main() {
  const factsData = getShippingFactsData()
  console.log(`Shipping-facts registry loaded: ok=${factsData.ok}, products=${factsData.productsByGid.size}`)
  if (!factsData.ok) {
    console.log('Registry failed to load — aborting report generation.')
    return
  }

  console.log("Fetching every product's custom.free_shipping from the Storefront API...")
  const products = await fetchAllProducts()
  console.log(`Scanned ${products.length} products.\n`)

  const exceptionRows: string[][] = []
  const conflictRows: string[][] = []
  let approvedCount = 0
  let rateOnlyCount = 0
  let merchantOnlyConflictCount = 0
  let suppressedNeitherCount = 0
  const approvedRows: string[][] = []

  for (const p of products) {
    const registryProduct = factsData.productsByGid.get(p.id) as RegistryProductExtra | undefined
    if (!registryProduct) continue // resolver has no opinion on this product at all

    const metafieldTrue = isFreeShippingMetafieldTrue(p.freeShipping)
    const resolverDisplay = resolveCardShippingDisplay(p.id)
    const resolverConfirmsFree = resolverDisplay.class === 'standard-free'
    const gated = gateFreeShippingClaim(resolverDisplay, p.freeShipping)
    const badgeShows = gated.class === 'standard-free'

    if (badgeShows) {
      approvedCount++
      const rateClasses = new Set(Object.values(registryProduct.variants).map((v) => v.effective_rate_class))
      approvedRows.push([
        vendorOf(registryProduct),
        deliveryProfileOf(registryProduct),
        p.handle,
        p.id,
        registryProduct.title,
        [...rateClasses].sort().join('|'),
      ])
      continue
    }

    if (resolverConfirmsFree && !metafieldTrue) {
      // Rate-qualified, missing merchant approval — the exception report.
      rateOnlyCount++
      exceptionRows.push([
        vendorOf(registryProduct),
        deliveryProfileOf(registryProduct),
        p.handle,
        p.id,
        registryProduct.title,
        String(Object.keys(registryProduct.variants).length),
      ])
    } else if (metafieldTrue && !resolverConfirmsFree) {
      // Merchant-flagged but fails rate validation — the conflict report.
      merchantOnlyConflictCount++
      conflictRows.push([
        vendorOf(registryProduct),
        deliveryProfileOf(registryProduct),
        p.handle,
        p.id,
        registryProduct.title,
        suppressionReason(registryProduct),
      ])
    } else {
      suppressedNeitherCount++
    }
  }

  // Sort both reports by vendor, then delivery profile, then handle — the
  // grouping Juliette asked for, readable top-to-bottom in the CSV as-is.
  const byVendorProfileHandle = (a: string[], b: string[]) =>
    a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2])
  exceptionRows.sort(byVendorProfileHandle)
  conflictRows.sort(byVendorProfileHandle)
  approvedRows.sort(byVendorProfileHandle)

  const outDir = 'scripts/output'
  mkdirSync(outDir, { recursive: true })
  const exceptionPath = `${outDir}/free-shipping-exceptions.csv`
  const conflictPath = `${outDir}/free-shipping-conflicts.csv`
  const approvedPath = `${outDir}/free-shipping-approved.csv`

  writeCsv(
    exceptionPath,
    ['vendor', 'delivery_profile', 'handle', 'product_gid', 'title', 'variant_count'],
    exceptionRows,
  )
  writeCsv(
    conflictPath,
    ['vendor', 'delivery_profile', 'handle', 'product_gid', 'title', 'suppression_reason'],
    conflictRows,
  )
  writeCsv(
    approvedPath,
    ['vendor', 'delivery_profile', 'handle', 'product_gid', 'title', 'effective_rate_class'],
    approvedRows,
  )

  console.log('=== Summary ===')
  console.log(`Approved (badge shows — resolver confirms free AND custom.free_shipping=true): ${approvedCount}`)
  console.log(`Rate-only exceptions (resolver confirms free, merchant approval missing):        ${rateOnlyCount}`)
  console.log(`Merchant-only conflicts (custom.free_shipping=true, fails rate validation):       ${merchantOnlyConflictCount}`)
  console.log(`Suppressed, neither claims free shipping:                                         ${suppressedNeitherCount}`)
  console.log('')
  console.log(`Exception report (for Juliette's approval): ${exceptionPath} (${exceptionRows.length} rows)`)
  console.log(`Conflict report:                            ${conflictPath} (${conflictRows.length} rows)`)
  console.log(`Approved list (for manual QA):               ${approvedPath} (${approvedRows.length} rows)`)

  const vendorCounts = new Map<string, number>()
  for (const row of exceptionRows) vendorCounts.set(row[0], (vendorCounts.get(row[0]) ?? 0) + 1)
  console.log('\nException report — by vendor:')
  for (const [vendor, count] of [...vendorCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${vendor}: ${count}`)
  }
}

main().catch((err) => {
  console.error('REPORT GENERATION FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
