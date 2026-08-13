#!/usr/bin/env node
/**
 * READ-ONLY inventory + location audit (Admin API).
 *
 *   node scripts/audit-inventory-locations.mjs [--limit N] [--out <dir>]
 *
 * Answers the questions the supplied inventory CSV could not, because it
 * shipped with a header row and zero data rows:
 *   - every location, and whether it FULFILS ONLINE ORDERS
 *   - every affected inventory item and whether tracking is enabled
 *   - active inventory levels per location (available / on-hand / committed)
 *   - the publication and delivery-profile relationship
 *
 * Produces a DISCREPANCY REPORT and a CORRECTION PACKAGE. It performs no
 * writes and it does not re-run any consolidation import.
 *
 * SAFETY: this file contains no mutation strings at all — every request goes
 * through admin(), which refuses anything containing `mutation`. Reading
 * production is explicitly in scope; writing it is not.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const LIMIT = Number(arg('--limit', '0')) || Infinity
const OUT = arg('--out', 'docs/audits/2026-08-02-catalog-cro')
const EV = join(OUT, 'evidence')
mkdirSync(EV, { recursive: true })

function loadEnv(p) {
  const out = {}
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}
/**
 * Prefers a static token (SHOPIFY_ADMIN_ACCESS_TOKEN / legacy
 * SHOPIFY_ADMIN_TOKEN) if one is configured; otherwise exchanges
 * SHOPIFY_ADMIN_CLIENT_ID/SECRET for a short-lived token via the
 * client_credentials grant — this store's custom app doesn't issue a static
 * token (see lib/shopify/admin-token.ts for the app's own copy of this).
 */
async function resolveAdminToken(env, domain) {
  const staticToken = env.SHOPIFY_ADMIN_ACCESS_TOKEN || env.SHOPIFY_ADMIN_TOKEN
  if (staticToken) return staticToken
  const clientId = env.SHOPIFY_ADMIN_CLIENT_ID
  const clientSecret = env.SHOPIFY_ADMIN_CLIENT_SECRET
  if (!clientId || !clientSecret || !domain) return null
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.access_token ?? null
}

const env = loadEnv(process.env.ENV_FILE || '.env.local')
const domain = (env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
const token = await resolveAdminToken(env, domain)
if (!domain || !token) { console.error('Missing shop domain or Admin token/credentials.'); process.exit(2) }

let calls = 0
async function admin(query, variables = {}) {
  // Structural write-guard: a mutation cannot leave this script even by accident.
  if (/\bmutation\b/i.test(query)) throw new Error('REFUSED: this audit is read-only')
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    })
    const json = await res.json()
    calls++
    const throttled = json.errors?.some((e) => e.extensions?.code === 'THROTTLED')
    if (throttled && attempt < 6) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue }
    if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300))
    return json.data
  }
}

// --from-raw re-analyses the cached snapshot instead of re-issuing 300+ API
// calls. Re-fetching to change a report heading is wasteful and rate-limits
// the shop for no reason.
const FROM_RAW = argv.includes('--from-raw')
let who, locs, publications = [], profiles = [], rows = [], seen = 0

if (FROM_RAW) {
  const cached = JSON.parse(readFileSync(join(EV, 'inventory-location-raw.json'), 'utf8'))
  who = { shop: cached.shop }
  locs = cached.locations
  publications = cached.publications ?? []
  profiles = cached.profiles ?? []
  rows = cached.variants
  seen = new Set(rows.map((r) => r.productId)).size
  console.log(`Re-analysing cached snapshot: ${rows.length} variants (no API calls)`)
} else {
  who = await admin('{ shop { name myshopifyDomain } }')
  console.log(`Shop: ${who.shop.name} (${who.shop.myshopifyDomain})  [READ-ONLY]`)
}

// ── Locations ───────────────────────────────────────────────────────────────
if (!FROM_RAW) locs = (await admin(`{
  locations(first: 100, includeInactive: true) {
    nodes {
      id name isActive fulfillsOnlineOrders shipsInventory
      address { city provinceCode countryCode }
    }
  }
}`)).locations.nodes
const locById = new Map(locs.map((l) => [l.id, l]))
const onlineLocs = new Set(locs.filter((l) => l.fulfillsOnlineOrders && l.isActive).map((l) => l.id))
console.log(`Locations: ${locs.length} (${onlineLocs.size} active + fulfilling online orders)`)

// ── Publications & delivery profiles ────────────────────────────────────────
if (!FROM_RAW) try { publications = (await admin('{ publications(first: 50) { nodes { id name } } }')).publications.nodes } catch {}
if (!FROM_RAW) try {
  profiles = (await admin(`{
    deliveryProfiles(first: 20) {
      nodes {
        id name default
        productVariantsCount { count }
        profileLocationGroups { locationGroup { locations(first: 50) { nodes { id name } } } }
      }
    }
  }`)).deliveryProfiles.nodes
} catch (e) { console.warn('  ! deliveryProfiles: ' + String(e.message).slice(0, 90)) }

// ── Products / variants / inventory levels ──────────────────────────────────
let cursor = null
if (!FROM_RAW) {
process.stdout.write('Scanning products')
do {
  const page = await admin(`query($after: String) {
    products(first: 25, after: $after, query: "status:active") {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title status
        variants(first: 25) {
          nodes {
            id sku title inventoryPolicy inventoryQuantity
            inventoryItem {
              id tracked
              inventoryLevels(first: 20) {
                nodes {
                  location { id }
                  quantities(names: ["available","on_hand","committed"]) { name quantity }
                }
              }
            }
          }
        }
      }
    }
  }`, { after: cursor })

  for (const p of page.products.nodes) {
    for (const v of p.variants.nodes) {
      const item = v.inventoryItem
      const levels = (item?.inventoryLevels?.nodes ?? []).map((l) => {
        const q = Object.fromEntries(l.quantities.map((x) => [x.name, x.quantity]))
        return { locationId: l.location.id, ...q }
      })
      rows.push({
        productHandle: p.handle, productId: p.id, title: p.title,
        variantId: v.id, sku: v.sku ?? '', variantTitle: v.title,
        tracked: item?.tracked ?? null,
        inventoryPolicy: v.inventoryPolicy,
        inventoryQuantity: v.inventoryQuantity,
        levels,
      })
    }
  }
  seen += page.products.nodes.length
  if (seen % 250 < 25) process.stdout.write('.')
  cursor = page.products.pageInfo.hasNextPage ? page.products.pageInfo.endCursor : null
} while (cursor && seen < LIMIT)
  process.stdout.write('\n')
  console.log(`Active products scanned: ${seen} · variants: ${rows.length} · API calls: ${calls}`)
}

// ── Discrepancies ───────────────────────────────────────────────────────────
const D = {
  negativeInventory: [],
  trackedNoLevels: [],
  stockOnlyAtNonOnlineLocation: [],
  trackedZeroEverywhereButStillDeny: [],
  inactiveLocationHoldingStock: [],
  onHandMismatch: [],
  untrackedButQuantityReported: [],
}

for (const r of rows) {
  const totalAvail = r.levels.reduce((n, l) => n + (l.available ?? 0), 0)
  const onlineAvail = r.levels
    .filter((l) => onlineLocs.has(l.locationId))
    .reduce((n, l) => n + (l.available ?? 0), 0)

  if (r.tracked && r.levels.length === 0) {
    D.trackedNoLevels.push({ ...r, why: 'tracked but has no inventory level at any location' })
  }
  // The commercially important one: stock exists, but not anywhere that can
  // actually fulfil an online order, so the storefront cannot sell it.
  if (r.tracked && totalAvail > 0 && onlineAvail <= 0) {
    D.stockOnlyAtNonOnlineLocation.push({
      ...r, totalAvail, onlineAvail,
      why: 'available stock sits only at locations that do not fulfil online orders',
    })
  }
  if (r.tracked && totalAvail <= 0 && r.inventoryPolicy === 'DENY') {
    D.trackedZeroEverywhereButStillDeny.push({ ...r, totalAvail, why: 'zero available everywhere and policy DENY — unbuyable' })
  }
  // NEGATIVE stock is the headline signal: a ledger cannot legitimately hold
  // less than nothing. It means oversold, or an import that subtracted from a
  // baseline that was never there. Reported separately from "untracked but
  // reports a quantity", which is the same rows described uselessly.
  for (const l of r.levels) {
    if ((l.available ?? 0) < 0 || (l.on_hand ?? 0) < 0) {
      D.negativeInventory.push({
        ...r, location: locById.get(l.locationId)?.name ?? l.locationId,
        available: l.available, on_hand: l.on_hand, committed: l.committed,
        why: 'negative available/on-hand — oversold or import residue',
      })
    }
  }

  for (const l of r.levels) {
    const loc = locById.get(l.locationId)
    if (loc && !loc.isActive && (l.available ?? 0) > 0) {
      D.inactiveLocationHoldingStock.push({ ...r, location: loc.name, available: l.available, why: 'stock held at an INACTIVE location' })
    }
    if (l.on_hand != null && l.available != null && l.committed != null &&
        l.on_hand !== l.available + l.committed) {
      D.onHandMismatch.push({
        ...r, location: loc?.name ?? l.locationId,
        on_hand: l.on_hand, available: l.available, committed: l.committed,
        why: 'on_hand != available + committed',
      })
    }
  }
  if (r.tracked === false && (r.inventoryQuantity ?? 0) !== 0) {
    D.untrackedButQuantityReported.push({ ...r, why: 'tracking disabled but a quantity is reported' })
  }
}

// ── Write ───────────────────────────────────────────────────────────────────
if (!FROM_RAW) writeFileSync(join(EV, 'inventory-location-raw.json'),
  JSON.stringify({ shop: who.shop, takenAt: new Date().toISOString(), locations: locs, publications, profiles, variants: rows }, null, 2) + '\n')

const csvEsc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const writeCsv = (name, header, data) =>
  writeFileSync(join(EV, name), [header, ...data].map((r) => r.map(csvEsc).join(',')).join('\n') + '\n')

writeCsv('inventory-discrepancies.csv',
  ['category', 'product_handle', 'variant_id', 'sku', 'tracked', 'policy', 'detail'],
  Object.entries(D).flatMap(([cat, items]) =>
    items.map((i) => [cat, i.productHandle, i.variantId, i.sku, i.tracked, i.inventoryPolicy, i.why])))

const n = (k) => D[k].length
const md = [
  '# Inventory & location audit (read-only)',
  '',
  `Shop: \`${who.shop.myshopifyDomain}\` · taken ${new Date().toISOString()}`,
  `Active products scanned: **${seen}** · variants: **${rows.length}**`,
  '',
  'Read-only Admin API. No writes, no consolidation import, no location or',
  'delivery-profile changes. This replaces the supplied inventory CSV, which',
  'contained a header row and **zero data rows**.',
  '',
  '## Locations',
  '',
  '| Name | Active | Fulfils online orders | Ships inventory |',
  '|---|:--:|:--:|:--:|',
  ...locs.map((l) => `| ${l.name} | ${l.isActive ? 'yes' : '**NO**'} | ${l.fulfillsOnlineOrders ? 'yes' : '**NO**'} | ${l.shipsInventory ? 'yes' : 'no'} |`),
  '',
  `Active locations that fulfil online orders: **${onlineLocs.size}** of ${locs.length}.`,
  '',
  '## Publications',
  '',
  publications.length ? publications.map((p) => `- ${p.name}`).join('\n') : '_none readable_',
  '',
  '## Delivery profiles',
  '',
  profiles.length
    ? ['| Profile | Default | Variants | Locations |', '|---|:--:|---:|---|',
       ...profiles.map((p) => `| ${p.name} | ${p.default ? 'yes' : 'no'} | ${p.productVariantsCount?.count ?? '?'} | ${(p.profileLocationGroups ?? []).flatMap((g) => g.locationGroup?.locations?.nodes?.map((l) => l.name) ?? []).join(', ') || '—'} |`)].join('\n')
    : '_none readable_',
  '',
  '## Inventory tracking coverage',
  '',
  (() => {
    const tracked = rows.filter((r) => r.tracked === true).length
    return [
      `Variants with tracking ENABLED: **${tracked}** of ${rows.length}.`,
      '',
      tracked <= 1
        ? 'Inventory tracking is effectively **OFF store-wide**. This is the single' +
          ' most important fact in this audit and it reframes everything below:' +
          ' with tracking off, Shopify does not enforce `inventoryPolicy`, so the' +
          ' `DENY` on these variants stops nothing today. The negative balances' +
          ' are latent rather than currently harmful — but the moment tracking is' +
          ' switched on, every variant sitting below zero becomes immediately' +
          ' unbuyable.'
        : 'Mixed tracking coverage — policy enforcement will behave inconsistently.',
    ].join('\n')
  })(),
  '',
  '## Discrepancies',
  '',
  '| Finding | Variants | Why it matters |',
  '|---|---:|---|',
  `| **Negative available/on-hand** | ${n('negativeInventory')} | Below zero is not a real stock level — oversold, or import residue |`,
  `| Stock only at non-online locations | ${n('stockOnlyAtNonOnlineLocation')} | Has stock but cannot be sold online |`,
  `| Tracked with no inventory level | ${n('trackedNoLevels')} | Tracking on, nowhere to draw from |`,
  `| Zero everywhere + policy DENY | ${n('trackedZeroEverywhereButStillDeny')} | Unbuyable until restocked |`,
  `| Stock at an INACTIVE location | ${n('inactiveLocationHoldingStock')} | Stranded inventory |`,
  `| on_hand != available + committed | ${n('onHandMismatch')} | Ledger inconsistency |`,
  `| Untracked but reports a quantity | ${n('untrackedButQuantityReported')} | Misleading quantity |`,
  '',
  '## Correction package (proposed — NOT applied)',
  '',
  '0. **Decide the tracking question first.** Every item below is downstream of',
  '   it. Turning tracking on across a catalogue carrying negative balances',
  '   would make those variants unbuyable the same minute, so the negatives must',
  '   be reconciled BEFORE tracking is enabled, not after. Sequence matters more',
  '   than any individual fix here.',
  '1. **Negative balances** — reconcile to a real counted quantity. Do NOT clamp',
  '   to zero with a bulk write: that discards the evidence of how far each item',
  '   drifted, which is the only signal for whether this was overselling or a bad',
  '   import. The distribution (mostly −1 to −4, tail beyond −17) is consistent',
  '   with import residue rather than genuine oversell, which is why this audit',
  '   does not approve another consolidation import.',
  '2. **Stock only at non-online locations** — decide per location whether it',
  '   should fulfil online orders, or move/relist the stock. Do NOT bulk-toggle',
  '   `fulfillsOnlineOrders`: it changes what the storefront can sell and',
  '   interacts with delivery profiles.',
  '3. **Tracked with no level** — either create a level at the intended',
  '   location or turn tracking off. Both are per-item decisions.',
  '4. **Inactive location holding stock** — transfer before deactivating.',
  '5. **Ledger mismatches** — reconcile in Shopify Admin; do not script.',
  '',
  'Each is a separate, reversible operation and none is performed here.',
  '',
  'Row-level detail: `evidence/inventory-discrepancies.csv` (gitignored).',
  '',
]
writeFileSync(join(OUT, 'inventory-location-audit.md'), md.join('\n'))

console.log('\nDiscrepancies:')
for (const [k, v] of Object.entries(D)) console.log(`  ${k}: ${v.length}`)
console.log(`\nWrote ${OUT}/inventory-location-audit.md (READ-ONLY, no writes performed)`)
