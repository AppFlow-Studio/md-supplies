import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { __resetShippingFactsCacheForTests, getShippingFactsData } from '../data'
import { resolveVariantShippingDisplay, resolveCardShippingDisplay } from '../resolve'
import { SHIPPING_FALLBACK_MESSAGE } from '../copy'
import { QA_SHOP_DOMAIN, PRODUCTION_SHOP_DOMAIN } from '@/lib/shopify/shop-guard'

/**
 * The QA-only registry, keyed to the QA development store's real product and
 * variant GIDs. Shopify GIDs are store-specific, so this file identifies QA
 * fixtures and nothing else: it is what a connected QA build must load, and the
 * production package must never be loaded in its place.
 *
 * Generated from a read-only Admin pull of the QA store. The classes are test
 * behaviour, not client policy.
 */
const QA_REGISTRY = join(process.cwd(), 'data', 'shipping-facts-qa.json')
const QA_CHECKSUM = createHash('sha256').update(readFileSync(QA_REGISTRY)).digest('hex')

// Real GIDs from the QA store.
const FREE = {
  product: 'gid://shopify/Product/9353136144617',
  handle: 'qa-free',
}

function gidsFor(handle: string) {
  const payload = JSON.parse(readFileSync(QA_REGISTRY, 'utf8'))
  const entry = Object.entries(payload.products as Record<string, { handle: string; variants: object }>)
    .find(([, p]) => p.handle === handle)
  if (!entry) throw new Error(`QA registry has no fixture for ${handle}`)
  return { productGid: entry[0], variantGids: Object.keys(entry[1].variants) }
}

beforeEach(() => {
  vi.stubEnv('SHIPPING_FACTS_PATH', QA_REGISTRY)
  vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', QA_CHECKSUM)
  vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', QA_SHOP_DOMAIN)
  __resetShippingFactsCacheForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('QA fixture registry', () => {
  it('loads in a QA build: valid schema, matching shop, no duplicate GIDs', () => {
    const data = getShippingFactsData()
    expect(data.ok).toBe(true)
    expect(data.productsByGid.size).toBe(17)
    expect(data.duplicateVariantGids.size).toBe(0)
  })

  it('is refused in a build allowed to reach production', () => {
    // The other half of the environment gate: QA identity is not a free pass,
    // the registry and the build simply have to agree.
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', PRODUCTION_SHOP_DOMAIN)
    __resetShippingFactsCacheForTests()
    expect(getShippingFactsData().ok).toBe(false)
  })

  it('carries only QA GIDs, never a production identity', () => {
    const payload = JSON.parse(readFileSync(QA_REGISTRY, 'utf8'))
    expect(payload._meta.store).toBe(QA_SHOP_DOMAIN)
    expect(JSON.stringify(payload)).not.toContain('daebb2-76')
  })

  it('resolves the free fixture to the one approved claim', () => {
    const { productGid, variantGids } = gidsFor('qa-free')
    expect(productGid).toBe(FREE.product)
    const d = resolveVariantShippingDisplay(productGid, variantGids[0])
    expect(d.class).toBe('standard-free')
    expect(d.message).toBe('Free shipping')
  })

  it('makes no promise on the threshold fixture, wording being unapproved', () => {
    const { productGid, variantGids } = gidsFor('qa-dukal-threshold')
    const d = resolveVariantShippingDisplay(productGid, variantGids[0])
    expect(d.class).toBe('threshold')
    expect(d.message).toBe(SHIPPING_FALLBACK_MESSAGE)
  })

  it('shows approved display_copy on the min-order fixture, the one case copy is allowed', () => {
    const { productGid, variantGids } = gidsFor('qa-min-order-700')
    const d = resolveVariantShippingDisplay(productGid, variantGids[0])
    expect(d.displayCopy).toMatch(/^Vendor shipping is \$45\.95 on orders under \$700/)
  })

  it('suppresses the claim on a held fixture without hiding it', () => {
    // A hold may withhold a promise. It may never block a purchase, so the
    // resolver's only job here is to fall back.
    const { productGid, variantGids } = gidsFor('qa-medplus-30')
    expect(resolveVariantShippingDisplay(productGid, variantGids[0]).message).toBe(
      SHIPPING_FALLBACK_MESSAGE,
    )
  })

  it('falls back on the no-rate and invalid-data fixtures rather than inventing a rate', () => {
    for (const handle of ['qa-no-rate', 'qa-invalid-data']) {
      const { productGid, variantGids } = gidsFor(handle)
      expect(resolveVariantShippingDisplay(productGid, variantGids[0]).message, handle).toBe(
        SHIPPING_FALLBACK_MESSAGE,
      )
    }
  })

  it('keeps the card conservative when variants diverge, while each variant tells the truth', () => {
    const { productGid, variantGids } = gidsFor('qa-mixed-profile')
    expect(variantGids).toHaveLength(2)
    // Card: one product, two answers, so it commits to neither.
    expect(resolveCardShippingDisplay(productGid).message).toBe(SHIPPING_FALLBACK_MESSAGE)
    // Variants: each resolves to its own class.
    const classes = variantGids.map((v) => resolveVariantShippingDisplay(productGid, v).class)
    expect(new Set(classes).size).toBe(2)
  })

  it('never lets a free-shipping product tag stand in for a class', () => {
    // qa-free carries the raw `free-shipping` tag in Shopify, and qa-no-rate
    // does not. The registry is what decides, so the tag is irrelevant either
    // way: an unresolvable GID falls back even on a tagged product.
    const { productGid } = gidsFor('qa-free')
    const d = resolveVariantShippingDisplay(productGid, 'gid://shopify/ProductVariant/not-a-real-variant')
    expect(d.message).toBe(SHIPPING_FALLBACK_MESSAGE)
  })
})
