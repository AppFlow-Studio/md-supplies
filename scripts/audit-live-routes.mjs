// Live route audit for the 25 category + 5 industry detail pages.
//
// Answers, against the real Storefront API rather than a fixture:
//   · what the authoritative product total is for each route;
//   · which approved facets actually render, in registry order;
//   · which live facets the registry deliberately drops;
//   · which registered facets are not yet published by Search & Discovery.
//
// Writes audit/live/route-audit.json and prints a table. Read-only.
//
//   node scripts/audit-live-routes.mjs

import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const DOMAIN = env.SHOPIFY_STORE_DOMAIN
const TOKEN = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

async function gql(query, variables = {}) {
  const res = await fetch(`https://${DOMAIN}/api/2026-04/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

// ── Read the registry order straight out of the source ──────────────────────
// String parsing, not a regex: the point is to report what the registry says,
// so a parser that silently returns nothing on a formatting change would
// produce a clean-looking but empty audit.
const REGISTRY_SRC = fs.readFileSync('lib/filter-registry.ts', 'utf8')

function registryOrder(key) {
  for (const raw of REGISTRY_SRC.split('\n')) {
    const line = raw.trim()
    const prefix = [`${key}: cat(`, `'${key}': cat(`].find((p) => line.startsWith(p))
    if (!prefix) continue
    const inner = line.slice(prefix.length, line.lastIndexOf(')'))
    const specific = inner.split(',').map((s) => s.trim().replace(/^M\./, '')).filter(Boolean)
    // cat() prepends Category and appends the shared tail.
    return ['customerCategory', ...specific, 'orderSize', 'brandName', 'price', 'certification']
  }
  return null
}

const METAFIELD_KEY = {
  customerCategory: 'customer_filter_category', type: 'type', material: 'material',
  gloveSize: 'glove_size', size: 'size_length_', thickness: 'thickness',
  testsFor: 'tests_for', detectableDrugs: 'detectable_drugs', adulterants: 'adulterants',
  needleGauge: 'needle_gauge', length: 'needle_length', features: 'features',
  otherFeatures: 'other_features', sterility: 'sterility', use: 'use', color: 'color',
  orderSize: 'order_size', brandName: 'brand_name', certification: 'certification',
}

const facetId = (key) => (key === 'price' ? 'filter.v.price' : `filter.p.m.custom.${METAFIELD_KEY[key]}`)

// slug, registry key, tag (null = collection-sourced)
const CATEGORIES = [
  ['gloves', 'gloves', null], ['wound-care', 'wound-care', null],
  ['needles-syringes', 'needles-syringes', null], ['surgical-sutures', 'surgical-sutures', null],
  ['testing-screening', 'testing-screening', null], ['exam-room', 'exam-room', null],
  ['respiratory', 'respiratory', null], ['mobility', 'mobility', null],
  ['patient-therapy-rehab', 'patient-therapy-rehab', null],
  ['trocars-trocar-kits', 'trocars-trocar-kits', 'surgery-procedure'],
  ['capes-gowns', 'capes-gowns', 'apparel'], ['hygiene', 'hygiene', null],
  ['disinfectants', 'disinfectants', null], ['home-care', 'home-care', null],
  ['emergency-supplies', 'emergency-supplies', null], ['incontinence', 'incontinence', null],
  ['iv-therapy', 'iv-therapy', null], ['urology-ostomy', 'urology-ostomy', null],
  ['sterilization', 'sterilization', null], ['dental', 'dental', null],
  ['housekeeping-janitorial', 'housekeeping-janitorial', null], ['bariatric', 'bariatric', null],
  ['seating', 'seating', 'room-furniture'], ['face-masks', 'face-masks', 'face-masks'],
  ['pharmacy-products', 'pharmacy-products', null],
]

const INDUSTRIES = [
  ['urgent-care', 'industry:urgent-care'], ['hrt-clinics', 'industry:hrt-surgery'],
  ['home-health', 'industry:home-care'], ['clinics-doctors-offices', 'industry:clinic'],
  ['pharmacies', 'industry:pharmacy'],
]

const SEARCH_Q = `query A($q:String!){search(query:$q,types:PRODUCT,first:1){totalCount productFilters{id label type values{count}}}}`
const COLL_FACETS_Q = `query B($h:String!){collection(handle:$h){products(first:1){filters{id label type values{count}}}}}`
const COLL_IDS_Q = `query C($h:String!,$a:String){collection(handle:$h){products(first:250,after:$a){nodes{id} pageInfo{hasNextPage endCursor}}}}`

async function collectionTotal(handle) {
  let after = null, n = 0
  for (;;) {
    const d = await gql(COLL_IDS_Q, { h: handle, a: after })
    const p = d.collection.products
    n += p.nodes.length
    if (!p.pageInfo.hasNextPage) return n
    after = p.pageInfo.endCursor
  }
}

/** Applies the same gate getAllowedFacets applies: registry order, drop empties. */
function applyRegistry(order, facets) {
  const byId = new Map(facets.map((f) => [f.id, f]))
  const rendered = []
  for (const key of order) {
    const f = byId.get(facetId(key))
    if (!f) continue
    if (f.type === 'PRICE_RANGE') { rendered.push({ label: 'Price', values: null }); continue }
    const live = f.values.filter((v) => v.count > 0).length
    if (live === 0) continue
    rendered.push({ label: f.label, values: live })
  }
  const allowedIds = new Set(order.map(facetId))
  return {
    rendered,
    droppedByRegistry: facets.filter((f) => !allowedIds.has(f.id)).map((f) => f.label),
    registeredNotLive: order.filter((k) => !byId.has(facetId(k))).map((k) => METAFIELD_KEY[k] ?? k),
  }
}

const rows = []
const pad = (s, n) => String(s).padEnd(n)

console.log(`${pad('ROUTE', 34)}${'TOTAL'.padStart(6)}  FACETS RENDERED (registry order)`)
console.log('─'.repeat(120))

for (const [slug, key, tag] of CATEGORIES) {
  let facets, total
  if (tag) {
    const d = await gql(SEARCH_Q, { q: `tag:"category:${tag}"` })
    facets = d.search.productFilters
    total = d.search.totalCount
  } else {
    facets = (await gql(COLL_FACETS_Q, { h: slug })).collection.products.filters
    total = await collectionTotal(slug)
  }
  const order = registryOrder(key)
  if (!order) { console.log(`${pad('/category/' + slug, 34)}  !! no registry entry for "${key}"`); continue }
  const r = applyRegistry(order, facets)
  rows.push({ route: `/category/${slug}`, source: tag ? `tag:category:${tag}` : `collection:${slug}`, total, ...r })
  console.log(`${pad('/category/' + slug, 34)}${String(total).padStart(6)}  ${r.rendered.map((f) => (f.values === null ? f.label : `${f.label}(${f.values})`)).join(' › ')}`)
  if (r.droppedByRegistry.length) console.log(`${' '.repeat(42)}dropped: ${r.droppedByRegistry.join(', ')}`)
  if (r.registeredNotLive.length) console.log(`${' '.repeat(42)}registered but not published: ${r.registeredNotLive.join(', ')}`)
}

for (const [slug, tag] of INDUSTRIES) {
  const d = await gql(SEARCH_Q, { q: `tag:"${tag}"` })
  const order = registryOrder(slug)
  if (!order) { console.log(`${pad('/industries/' + slug, 34)}  !! no registry entry`); continue }
  const r = applyRegistry(order, d.search.productFilters)
  rows.push({ route: `/industries/${slug}`, source: `tag:${tag}`, total: d.search.totalCount, ...r })
  console.log(`${pad('/industries/' + slug, 34)}${String(d.search.totalCount).padStart(6)}  ${r.rendered.map((f) => (f.values === null ? f.label : `${f.label}(${f.values})`)).join(' › ')}`)
  if (r.registeredNotLive.length) console.log(`${' '.repeat(42)}registered but not published: ${r.registeredNotLive.join(', ')}`)
}

fs.mkdirSync('audit/live', { recursive: true })
fs.writeFileSync('audit/live/route-audit.json', JSON.stringify(rows, null, 2))
console.log(`\nWrote audit/live/route-audit.json (${rows.length} routes)`)
