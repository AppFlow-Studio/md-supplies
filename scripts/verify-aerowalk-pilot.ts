// READ-ONLY. Verifies Izzy's 2026-08-15 AeroWalk QA write against the real
// QA Storefront API: product 9365094531305 exists, resolves to a handle,
// and each of the three color variants (Blue/White/Grey, IDs from her
// Slack reply) carries its own native image plus all four variant
// metafields from docs/launch/2026-08-14-variant-field-contract.md. No writes.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { GET_PRODUCT } from '../lib/shopify/queries/products'
import { normalizeProduct, type RawProduct } from '../lib/shopify/normalize'
import { assertShopDomainAllowed } from '../lib/shopify/shop-guard'

// Inlined rather than importing lib/shopify/storefront.ts: that module (and
// lib/env.server.ts) are marked 'server-only', which throws unconditionally
// outside Next's own bundler — including under plain tsx. shop-guard.ts is
// deliberately free of that marker for exactly this reason (scripts/tests).
async function storefrontFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const domain = assertShopDomainAllowed(process.env.SHOPIFY_STORE_DOMAIN)
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
  if (!token) throw new Error('Missing SHOPIFY_STOREFRONT_ACCESS_TOKEN')

  const res = await fetch(`https://${domain}/api/2026-04/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Storefront API HTTP ${res.status}: ${res.statusText}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map((e: { message: string }) => e.message).join('\n'))
  return json.data
}

const PRODUCT_GID = 'gid://shopify/Product/9365094531305'
const EXPECTED_VARIANTS = [
  { color: 'Blue', gid: 'gid://shopify/ProductVariant/51633171923177' },
  { color: 'White', gid: 'gid://shopify/ProductVariant/51633171955945' },
  { color: 'Grey', gid: 'gid://shopify/ProductVariant/51633171988713' },
]

const GET_PRODUCT_HANDLE_BY_ID = `#graphql
  query GetProductHandleById($id: ID!) {
    product(id: $id) { handle }
  }
`

async function main() {
  console.log(`Resolving handle for ${PRODUCT_GID} ...`)
  const byId = await storefrontFetch<{ product: { handle: string } | null }>(
    GET_PRODUCT_HANDLE_BY_ID,
    { id: PRODUCT_GID },
  )
  if (!byId.product) {
    console.log('  NOT FOUND via Storefront API on this store — check SHOPIFY_STORE_DOMAIN / the ID.')
    process.exit(1)
  }
  const handle = byId.product.handle
  console.log(`  handle: ${handle}\n`)

  const data = await storefrontFetch<{ product: RawProduct | null }>(
    GET_PRODUCT,
    { handle },
  )
  if (!data.product) {
    console.log('NOT FOUND via handle — unexpected given the ID lookup just succeeded.')
    process.exit(1)
  }
  const product = normalizeProduct(data.product)
  console.log(`Product: "${product.title}" (${product.id})`)
  console.log(`  id matches expected GID: ${product.id === PRODUCT_GID}`)
  console.log(`  images on product: ${product.images.nodes.length}`)
  console.log(`  collections: ${product.collections.nodes.map((c) => c.handle).join(', ') || '(none)'}\n`)

  const seenImageIds = new Set<string>()
  let allOk = true

  for (const { color, gid } of EXPECTED_VARIANTS) {
    const variant = product.variants.nodes.find((v) => v.id === gid)
    console.log(`${'='.repeat(70)}\n${color}  (${gid})`)
    if (!variant) {
      console.log('  NOT FOUND on this product — GID mismatch or not on QA yet.')
      allOk = false
      continue
    }
    const hasOwnImage = Boolean(variant.image)
    const imageReused = variant.image ? seenImageIds.has(variant.image.id) : false
    if (variant.image) seenImageIds.add(variant.image.id)

    console.log(`  sku: ${variant.sku}`)
    console.log(`  image: ${variant.image ? variant.image.url : 'MISSING'}${imageReused ? '  <-- REUSED from another variant!' : ''}`)
    console.log(`  manufacturerNumber: ${JSON.stringify(variant.manufacturerNumber)}`)
    console.log(`  orderSize:          ${JSON.stringify(variant.orderSize)}`)
    console.log(`  unitsPerOrder:      ${JSON.stringify(variant.unitsPerOrder)}`)
    console.log(`  description:        ${JSON.stringify(variant.description)}`)

    const fieldsOk =
      variant.manufacturerNumber != null &&
      variant.orderSize != null &&
      variant.unitsPerOrder != null
    if (!hasOwnImage || imageReused || !fieldsOk) allOk = false
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(allOk ? 'PASS — AeroWalk pilot data verified on QA.' : 'FAIL — see gaps above.')
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
