// Regenerates docs/redirects-ready.json from Shopify's live URL Redirect
// list — the long-term fix for the 2026-09-15 incident (Bilal → izzy Slack
// thread): docs/redirects-ready.json was a hand-compiled snapshot frozen
// since June, so every product consolidation after that point 404'd on the
// headless site (mdsupplies.com) while 301ing correctly on
// checkout.mdsupplies.com, which reads Shopify's redirect list directly.
//
// Deliberately does NOT change proxy.ts's request-time behavior: Proxy
// (formerly Middleware) is explicitly documented as not meant for slow data
// fetching (node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
// — "Proxy is _not_ intended for slow data fetching"), and this app's Proxy
// runs on effectively every route via its matcher, so a live Shopify call
// per request is out. Instead this script is the thing that goes stale
// instead of proxy.ts's data: run it before/after a product
// merge/consolidation (the same moment Izzy already creates the Shopify
// redirects) and PRODUCT_REDIRECTS picks up the change on the next deploy,
// with no hand-compiled diff step in between.
//
// Requires the custom Admin app's scope to include read_content (the scope
// that gates Shopify's UrlRedirect resource) — see
// lib/shopify/admin-redirects.ts's header comment. If that scope has not
// been granted, this fails loudly with a GraphQL access error rather than
// silently writing an empty/truncated file.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/sync-redirects.ts
//   (add --write to actually update the file; without it, prints the diff
//   summary only — same dry-run-by-default posture as scripts/audit-redirects.ts)
import 'server-only'
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { readFileSync, writeFileSync } from 'fs'
import { fetchAllShopifyRedirects } from '../lib/shopify/admin-redirects'
import {
  isProductShapeRedirect,
  resolveRedirectChains,
  diffRedirects,
  sortRedirects,
  type RawRedirect,
} from '../lib/shopify/redirect-sync'

const FILE_PATH = 'docs/redirects-ready.json'

// A live fetch returning far fewer rows than the file already holds is far
// more likely to be a pagination bug, a scope/permissions failure that
// silently returned a partial list, or (per the QA-vs-production caveat
// documented in scripts/audit-redirects.ts) an accidental run against the
// QA store, than 1,000+ genuine Shopify-side redirect deletions between
// runs. Refuse to write rather than silently truncating the table.
const MIN_RETENTION_RATIO = 0.5

async function main() {
  const write = process.argv.includes('--write')

  const previous: RawRedirect[] = JSON.parse(readFileSync(FILE_PATH, 'utf-8'))
  console.log(`Current file: ${previous.length} rows`)

  console.log('Fetching live Shopify URL Redirects...')
  const live = await fetchAllShopifyRedirects()
  console.log(`  fetched ${live.length} redirects from Shopify`)

  const productShaped = live.filter(isProductShapeRedirect)
  const skipped = live.filter((r) => !isProductShapeRedirect(r))
  if (skipped.length > 0) {
    console.log(
      `  skipping ${skipped.length} non-/products/ redirect(s) — out of scope for the bulk product table ` +
        `(handled, if at all, by proxy.ts's hand-written REDIRECT_ENTRIES):`,
    )
    for (const r of skipped.slice(0, 20)) console.log(`    ${r.from} -> ${r.to}`)
    if (skipped.length > 20) console.log(`    ...and ${skipped.length - 20} more`)
  }

  if (productShaped.length < previous.length * MIN_RETENTION_RATIO) {
    console.error(
      `\nABORTED: live fetch returned only ${productShaped.length} product-shaped redirects, ` +
        `less than ${MIN_RETENTION_RATIO * 100}% of the ${previous.length} currently in ${FILE_PATH}. ` +
        `This looks like a partial fetch, a missing read_content scope, or a run against the wrong ` +
        `store (see lib/shopify/shop-guard.ts) rather than a genuine mass-deletion. Not writing.`,
    )
    process.exit(1)
  }

  const { resolved, unresolvedCycles } = resolveRedirectChains(productShaped)
  if (unresolvedCycles.length > 0) {
    console.error(
      `\nABORTED: ${unresolvedCycles.length} redirect(s) form a cycle or exceed the max hop count and ` +
        `did not resolve to a single-hop target — proxy.ts's no-chains invariant would break. ` +
        `Fix these in Shopify first:`,
    )
    for (const from of unresolvedCycles) console.error(`    ${from}`)
    process.exit(1)
  }

  const next = sortRedirects(resolved)
  const diff = diffRedirects(previous, next)

  console.log(
    `\nDiff vs ${FILE_PATH}: +${diff.added.length} added, -${diff.removed.length} removed, ` +
      `~${diff.changed.length} changed, ${diff.unchanged} unchanged`,
  )
  if (diff.added.length > 0) {
    console.log('\nAdded:')
    for (const r of diff.added.slice(0, 20)) console.log(`  + ${r.from} -> ${r.to}`)
    if (diff.added.length > 20) console.log(`  ...and ${diff.added.length - 20} more`)
  }
  if (diff.removed.length > 0) {
    console.log('\nRemoved:')
    for (const r of diff.removed.slice(0, 20)) console.log(`  - ${r.from} -> ${r.to}`)
    if (diff.removed.length > 20) console.log(`  ...and ${diff.removed.length - 20} more`)
  }
  if (diff.changed.length > 0) {
    console.log('\nChanged:')
    for (const r of diff.changed.slice(0, 20)) console.log(`  ~ ${r.from}: ${r.oldTo} -> ${r.newTo}`)
    if (diff.changed.length > 20) console.log(`  ...and ${diff.changed.length - 20} more`)
  }

  if (!write) {
    console.log('\nDry run only (no changes written). Re-run with --write to update the file.')
    return
  }

  if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
    console.log('\nNo changes — file already matches Shopify.')
    return
  }

  writeFileSync(FILE_PATH, JSON.stringify(next, null, 1) + '\n')
  console.log(`\nWrote ${next.length} rows to ${FILE_PATH}.`)
}

main().catch((err) => {
  console.error('SYNC FAILED:', err instanceof Error ? err.stack : err)
  process.exit(1)
})
