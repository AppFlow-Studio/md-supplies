import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getShippingFactsData, __resetShippingFactsCacheForTests } from '../data'
import { VALID, DUPLICATE } from './fixtures'
import { PRODUCTION_SHOP_DOMAIN, QA_SHOP_DOMAIN } from '@/lib/shopify/shop-guard'

const VALID_FIXTURE = VALID.path
const VALID_CHECKSUM = VALID.checksum
const DUPLICATE_FIXTURE = DUPLICATE.path
const DUPLICATE_CHECKSUM = DUPLICATE.checksum

beforeEach(() => {
  // Default to the shop the primary fixture declares, so cases about loading
  // and validation are not also asserting the environment gate. The gate has
  // its own describe block below.
  vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
  __resetShippingFactsCacheForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('getShippingFactsData', () => {
  it('loads successfully when the file matches the pinned checksum', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const data = getShippingFactsData()
    expect(data.ok).toBe(true)
    expect(data.productsByGid.size).toBe(20)
    expect(data.duplicateVariantGids.size).toBe(0)
  })

  it('falls back (ok: false, empty maps) on a checksum mismatch', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', '0'.repeat(64))
    const data = getShippingFactsData()
    expect(data.ok).toBe(false)
    expect(data.productsByGid.size).toBe(0)
  })

  it('falls back when the file does not exist', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', join(tmpdir(), 'does-not-exist-12345.json'))
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const data = getShippingFactsData()
    expect(data.ok).toBe(false)
  })

  it('falls back on malformed JSON', () => {
    const path = join(tmpdir(), `shipping-resolver-malformed-${Date.now()}.json`)
    writeFileSync(path, '{ this is not valid json')
    try {
      vi.stubEnv('SHIPPING_FACTS_PATH', path)
      vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', undefined as unknown as string)
      // Compute and set the correct checksum for this malformed file so we
      // reach (and fail) JSON parsing rather than the checksum check.
      vi.stubEnv(
        'SHIPPING_FACTS_CHECKSUM_SHA256',
        createHash('sha256').update(readFileSync(path)).digest('hex'),
      )
      const data = getShippingFactsData()
      expect(data.ok).toBe(false)
    } finally {
      unlinkSync(path)
    }
  })

  it('falls back on a payload that fails schema validation', () => {
    const path = join(tmpdir(), `shipping-resolver-bad-schema-${Date.now()}.json`)
    const badPayload = JSON.stringify({
      // Valid _meta, so the invalid public_display_class below is the only
      // schema violation and this case cannot pass for the wrong reason.
      _meta: { schema_version: 'v3.0', store: VALID.store },
      delivery_profiles: [],
      products: {
        'gid://shopify/Product/1': {
          handle: 'test',
          title: 'Test',
          diagnostic_status: 'clean_free',
          public_display_class: 'not-a-real-class',
          display_copy: null,
          hold: false,
          hold_reason: null,
          canada_status: 'n/a',
          variants: {},
        },
      },
    })
    writeFileSync(path, badPayload)
    try {
      vi.stubEnv('SHIPPING_FACTS_PATH', path)
      vi.stubEnv(
        'SHIPPING_FACTS_CHECKSUM_SHA256',
        createHash('sha256').update(readFileSync(path)).digest('hex'),
      )
      const data = getShippingFactsData()
      expect(data.ok).toBe(false)
    } finally {
      unlinkSync(path)
    }
  })

  it('detects a variant GID duplicated across two different products', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', DUPLICATE_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', DUPLICATE_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', DUPLICATE.store)
    const data = getShippingFactsData()
    expect(data.ok).toBe(true)
    expect(data.duplicateVariantGids.has('gid://shopify/ProductVariant/TEST-dup-variant')).toBe(true)
  })

  it('caches the result across repeated calls until reset', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const first = getShippingFactsData()
    const second = getShippingFactsData()
    expect(second).toBe(first)
  })
})

/**
 * Shopify GIDs are store-specific, so a registry from the wrong shop does not
 * merely mismatch: every lookup misses while the load still looks healthy, and
 * the site quietly shows the fallback everywhere with no signal that the wrong
 * data was mounted. The loader refuses a registry that does not describe the
 * shop this build may reach.
 */
describe('getShippingFactsData, registry-to-environment gate', () => {
  it('refuses the production registry when the build may only reach QA', () => {
    // The precise CI/Preview inheritance case: correct file, correct checksum,
    // valid schema, wrong shop.
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', QA_SHOP_DOMAIN)

    const data = getShippingFactsData()
    expect(data.ok).toBe(false)
    expect(data.productsByGid.size).toBe(0)
  })

  it('accepts the QA registry when the build may only reach QA', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', DUPLICATE_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', DUPLICATE_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', QA_SHOP_DOMAIN)

    expect(getShippingFactsData().ok).toBe(true)
  })

  it('refuses a QA registry when the build is pointed at production', () => {
    // The gate is symmetric: it is about agreement, not about QA being safe.
    vi.stubEnv('SHIPPING_FACTS_PATH', DUPLICATE_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', DUPLICATE_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', PRODUCTION_SHOP_DOMAIN)

    expect(getShippingFactsData().ok).toBe(false)
  })

  it('defaults to QA, so an environment that declares no shop cannot load production data', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')

    expect(getShippingFactsData().ok).toBe(false)
  })
})
