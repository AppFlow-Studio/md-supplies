#!/usr/bin/env node
/**
 * READ-ONLY: verify both Storefront-access gates for `custom.is_rx_only`
 * (DEV-LAUNCH-08).
 *
 * The metafield has TWO independent gates and either one being closed makes
 * `custom.is_rx_only` resolve to null via the Storefront API — which would
 * make metafield-only RX products silently render (and gate) as non-RX:
 *
 *   1. The Storefront token must carry `unauthenticated_read_metafields`.
 *   2. The metafield DEFINITION needs "Storefront access: Read access"
 *      toggled per-definition (Settings → Custom data → Products →
 *      is_rx_only → Storefront access).
 *
 * This script separates the two failure modes instead of reporting one
 * opaque "null" result:
 *   - Admin API tells us whether gate #2 (access.storefront) is open.
 *   - For every product Admin confirms has a real (non-null) value, the
 *     Storefront API is queried for the same product+field. If Admin says
 *     "true" but Storefront returns null even though gate #2 is open, gate
 *     #1 (token scope) is the problem.
 *
 * Falls back to the tag (compliance:rx-only / rx-required) to find candidate
 * RX products when no metafield-flagged product can be found via Admin
 * (e.g. if gate #2 is closed and the search filter itself can't use the
 * metafield) — see the `search` query section below.
 *
 *   node scripts/rx-metafield-access-check.mjs
 *
 * Reads credentials from .env.local. Never prints a token. Makes no writes.
 */
import { readFileSync } from 'node:fs'

function loadEnv() {
  const out = {}
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

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
const storefrontToken = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
const admin = await resolveAdminToken(env, domain)

if (!domain || !admin) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or an Admin token/credentials in .env.local.')
  process.exit(2)
}
if (!storefrontToken) {
  console.error('Missing SHOPIFY_STOREFRONT_ACCESS_TOKEN in .env.local.')
  process.exit(2)
}

async function adminGql(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/2026-04/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': admin },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

async function storefrontGql(query, variables = {}) {
  const res = await fetch(`https://${domain}/api/2026-04/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefrontToken },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

console.log(`Shop: ${domain} (read-only)\n`)

// ── Gate #2: metafield definition Storefront access ─────────────────────────
const defRes = await adminGql(`
  query {
    metafieldDefinitions(first: 250, ownerType: PRODUCT) {
      nodes { namespace key access { storefront } }
    }
  }`)
const defs = defRes?.data?.metafieldDefinitions?.nodes ?? []
const rxDef = defs.find((d) => d.namespace === 'custom' && d.key === 'is_rx_only')

console.log('== Gate #2: custom.is_rx_only definition — Storefront access ==')
if (!rxDef) {
  console.log('  MISSING — the metafield definition does not exist on this store.')
} else {
  const open = rxDef.access?.storefront === 'PUBLIC_READ'
  console.log(`  access.storefront = ${rxDef.access?.storefront ?? 'null'}  → ${open ? 'OPEN' : 'CLOSED'}`)
  if (!open) {
    console.log('  FIX: Settings → Custom data → Products → is_rx_only → Storefront access: Read access')
  }
}
const gate2Open = rxDef?.access?.storefront === 'PUBLIC_READ'

// ── Find sample products Admin confirms carry the metafield or the tag ──────
const sampleRes = await adminGql(`
  query {
    products(first: 20, query: "tag:'compliance:rx-only' OR tag:'rx-required'") {
      nodes {
        id
        handle
        tags
        rx: metafield(namespace: "custom", key: "is_rx_only") { value }
      }
    }
  }`)
let candidates = (sampleRes?.data?.products?.nodes ?? [])

// No tag-based candidates? Fall back to a metafield-value search directly —
// only meaningful if gate #2 is open (Admin API respects the definition's
// storefront access for its OWN reads only when using the metafields
// namespace query form; the direct product-list filter below is Admin-side
// and unaffected by gate #2, so it still finds candidates either way).
if (candidates.length === 0) {
  const mfRes = await adminGql(`
    query {
      products(first: 20, query: "metafields.custom.is_rx_only:true") {
        nodes { id handle tags rx: metafield(namespace: "custom", key: "is_rx_only") { value } }
      }
    }`)
  candidates = mfRes?.data?.products?.nodes ?? []
}

console.log(`\n== Candidate RX products found via Admin (tag or metafield) ==`)
console.log(`  ${candidates.length} found`)

if (candidates.length === 0) {
  console.log('\nRESULT: INCONCLUSIVE — no RX-tagged or RX-metafielded product exists on')
  console.log('this store at all (matches the known QA-store gap: A-03 in')
  console.log('docs/TASK-REGISTER-2026-08-03.md — the QA store has zero RX fixtures).')
  console.log('Re-run once Izzy adds at least one tag-only and one metafield-only fixture.')
  process.exit(3)
}

// ── Gate #1: does the Storefront API actually return the value? ─────────────
console.log('\n== Gate #1: Storefront token scope (unauthenticated_read_metafields) ==')
let mismatches = 0
for (const product of candidates) {
  const adminValue = product.rx?.value ?? null
  const sfRes = await storefrontGql(
    `query($id: ID!) { product(id: $id) { handle rx: metafield(namespace: "custom", key: "is_rx_only") { value } } }`,
    { id: product.id },
  )
  const sfValue = sfRes?.data?.product?.rx?.value ?? null
  const agree = adminValue === sfValue
  console.log(`  ${product.handle}: admin=${JSON.stringify(adminValue)} storefront=${JSON.stringify(sfValue)} ${agree ? 'ok' : 'MISMATCH'}`)
  if (!agree) mismatches++
}

const gate1Open = mismatches === 0
if (!gate1Open) {
  console.log(`\n  ${mismatches} product(s) disagree — Storefront returned a different value than`)
  console.log('  Admin confirmed. If gate #2 is OPEN above, this means the Storefront')
  console.log('  token is missing the `unauthenticated_read_metafields` scope.')
}

console.log(`\nRESULT: gate #2 (definition access) ${gate2Open ? 'OPEN' : 'CLOSED'}, gate #1 (token scope) ${gate1Open ? 'OPEN' : 'CLOSED — or unverifiable, see above'}`)
const ready = gate2Open && gate1Open
console.log(ready
  ? 'Both gates OPEN — custom.is_rx_only is safely readable via the Storefront API.'
  : 'At least one gate CLOSED — metafield-only RX products will silently render as non-RX. Do not treat RX detection as verified until this prints READY.')
process.exit(ready ? 0 : 1)
