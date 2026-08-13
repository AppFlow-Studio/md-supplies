// READ-ONLY. Checks the given product handles' live custom.backorder value
// via the Storefront API, and the resolved label. No writes.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_PRODUCT } from '../lib/shopify/queries/products'
import { normalizeProduct, type RawProduct } from '../lib/shopify/normalize'
import { resolveBackorderLabel, isBackorderedMetafield } from '../lib/labels/labels'

const HANDLES = [
  'plastic-hub-dental-needle-30g-short-3-4-21mm-l-box-8881400074',
  'iv-catheter-14g-x-1-3-4-box-381467',
  'tb-syringe-1ml-27g-x-1-2-box-8881501368',
  'non-sterile-alcohol-pad-2-ply-medium-852',
  '1ml-syringe-only-luer-lock-box-26050', // negative control
]

async function main() {
  for (const handle of HANDLES) {
    console.log(`${'='.repeat(70)}\n${handle}`)
    try {
      const data = await storefrontFetch<{ product: RawProduct | null }>(
        GET_PRODUCT,
        { handle },
        { cache: 'no-store' },
      )
      if (!data.product) {
        console.log('  NOT FOUND')
        continue
      }
      const product = normalizeProduct(data.product)
      const isTrue = isBackorderedMetafield(product.backorder)
      const label = resolveBackorderLabel({ isBackordered: product.backorder, estimatedRestockDate: product.estimatedRestockDate })
      console.log(`  custom.backorder raw: ${JSON.stringify(product.backorder)} -> true? ${isTrue}`)
      console.log(`  estimatedRestockDate: ${JSON.stringify(product.estimatedRestockDate)}`)
      console.log(`  backorderRestockEta:  ${JSON.stringify(product.backorderRestockEta)}`)
      console.log(`  resolved label: ${label ? JSON.stringify(label) : 'null (no Backorder label)'}`)
    } catch (err) {
      console.log('  FAILED:', err instanceof Error ? err.message : err)
    }
  }
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
