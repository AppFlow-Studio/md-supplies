#!/usr/bin/env node
/**
 * DRY RUN ONLY — plans product↔label assignments. Performs NO Shopify writes.
 *
 *   node scripts/labels-assign-dryrun.mjs <input.csv> [--out docs/audits/2026-08-02-catalog-cro]
 *
 * INPUT CSV (header row required; column order free):
 *   product_id   Shopify product GID or numeric id   — preferred identity
 *   handle       product handle                      — fallback identity
 *   sku          REFERENCE ONLY, never used to match (3,166 SKUs span >1 product)
 *   label        the product_label internal_name to assign
 *
 * Identity rule: product_id wins; otherwise the handle is resolved read-only
 * against Shopify and must match exactly one product. A row that resolves to
 * zero or multiple products is REJECTED, never guessed.
 *
 * OUTPUTS (written, not applied):
 *   labels-proposed-writes.json   what WOULD be written, per product
 *   labels-rollback.json          each product's CURRENT value, to restore
 *   labels-rejected.csv           rows that could not be safely resolved
 *
 * Nothing here mutates Shopify. Applying the plan is a separate, approved step.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [, , inputPath, ...rest] = process.argv
if (!inputPath) {
  console.error('Usage: node scripts/labels-assign-dryrun.mjs <input.csv> [--out <dir>]')
  process.exit(2)
}
const outIdx = rest.indexOf('--out')
const OUT_DIR = outIdx >= 0 ? rest[outIdx + 1] : 'docs/audits/2026-08-02-catalog-cro'
mkdirSync(OUT_DIR, { recursive: true })

function loadEnv() {
  const out = {}
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
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

const env = loadEnv()
const domain = env.SHOPIFY_STORE_DOMAIN
const admin = await resolveAdminToken(env, domain)

async function gql(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': admin },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300))
  return json.data
}

/** Minimal RFC4180-ish CSV parser (handles quoted fields and embedded commas). */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const header = rows.shift().map((h) => h.trim().toLowerCase())
  return rows.filter((r) => r.some((v) => v.trim())).map((r) =>
    Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])))
}

const rows = parseCsv(readFileSync(inputPath, 'utf8'))
console.log(`Input rows: ${rows.length}`)

// ── Read existing labels (metaobjects) so unknown label names are rejected ──
const labelEntries = new Map()
{
  let after = null
  while (true) {
    const d = await gql(`
      query($after: String) {
        metaobjects(type: "product_label", first: 250, after: $after) {
          nodes { id handle fields { key value } }
          pageInfo { hasNextPage endCursor }
        }
      }`, { after })
    for (const n of d.metaobjects.nodes) {
      const name = n.fields.find((f) => f.key === 'internal_name')?.value
      if (name) labelEntries.set(name.trim().toLowerCase(), n.id)
    }
    if (!d.metaobjects.pageInfo.hasNextPage) break
    after = d.metaobjects.pageInfo.endCursor
  }
}
console.log(`Existing product_label entries: ${labelEntries.size}`)
if (labelEntries.size === 0) {
  console.log('No label metaobjects exist yet — create them first (docs/fordeer-replacement.md).')
}

const proposed = []
const rollback = []
const rejected = []

for (const r of rows) {
  const wantLabel = (r.label ?? '').trim()
  if (!wantLabel) { rejected.push({ ...r, reason: 'no label column value' }); continue }
  const labelId = labelEntries.get(wantLabel.toLowerCase())
  if (!labelId) { rejected.push({ ...r, reason: `label "${wantLabel}" does not exist in Shopify` }); continue }

  // Identity: GID > numeric id > handle. SKU is never used to match.
  let gid = null
  if (r.product_id) {
    gid = r.product_id.startsWith('gid://') ? r.product_id : `gid://shopify/Product/${r.product_id}`
  } else if (r.handle) {
    const d = await gql(`query($h: String!) { productByHandle(handle: $h) { id } }`, { h: r.handle })
    if (!d.productByHandle) { rejected.push({ ...r, reason: `handle "${r.handle}" resolved to no product` }); continue }
    gid = d.productByHandle.id
  } else {
    rejected.push({ ...r, reason: 'no product_id or handle (sku is reference only)' }); continue
  }

  // Current value → rollback record.
  const cur = await gql(`
    query($id: ID!) {
      product(id: $id) {
        id handle title
        metafield(namespace: "custom", key: "product_labels") { value }
      }
    }`, { id: gid })
  if (!cur.product) { rejected.push({ ...r, reason: `product ${gid} not found` }); continue }

  let existing = []
  try { existing = cur.product.metafield?.value ? JSON.parse(cur.product.metafield.value) : [] }
  catch { existing = [] }

  rollback.push({
    productId: cur.product.id,
    handle: cur.product.handle,
    previousValue: cur.product.metafield?.value ?? null,
  })

  const next = existing.includes(labelId) ? existing : [...existing, labelId]
  proposed.push({
    productId: cur.product.id,
    handle: cur.product.handle,
    title: cur.product.title,
    label: wantLabel,
    labelId,
    currentValue: cur.product.metafield?.value ?? null,
    proposedValue: JSON.stringify(next),
    noop: existing.includes(labelId),
  })
}

writeFileSync(join(OUT_DIR, 'labels-proposed-writes.json'), JSON.stringify(proposed, null, 2))
writeFileSync(join(OUT_DIR, 'labels-rollback.json'), JSON.stringify(rollback, null, 2))
writeFileSync(join(OUT_DIR, 'labels-rejected.csv'),
  ['reason,product_id,handle,sku,label',
    ...rejected.map((r) => [r.reason, r.product_id ?? '', r.handle ?? '', r.sku ?? '', r.label ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n'))

console.log(`\nDRY RUN COMPLETE — no Shopify writes were made.`)
console.log(`  would change : ${proposed.filter((p) => !p.noop).length}`)
console.log(`  already set  : ${proposed.filter((p) => p.noop).length}`)
console.log(`  rejected     : ${rejected.length}`)
console.log(`\nWrote to ${OUT_DIR}: labels-proposed-writes.json · labels-rollback.json · labels-rejected.csv`)
