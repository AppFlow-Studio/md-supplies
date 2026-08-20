// READ-ONLY. Izzy's three named QA products for the LG-04 packaging
// breakdown (custom.inner_pack_quantity / packs_per_case / total_order_quantity,
// 2026-08-17): confirms the query + normalize wiring resolves exactly the
// shape each product is supposed to exercise (blank total, total-only, and
// fully-empty-for-fallback-checking). No writes.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_PRODUCT } from '../lib/shopify/queries/products'
import { normalizeProduct, type RawProduct } from '../lib/shopify/normalize'

const HANDLES = [
  '3cc-23g-x-1-1-2-im-thin-wall-luer-lok-tip-box-309589',
  '1cc-27g-x-1-2-luer-lok-syringe-detachable-needle-box-305789',
  'pen-needle-4mm-depth-32g-x-5-32-box-9543',
]

async function main() {
  for (const handle of HANDLES) {
    console.log(`${'='.repeat(70)}\n${handle}`)
    const data = await storefrontFetch<{ product: RawProduct | null }>(
      GET_PRODUCT,
      { handle },
      { cache: 'no-store' },
    )
    if (!data.product) {
      console.log('  NOT FOUND via Storefront API')
      continue
    }
    const product = normalizeProduct(data.product)
    for (const v of product.variants.nodes) {
      console.log(`  ${v.title} (sku ${v.sku}):`)
      console.log(`    orderSize=${v.orderSize} unitsPerOrder=${v.unitsPerOrder}`)
      console.log(`    innerPackQuantity=${v.innerPackQuantity} packsPerCase=${v.packsPerCase} totalOrderQuantity=${v.totalOrderQuantity}`)
    }
  }
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
