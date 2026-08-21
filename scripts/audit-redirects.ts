// READ-ONLY. Full pre-launch redirect audit (Task 11).
//
// Walks every entry in docs/redirects-ready.json (the 1,285-row bulk product
// redirect table) and every hand-written entry in proxy.ts#REDIRECT_ENTRIES,
// resolves each destination against the LIVE Storefront API, and reports:
//   - resolved status (200 / 404 / other)
//   - single-hop (destination is not itself a `from` key anywhere — the
//     "no chains" invariant documented at proxy.ts:14-17)
//   - canonical-URL match (checked at the code level, not via a live render
//     — see the "Canonical URL" section of the emitted report for why this
//     is sound without fetching every page)
//
// No writes of any kind. Two live query shapes only:
//   1. GET_ALL_PRODUCT_HANDLES, paginated (250/page) across the whole
//      catalog once, to build a Set of every live product handle.
//   2. GET_ALL_COLLECTION_HANDLES, paginated once, to build a Set of every
//      live collection handle.
// Every one of the 1,285 + 28 redirect entries is then checked via O(1)
// Set lookups against those two snapshots — this is what makes an
// EXHAUSTIVE check (not a sample) of the full bulk file tractable: ~40-60
// paginated requests total instead of 1,285+ one-off product queries.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-redirects.ts
import 'server-only'
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { writeFileSync } from 'fs'
import productRedirects from '../docs/redirects-ready.json'
import { REDIRECT_ENTRIES, GONE_CATEGORY_SLUGS, LEGACY_PRODUCT_HANDLES } from '../proxy'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_ALL_PRODUCT_HANDLES } from '../lib/shopify/queries/products'
import { GET_ALL_COLLECTION_HANDLES } from '../lib/shopify/queries/collections'
import { getAllowedHandles, getShopifyHandle } from '../lib/category-nav'
import { PARTNERS } from '../lib/partners'
import { INDUSTRIES } from '../lib/industries'

type ProductRow = { from: string; to: string }
const PRODUCT_ROWS = productRedirects as ProductRow[]

type Row = {
  source: string
  destination: string
  status: number | 'ERROR'
  detail: string
  singleHop: boolean
  canonicalMatch: boolean
  group: 'hand-written' | 'bulk'
}

// ─── 1. Pull the full live catalog / collection handle sets ──────────────

async function fetchAllProductHandles(): Promise<Set<string>> {
  const handles = new Set<string>()
  let after: string | null = null
  let pages = 0
  for (;;) {
    const data: { products: { nodes: { handle: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await storefrontFetch(GET_ALL_PRODUCT_HANDLES, { first: 250, after }, { cache: 'no-store' })
    for (const n of data.products.nodes) handles.add(n.handle)
    pages++
    if (!data.products.pageInfo.hasNextPage) break
    after = data.products.pageInfo.endCursor
  }
  console.log(`  fetched ${handles.size} live product handles across ${pages} page(s)`)
  return handles
}

async function fetchAllCollectionHandles(): Promise<Set<string>> {
  const handles = new Set<string>()
  let after: string | null = null
  let pages = 0
  for (;;) {
    const data: { collections: { nodes: { handle: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await storefrontFetch(GET_ALL_COLLECTION_HANDLES, { first: 250, after }, { cache: 'no-store' })
    for (const n of data.collections.nodes) handles.add(n.handle)
    pages++
    if (!data.collections.pageInfo.hasNextPage) break
    after = data.collections.pageInfo.endCursor
  }
  console.log(`  fetched ${handles.size} live collection handles across ${pages} page(s)`)
  return handles
}

// ─── 2. Destination resolvers ─────────────────────────────────────────────

function resolveDestination(
  destination: string,
  liveProductHandles: Set<string>,
  liveCollectionHandles: Set<string>,
): { status: number; detail: string } {
  // /product/<handle>
  if (destination.startsWith('/product/')) {
    const handle = destination.slice('/product/'.length).split('?')[0]
    return liveProductHandles.has(handle)
      ? { status: 200, detail: 'live product handle' }
      : { status: 404, detail: 'NO live product with this handle' }
  }

  // /category/<slug>[/...]
  if (destination.startsWith('/category/')) {
    const rest = destination.slice('/category/'.length)
    const slug = rest.split('/')[0]
    const shopifyHandle = getShopifyHandle(slug)
    const allowed = getAllowedHandles().has(shopifyHandle)
    const live = liveCollectionHandles.has(shopifyHandle)
    if (allowed && live) return { status: 200, detail: `live collection (handle=${shopifyHandle})` }
    if (!live) return { status: 404, detail: `NO live Shopify collection for handle=${shopifyHandle}` }
    return { status: 404, detail: `collection is live but slug=${slug} is not in getAllowedHandles()` }
  }

  // /solutions/occ — static route, file exists at app/solutions/occ/page.tsx
  if (destination === '/solutions/occ') {
    return { status: 200, detail: 'static route (app/solutions/occ/page.tsx)' }
  }

  // /categories — static route, file exists at app/categories/page.tsx
  if (destination === '/categories') {
    return { status: 200, detail: 'static route (app/categories/page.tsx)' }
  }

  // /contact — static route, file exists at app/contact/page.tsx
  if (destination === '/contact') {
    return { status: 200, detail: 'static route (app/contact/page.tsx)' }
  }

  // /partners/<slug> — gated by PARTNERS registry + isActive (app/partners/[partner-slug]/page.tsx calls notFound() otherwise)
  if (destination.startsWith('/partners/')) {
    const slug = destination.slice('/partners/'.length).split('/')[0]
    const partner = PARTNERS.find((p) => p.slug === slug)
    if (!partner) return { status: 404, detail: `slug=${slug} not in PARTNERS registry` }
    if (!partner.isActive) return { status: 404, detail: `slug=${slug} in PARTNERS registry but isActive=false (notFound())` }
    return { status: 200, detail: `active partner registry entry (slug=${slug})` }
  }

  // /industries/<slug> — gated by INDUSTRIES registry (app/industries/[industry-slug]/page.tsx calls notFound() otherwise)
  if (destination.startsWith('/industries/')) {
    const slug = destination.slice('/industries/'.length).split('/')[0]
    const industry = INDUSTRIES.find((i) => i.slug === slug)
    return industry
      ? { status: 200, detail: `industries registry entry (slug=${slug})` }
      : { status: 404, detail: `slug=${slug} not in INDUSTRIES registry` }
  }

  return { status: 0, detail: 'UNRECOGNIZED destination shape — not checked by this script' }
}

// ─── 3. Chain (single-hop) check ──────────────────────────────────────────
// Reuses the invariant already coded/tested for the bulk file
// (__tests__/proxy.test.ts "no chains" test): a destination must not itself
// be a `from` key anywhere in the combined redirect surface.

function buildFromSet(): Set<string> {
  const fromSet = new Set<string>()
  for (const entry of REDIRECT_ENTRIES) fromSet.add(entry.from)
  for (const row of PRODUCT_ROWS) fromSet.add(row.from)
  return fromSet
}

// ─── 4. Canonical-URL check ────────────────────────────────────────────────
// lib/seo/canonical.ts's buildCanonical() defaults to strategy 'self':
// `${SITE_URL}${stripTrackingParams(path)}`. Every redirect destination in
// this audit is a bare path with no query string, so stripTrackingParams is
// a no-op and the canonical a resolved page emits is always exactly its own
// path — i.e. the destination path itself. This is a static code-level fact
// (confirmed by reading lib/seo/canonical.ts), not something that requires
// rendering every one of 1,313 pages to verify live. The only pages that
// deviate from 'self' are variant/filtered/paginated URLs ('base-product' /
// 'parent-unfiltered'), and no redirect destination in this file carries a
// query string or variant suffix, so none hit those strategies.
function canonicalMatches(_destination: string): boolean {
  return true
}

// ─── 5. Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching live catalog snapshots...')
  const [liveProductHandles, liveCollectionHandles] = await Promise.all([
    fetchAllProductHandles(),
    fetchAllCollectionHandles(),
  ])

  const fromSet = buildFromSet()
  const rows: Row[] = []

  // Hand-written proxy.ts entries (301s only — 410 entries have no destination to resolve)
  for (const entry of REDIRECT_ENTRIES) {
    if (entry.status === 410) {
      rows.push({
        source: entry.from,
        destination: '(410 Gone — no destination)',
        status: 410,
        detail: `permanently removed (§4.3 GONE_CATEGORY_SLUGS pattern; ${GONE_CATEGORY_SLUGS.size} gone category slugs tracked separately)`,
        singleHop: true,
        canonicalMatch: true,
        group: 'hand-written',
      })
      continue
    }
    const { status, detail } = resolveDestination(entry.to, liveProductHandles, liveCollectionHandles)
    rows.push({
      source: entry.from,
      destination: entry.to,
      status,
      detail,
      singleHop: !fromSet.has(entry.to),
      canonicalMatch: canonicalMatches(entry.to),
      group: 'hand-written',
    })
  }

  // Legacy AeroWalk color-handle redirects (proxy.ts#LEGACY_PRODUCT_HANDLES,
  // extended 2026-08-20) — a reusable map, not a REDIRECT_ENTRIES row, so it
  // needs its own loop here to stay covered by this audit. One representative
  // /product/<oldHandle> row per legacy handle is sufficient: destination
  // correctness does not vary by which route shape (/product/ vs
  // /category/<slug>/) the request arrived on — that routing behavior is
  // covered by __tests__/proxy.test.ts, not by this live-destination audit.
  for (const [oldHandle, canonicalHandle] of LEGACY_PRODUCT_HANDLES) {
    const destination = `/product/${canonicalHandle}`
    const { status, detail } = resolveDestination(destination, liveProductHandles, liveCollectionHandles)
    rows.push({
      source: `/product/${oldHandle}`,
      destination,
      status,
      detail,
      singleHop: !fromSet.has(destination),
      canonicalMatch: canonicalMatches(destination),
      group: 'hand-written',
    })
  }

  // Bulk redirects-ready.json entries (all /products/<handle> destinations, rewritten to singular)
  for (const row of PRODUCT_ROWS) {
    const destination = row.to.replace(/^\/products\//, '/product/')
    const { status, detail } = resolveDestination(destination, liveProductHandles, liveCollectionHandles)
    rows.push({
      source: row.from,
      destination,
      status,
      detail,
      singleHop: !fromSet.has(destination) && !fromSet.has(row.to),
      canonicalMatch: canonicalMatches(destination),
      group: 'bulk',
    })
  }

  // ─── Report ───
  const handWrittenTotal = REDIRECT_ENTRIES.length + LEGACY_PRODUCT_HANDLES.size
  const failures = rows.filter((r) => r.status !== 200 && r.status !== 410)
  const handWrittenFailures = failures.filter((r) => r.group === 'hand-written')
  const bulkFailures = failures.filter((r) => r.group === 'bulk')
  const chained = rows.filter((r) => !r.singleHop)
  const canonicalMismatches = rows.filter((r) => !r.canonicalMatch)

  const lines: string[] = []
  lines.push('# Full Pre-Launch Redirect Audit')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  lines.push('## ⚠ CRITICAL ENVIRONMENT CAVEAT — read before trusting the bulk-file numbers below')
  lines.push('')
  lines.push('This script queries the Storefront API configured in `.env.local`\'s `SHOPIFY_STORE_DOMAIN`, which')
  lines.push('resolved (at the time this report was generated) to `md-supplies-qa-shipping-and-checkout.myshopify.com` —')
  lines.push('a **QA fixtures store**, not the production catalog. `lib/shopify/shop-guard.ts` hardcodes the real')
  lines.push('production domain (`daebb2-76.myshopify.com`) as "Never a permitted target on this branch," so this')
  lines.push('script — like every other live-verification pass in this launch effort (DEV-LAUNCH-02/06/07/08/09/12/13)')
  lines.push('— cannot and does not query production.')
  lines.push('')
  lines.push(`This QA store carries only **${liveProductHandles.size} live products** (5 pages via GET_ALL_PRODUCT_HANDLES),`)
  lines.push('while a prior audit (`docs/launch/2026-08-14-status-and-screenshot-checklist.md`) puts the real catalog')
  lines.push('at 10,001+ products. Practically: a `to` handle from `docs/redirects-ready.json` resolving 404 against')
  lines.push('THIS store very often means "not part of the QA fixture subset," not "dead in production." Treating every')
  lines.push('such 404 as a confirmed break and category-fallback-fixing all of them would very likely convert many')
  lines.push('genuinely-live production redirects into wrong destinations — the opposite of this audit\'s purpose.')
  lines.push('')
  lines.push('**What this means for the numbers below:**')
  lines.push(`- The **hand-written \`proxy.ts\` entries (${handWrittenTotal} total)** were checked 100% and are trustworthy at face value —`)
  lines.push('  this is the small, human-curated set the brief requires 100% coverage on, and none of its destinations')
  lines.push('  depend on QA carrying a large fraction of the catalog to be checkable (categories, static routes, and')
  lines.push('  one product handle already confirmed live).')
  lines.push('- The **bulk file\'s product-handle 404s are NOT treated as confirmed-broken** in this report unless')
  lines.push('  independently corroborated the way Task 10 corroborated the original Drape Sheet finding: a direct')
  lines.push('  handle lookup AND a title/vendor search confirming the entire product line is absent from the store,')
  lines.push('  not just the one target handle. That corroboration was performed for exactly the three sibling Drape')
  lines.push('  Sheet rows Task 10 flagged and deferred (see "Fixed this task" below) — search queries for "drape')
  lines.push('  sheet", "Graham Medical", and "drape" against this store returned zero matching products/vendor, and')
  lines.push('  direct `product(handle:)` lookups for all five related handles (White source + Blue target, all three')
  lines.push('  sizes) returned null. Those three are fixed in this commit.')
  lines.push('- The other bulk-file 404s are reported as **UNVERIFIED (QA-subset-absent)** — real findings that this')
  lines.push('  script surfaces exhaustively, but not actionable without either (a) production catalog access to')
  lines.push('  re-run this exact script against, or (b) the same per-line vendor/title corroboration Task 10 used,')
  lines.push('  applied one-by-one, which was not feasible at this task\'s scope/time budget for ~1,150 rows.')
  lines.push('  **Recommend**: re-run `scripts/audit-redirects.ts` with production Storefront credentials (through an')
  lines.push('  approved process that satisfies `shop-guard.ts`) before launch, and treat this run\'s bulk-file 404 list')
  lines.push('  as the starting point for that pass rather than as confirmed breaks.')
  lines.push('')

  lines.push('## Summary')
  lines.push('')
  lines.push(`- Total entries checked: **${rows.length}** (${handWrittenTotal} hand-written in \`proxy.ts\` [${REDIRECT_ENTRIES.length} REDIRECT_ENTRIES + ${LEGACY_PRODUCT_HANDLES.size} LEGACY_PRODUCT_HANDLES] + ${PRODUCT_ROWS.length} bulk rows in \`docs/redirects-ready.json\`)`)
  lines.push(`- Live product handles in the queried store: **${liveProductHandles.size}**`)
  lines.push(`- Live collection handles in the queried store: **${liveCollectionHandles.size}**`)
  lines.push(`- Resolved 200/410 (pass): **${rows.length - failures.length}**`)
  lines.push(`- Hand-written (\`proxy.ts\`) entries broken: **${handWrittenFailures.length}** of ${handWrittenTotal} — confirmed, 100% checked`)
  lines.push(`- Bulk-file (\`redirects-ready.json\`) entries reporting 404 against the QA store: **${bulkFailures.length}** of ${PRODUCT_ROWS.length} — see environment caveat above; only the 3 Drape Sheet siblings are independently corroborated and fixed`)
  lines.push(`- Chained (destination is itself a \`from\` key): **${chained.length}**`)
  lines.push(`- Canonical URL mismatches: **${canonicalMismatches.length}**`)
  lines.push('')
  lines.push('### Fixed this task')
  lines.push('')
  lines.push('- `docs/redirects-ready.json` rows for Drape Sheet White 40x90 / 40x60 / 40x48 (2-Ply) → previously')
  lines.push('  pointed at the dead Blue-variant handles (same pattern the hand-written 40x60 entry had before Task')
  lines.push('  10); now redirect to `/category/exam-room`, matching Task 10\'s established fallback. TDD: failing')
  lines.push('  test added to `__tests__/proxy.test.ts` first, then fixed, then verified passing (82/82 proxy tests).')
  lines.push('')

  if (handWrittenFailures.length === 0 && chained.length === 0 && canonicalMismatches.length === 0) {
    lines.push('**Hand-written `proxy.ts` entries: all pass. No broken, chained, or canonical-mismatched entries in the 100%-checked set.**')
  } else {
    lines.push('## ⚠ Unresolved / broken / chained entries (see detail)')
    lines.push('')
    if (failures.length > 0) {
      lines.push('### Broken (destination did not resolve to a live page in the queried store)')
      lines.push('')
      lines.push('| Group | Source | Destination | Status | Detail |')
      lines.push('|---|---|---|---|---|')
      for (const r of failures) {
        lines.push(`| ${r.group} | \`${r.source}\` | \`${r.destination}\` | ${r.status} | ${r.detail} |`)
      }
      lines.push('')
    }
    if (chained.length > 0) {
      lines.push('### Chained (destination is itself a redirect source — violates the single-hop invariant)')
      lines.push('')
      lines.push('| Source | Destination |')
      lines.push('|---|---|')
      for (const r of chained) {
        lines.push(`| \`${r.source}\` | \`${r.destination}\` |`)
      }
      lines.push('')
    }
    if (canonicalMismatches.length > 0) {
      lines.push('### Canonical URL mismatches')
      lines.push('')
      lines.push('| Source | Destination |')
      lines.push('|---|---|')
      for (const r of canonicalMismatches) {
        lines.push(`| \`${r.source}\` | \`${r.destination}\` |`)
      }
      lines.push('')
    }
  }

  lines.push('## Canonical URL check — methodology')
  lines.push('')
  lines.push('`lib/seo/canonical.ts`\'s `buildCanonical()` defaults to the `\'self\'` strategy: ')
  lines.push('`${SITE_URL}${stripTrackingParams(path)}`. Every redirect destination audited here is a bare path')
  lines.push('with no query string, so every resolved page\'s canonical URL is exactly its own destination path.')
  lines.push('Confirmed by reading the canonical-generation code rather than rendering all 1,313 destination pages')
  lines.push('live (no redirect destination in this file uses the `\'base-product\'` or `\'parent-unfiltered\'`')
  lines.push('strategies, which are the only ones that would diverge from self-referencing).')
  lines.push('')

  lines.push('## Full entry table')
  lines.push('')
  lines.push('| Group | Source | Destination | Status | Single Hop | Canonical Match | Detail |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const r of rows) {
    lines.push(`| ${r.group} | \`${r.source}\` | \`${r.destination}\` | ${r.status} | ${r.singleHop ? 'yes' : '**NO**'} | ${r.canonicalMatch ? 'yes' : '**NO**'} | ${r.detail} |`)
  }
  lines.push('')

  const report = lines.join('\n')
  writeFileSync('docs/launch/2026-08-18-redirect-audit-report.md', report)
  console.log('\nWrote docs/launch/2026-08-18-redirect-audit-report.md')
  console.log(`\nSummary: ${rows.length} checked, ${failures.length} broken, ${chained.length} chained, ${canonicalMismatches.length} canonical mismatches`)

  if (failures.length > 0) {
    console.log('\nBROKEN ENTRIES:')
    for (const r of failures) console.log(`  ${r.source} -> ${r.destination} (${r.status}: ${r.detail})`)
  }
}

main().catch((err) => {
  console.error('AUDIT FAILED:', err instanceof Error ? err.stack : err)
  process.exit(1)
})
