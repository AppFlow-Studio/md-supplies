// READ-ONLY. Follow-up to verify-aerowalk-qa-pilot.ts: checks the five
// pinned product-level metafields (docs/launch/2026-08-14-variant-field-contract.md
// "Pinned product metafields") on the same QA AeroWalk product, now that the
// handle is known. In particular: has Izzy written real data to
// custom.shipping_returns yet (H-01), and does it survive the rich-text fix
// (lib/product/rich-text-to-plain.ts)? No writes.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_PRODUCT } from '../lib/shopify/queries/products'
import { normalizeProduct, type RawProduct } from '../lib/shopify/normalize'

const HANDLE = 'aerowalk-ultra-lite-rollator-rolling-walker-blue'

async function main() {
  const data = await storefrontFetch<{ product: RawProduct | null }>(
    GET_PRODUCT,
    { handle: HANDLE },
    { cache: 'no-store' },
  )
  if (!data.product) {
    console.log(`NOT FOUND: ${HANDLE}`)
    return
  }
  const p = normalizeProduct(data.product)
  console.log(`Product: ${p.title} (${HANDLE})\n`)
  console.log(`Rx Only (raw):              ${JSON.stringify(p.isRxOnly)}`)
  console.log(`Backorder (raw):            ${JSON.stringify(p.backorder)}`)
  console.log(`Estimated Restock Date:     ${JSON.stringify(p.estimatedRestockDate)}`)
  console.log(`Free Shipping (raw):        ${JSON.stringify(p.freeShipping)}`)
  console.log(`Vendor Shipping & Returns:  ${JSON.stringify(p.shippingReturns)}`)
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
