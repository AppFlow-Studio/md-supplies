#!/usr/bin/env node
/**
 * READ-ONLY: detect whether the product-label definitions exist in Shopify.
 *
 * Makes no writes of any kind. Run before the dry-run assignment tool so you
 * know whether the storefront can see labels yet.
 *
 *   node scripts/labels-detect-definitions.mjs
 *
 * Reads credentials from .env.local. Never prints a token.
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

const env = loadEnv()
const domain = env.SHOPIFY_STORE_DOMAIN
const admin = env.SHOPIFY_ADMIN_ACCESS_TOKEN || env.SHOPIFY_ADMIN_TOKEN
if (!domain || !admin) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or an Admin token in .env.local.')
  process.exit(2)
}

async function gql(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': admin },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

const REQUIRED_FIELDS = [
  'internal_name', 'text', 'accessible_text', 'style',
  'priority', 'starts_at', 'ends_at', 'destination_url', 'is_active',
]

console.log(`Shop: ${domain} (read-only)\n`)

// 1. metaobject definition
const mo = await gql(`
  query { metaobjectDefinitions(first: 100) {
    nodes { type name fieldDefinitions { key name required } }
  } }`)
const defs = mo?.data?.metaobjectDefinitions?.nodes ?? []
const labelDef = defs.find((d) => d.type === 'product_label')

console.log('== metaobject `product_label` ==')
if (!labelDef) {
  console.log('  MISSING — create it (docs/fordeer-replacement.md, Step 1).')
} else {
  const keys = labelDef.fieldDefinitions.map((f) => f.key)
  console.log(`  FOUND — ${keys.length} fields`)
  for (const want of REQUIRED_FIELDS) {
    console.log(`    ${keys.includes(want) ? 'ok     ' : 'MISSING'} ${want}`)
  }
}

// 2. product metafield definition
const mf = await gql(`
  query { metafieldDefinitions(first: 250, ownerType: PRODUCT) {
    nodes { namespace key type { name } }
  } }`)
const mfs = mf?.data?.metafieldDefinitions?.nodes ?? []
const labelsMf = mfs.find((d) => d.namespace === 'custom' && d.key === 'product_labels')

console.log('\n== product metafield `custom.product_labels` ==')
if (!labelsMf) {
  console.log('  MISSING — create it (docs/fordeer-replacement.md, Step 2).')
} else {
  console.log(`  FOUND — type ${labelsMf.type?.name}`)
  if (labelsMf.type?.name !== 'list.metaobject_reference') {
    console.log('  WARNING: expected list.metaobject_reference')
  }
}

// 3. any Fordeer-owned data (there was none as of 2026-08-02)
const fordeer = [...mfs, ...defs].filter((d) =>
  /fordeer/i.test(`${d.namespace ?? ''} ${d.key ?? ''} ${d.type ?? ''} ${d.name ?? ''}`))
console.log('\n== Fordeer-owned Shopify data ==')
console.log(fordeer.length ? fordeer.map((d) => `  ${d.namespace ?? d.type}.${d.key ?? ''}`).join('\n')
  : '  none (Fordeer stores rules in its own DB and renders via a theme app embed)')

const ready = Boolean(labelDef && labelsMf)
console.log(`\nRESULT: label system ${ready ? 'READY — storefront can read labels' : 'NOT READY — definitions missing; storefront correctly renders nothing'}`)
process.exit(ready ? 0 : 1)
