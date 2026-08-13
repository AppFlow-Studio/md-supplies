// READ-ONLY. Proves, for 3 hand-selected "Approved" products, each of:
// custom.free_shipping=true, public_display_class=standard-free,
// effective_rate_class=FREE (per variant), and the final gated ShippingDisplay
// the app would attach. No writes.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_PRODUCT } from '../lib/shopify/queries/products'
import { normalizeProduct, type RawProduct } from '../lib/shopify/normalize'
import { resolveCardShippingDisplay } from '../lib/shipping-resolver/resolve'
import { gateFreeShippingClaim, isFreeShippingMetafieldTrue } from '../lib/shipping-resolver/free-shipping-gate'
import { getShippingFactsData } from '../lib/shipping-resolver/data'
import { isShippingResolverEnabled } from '../lib/shipping-resolver/flag'

const PRODUCTS = [
  { handle: 'flu-covid-rapid-test-clia-waived-no-analyzer-cordx-25', gid: 'gid://shopify/Product/8759321952472' },
  { handle: 'devilbiss-5-liter-oxygen-concentrator-525ds', gid: 'gid://shopify/Product/8889179013336' },
  { handle: '3-2mm-3-piece-resin-disposable-trocar-only-b6819', gid: 'gid://shopify/Product/8651919917272' },
]

async function main() {
  console.log(`isShippingResolverEnabled(): ${isShippingResolverEnabled()}`)
  const facts = getShippingFactsData()
  console.log(`Shipping-facts registry: ok=${facts.ok}, products=${facts.productsByGid.size}\n`)

  for (const { handle, gid } of PRODUCTS) {
    console.log(`${'='.repeat(70)}\n${handle}  (${gid})`)

    const data = await storefrontFetch<{ product: RawProduct | null }>(
      GET_PRODUCT,
      { handle },
      { cache: 'no-store' },
    )
    if (!data.product) {
      console.log('  NOT FOUND via Storefront API')
      continue
    }
    const raw = data.product
    const idMatches = raw.id === gid
    const product = normalizeProduct(raw)

    const metafieldTrue = isFreeShippingMetafieldTrue(product.freeShipping)
    console.log(`  1. custom.free_shipping raw: ${JSON.stringify(product.freeShipping)} -> true? ${metafieldTrue}`)
    console.log(`     product id matches expected GID: ${idMatches}`)

    const registryProduct = facts.productsByGid.get(gid)
    if (!registryProduct) {
      console.log('  NOT IN shipping-facts registry')
      continue
    }
    console.log(`  2. public_display_class per variant:`)
    for (const [vGid, v] of Object.entries(registryProduct.variants)) {
      console.log(`     ${vGid}: public_display_class=${v.public_display_class}  effective_rate_class=${v.effective_rate_class}`)
    }

    const resolverDisplay = resolveCardShippingDisplay(gid)
    console.log(`  3. resolveCardShippingDisplay(): ${JSON.stringify(resolverDisplay)}`)

    const gated = gateFreeShippingClaim(resolverDisplay, product.freeShipping)
    console.log(`  4. gateFreeShippingClaim() final: ${JSON.stringify(gated)}`)
    console.log(`  5. Badge should show: ${gated.class === 'standard-free' ? 'YES' : 'NO'}`)
  }
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
