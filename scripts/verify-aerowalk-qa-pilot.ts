// READ-ONLY. Bilal's launch-direction message (2026-08-16) named the QA
// AeroWalk pilot by numeric Shopify ID rather than handle — product
// 9365094531305, variants Blue 51633171923177 / White 51633171955945 /
// Grey 51633171988713. GET_PRODUCT only takes a handle, so this resolves the
// handle from the ID directly against the QA store and dumps the four
// confirmed variant metafields (docs/launch/2026-08-14-variant-field-contract.md)
// per color, so verification doesn't have to wait on a separate Slack round
// trip for the handle once Izzy's write lands. No writes.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { storefrontFetch } from '../lib/shopify/storefront'

const PRODUCT_GID = 'gid://shopify/Product/9365094531305'
const EXPECTED_VARIANTS: Record<string, string> = {
  'gid://shopify/ProductVariant/51633171923177': 'Blue',
  'gid://shopify/ProductVariant/51633171955945': 'White',
  'gid://shopify/ProductVariant/51633171988713': 'Grey',
}

const QUERY = `#graphql
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      handle
      title
      variants(first: 20) {
        nodes {
          id
          title
          sku
          image { url }
          manufacturerNumber: metafield(namespace: "custom", key: "manufacturer_item_number") { value }
          orderSize: metafield(namespace: "custom", key: "order_size") { value }
          unitsPerOrder: metafield(namespace: "custom", key: "units_per_order") { value }
          description: metafield(namespace: "custom", key: "variant_description") { value }
        }
      }
    }
  }
`

type RawVariant = {
  id: string
  title: string
  sku: string | null
  image: { url: string } | null
  manufacturerNumber: { value: string } | null
  orderSize: { value: string } | null
  unitsPerOrder: { value: string } | null
  description: { value: string } | null
}

async function main() {
  console.log(`Querying QA store for ${PRODUCT_GID}...\n`)
  const data = await storefrontFetch<{ product: { id: string; handle: string; title: string; variants: { nodes: RawVariant[] } } | null }>(
    QUERY,
    { id: PRODUCT_GID },
    { cache: 'no-store' },
  )

  if (!data.product) {
    console.log('NOT FOUND via Storefront API — either the product does not exist on this store, or the QA data has not been written/published yet.')
    return
  }

  const { handle, title, variants } = data.product
  console.log(`Found: "${title}"`)
  console.log(`Handle: ${handle}`)
  console.log(`PDP:      /product/${handle}`)
  console.log(`Category: /category/<collection-slug>/${handle}\n`)

  for (const [gid, expectedColor] of Object.entries(EXPECTED_VARIANTS)) {
    const v = variants.nodes.find((n) => n.id === gid)
    console.log(`${'='.repeat(70)}\n${expectedColor}  (${gid})`)
    if (!v) {
      console.log('  NOT FOUND on this product — check the ID or whether it was moved.')
      continue
    }
    const deepLink = `?variant=${encodeURIComponent(gid)}`
    console.log(`  Deep link:  /product/${handle}${deepLink}`)
    console.log(`  title: ${v.title}`)
    console.log(`  sku (internal): ${v.sku}`)
    console.log(`  image: ${v.image?.url ?? 'NONE — will show shared gallery placeholder, not a sibling color'}`)
    console.log(`  manufacturerNumber: ${v.manufacturerNumber?.value ?? 'null (metafield definition missing, no PUBLIC_READ, or not written yet)'}`)
    console.log(`  orderSize: ${v.orderSize?.value ?? 'null'}`)
    console.log(`  unitsPerOrder: ${v.unitsPerOrder?.value ?? 'null'}`)
    console.log(`  description: ${v.description?.value ?? 'null'}`)
  }

  const allFourPopulated = Object.keys(EXPECTED_VARIANTS).every((gid) => {
    const v = variants.nodes.find((n) => n.id === gid)
    return v?.manufacturerNumber?.value && v?.orderSize?.value && v?.unitsPerOrder?.value
  })
  console.log(`\n${'='.repeat(70)}`)
  console.log(allFourPopulated
    ? 'All three variants carry manufacturer number, order size, and units per order — ready for the screenshot checklist.'
    : 'At least one variant is still missing data or the metafield definitions lack Storefront PUBLIC_READ — not ready yet.')
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
