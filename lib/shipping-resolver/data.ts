import 'server-only'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { shippingFactsSchema, type ProductRecord } from './schema'
import { assertShopDomainAllowed, normalizeShopDomain } from '@/lib/shopify/shop-guard'

// SHA-256 of the shipping-facts-v3.json bytes actually integrated against
// (pinned 2026-07-24). The file's own self-declared
// `_meta.checksum_sha256_of_payload` does not reproduce against any tried
// canonicalization of these bytes, so this is the hash of the artifact we
// tested against, not a recomputation of the generator's internal hash.
// Override via SHIPPING_FACTS_CHECKSUM_SHA256 when the data file is
// intentionally replaced, or in tests pointed at a small fixture payload.
const DEFAULT_PINNED_PAYLOAD_SHA256 =
  '431fdd1960d77514e3fec79dfbb9403b8f735e22a690c28f2c2781a656f4d324'

export interface ShippingFactsData {
  ok: boolean
  productsByGid: Map<string, ProductRecord>
  duplicateVariantGids: Set<string>
}

const EMPTY_DATA: ShippingFactsData = {
  ok: false,
  productsByGid: new Map(),
  duplicateVariantGids: new Set(),
}

let cached: ShippingFactsData | null = null

function loadShippingFactsData(): ShippingFactsData {
  const path = process.env.SHIPPING_FACTS_PATH ?? 'data/shipping-facts-v3.json'
  const pinnedChecksum =
    process.env.SHIPPING_FACTS_CHECKSUM_SHA256 ?? DEFAULT_PINNED_PAYLOAD_SHA256

  let raw: Buffer
  try {
    raw = readFileSync(path)
  } catch (err) {
    console.error('[shipping-resolver] failed to read data file at', path, err)
    return EMPTY_DATA
  }

  const actualChecksum = createHash('sha256').update(raw).digest('hex')
  if (actualChecksum !== pinnedChecksum) {
    console.error(
      `[shipping-resolver] checksum mismatch for ${path}: expected ${pinnedChecksum}, got ${actualChecksum}. Every product falls back.`,
    )
    return EMPTY_DATA
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.toString('utf8'))
  } catch (err) {
    console.error('[shipping-resolver] failed to parse data file as JSON:', err)
    return EMPTY_DATA
  }

  const result = shippingFactsSchema.safeParse(parsed)
  if (!result.success) {
    console.error('[shipping-resolver] schema validation failed:', result.error.message)
    return EMPTY_DATA
  }

  // The registry must describe the shop this build is allowed to reach.
  // Shopify GIDs are store-specific, so a production payload loaded into a QA
  // build does not merely mismatch, it silently fails to match anything while
  // looking healthy. Refusing it makes the wrong-registry case loud instead.
  // `_meta.store` is a human label ("host (brand.com)"), so take the leading
  // host token before comparing.
  const declaredStore = normalizeShopDomain(result.data._meta.store.trim().split(/\s+/)[0])
  try {
    assertShopDomainAllowed(declaredStore, `the shipping registry at ${path} (_meta.store)`)
  } catch (err) {
    console.error(
      `[shipping-resolver] ${err instanceof Error ? err.message : String(err)} Every product falls back.`,
    )
    return EMPTY_DATA
  }

  const productsByGid = new Map<string, ProductRecord>()
  const seenVariantGids = new Set<string>()
  const duplicateVariantGids = new Set<string>()

  for (const [productGid, product] of Object.entries(result.data.products)) {
    productsByGid.set(productGid, product)
    for (const variantGid of Object.keys(product.variants)) {
      if (seenVariantGids.has(variantGid)) {
        duplicateVariantGids.add(variantGid)
      } else {
        seenVariantGids.add(variantGid)
      }
    }
  }

  return { ok: true, productsByGid, duplicateVariantGids }
}

export function getShippingFactsData(): ShippingFactsData {
  if (cached === null) cached = loadShippingFactsData()
  return cached
}

/** Test-only: forces the next getShippingFactsData() call to reload from disk. */
export function __resetShippingFactsCacheForTests(): void {
  cached = null
}
