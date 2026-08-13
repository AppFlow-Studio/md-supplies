import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetShippingFactsCacheForTests } from '../data'
import {
  resolveVariantShippingDisplay,
  resolveCardShippingDisplay,
  resolveVariantsForProduct,
} from '../resolve'
import { SHIPPING_FALLBACK_MESSAGE } from '../copy'
import { VALID, DUPLICATE, RATES_ONLY } from './fixtures'

const VALID_FIXTURE = VALID.path
const VALID_CHECKSUM = VALID.checksum
const DUPLICATE_FIXTURE = DUPLICATE.path
const DUPLICATE_CHECKSUM = DUPLICATE.checksum
const RATES_ONLY_FIXTURE = RATES_ONLY.path
const RATES_ONLY_CHECKSUM = RATES_ONLY.checksum

const FALLBACK = { class: 'unknown', message: SHIPPING_FALLBACK_MESSAGE, displayCopy: null }

beforeEach(() => {
  vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
  vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
  // These cases exercise resolution, not the environment gate. The payload is
  // real production data, which the plan permits for offline schema/resolver
  // work, so the allowed shop is set to match what the fixture declares.
  vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
  __resetShippingFactsCacheForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('resolveVariantShippingDisplay', () => {
  it('resolves a clean_free variant to standard-free', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651919917272',
      'gid://shopify/ProductVariant/46997871591640',
    )
    expect(result).toEqual({ class: 'standard-free', message: 'Free shipping', displayCopy: null })
  })

  it('resolves a clean_threshold variant to threshold, ignoring its Canada flag', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8670729830616',
      'gid://shopify/ProductVariant/48197143396568',
    )
    expect(result.class).toBe('threshold')
    expect(result).not.toHaveProperty('canada_status')
  })

  it('resolves a conditional_min_order variant with its approved display_copy', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8693220999384',
      'gid://shopify/ProductVariant/48989065150680',
    )
    expect(result.class).toBe('standard-paid')
    expect(result.displayCopy).toBe(
      'Vendor shipping is $45.95 on orders under $700 and $20.95 on orders of $700 or more. Final shipping is calculated at checkout.',
    )
  })

  it('returns the fallback for a held product (held_medplus_fulfillment_rate_pending), never the class', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8692868743384',
      'gid://shopify/ProductVariant/48984926650584',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('returns the fallback for a held product (held_rx_pending)', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8852470595800',
      'gid://shopify/ProductVariant/50340842209496',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('never reads effective_rate_class: the unsafe-FREE trap resolves to fallback, not standard-free', () => {
    // This variant has effective_rate_class FREE but public_display_class
    // unknown — the exact trap the ticket exists to prevent.
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651920310488',
      'gid://shopify/ProductVariant/46997944238296',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('resolves the sibling (genuinely free) variant on the same product correctly', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651920310488',
      'gid://shopify/ProductVariant/51930534117592',
    )
    expect(result.class).toBe('standard-free')
  })

  it('makes no threshold promise, because that wording is not approved', () => {
    // The class still resolves; only the wording is withheld. "over a vendor
    // minimum" was wrong twice: unapproved, and "over" misstates a >= rule that
    // a cart of exactly $30.00 satisfies.
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8670729830616',
      'gid://shopify/ProductVariant/48197143396568',
    )
    expect(result.class).toBe('threshold')
    expect(result.message).toBe(SHIPPING_FALLBACK_MESSAGE)
    expect(result.message).not.toMatch(/free/i)
    expect(result.message).not.toMatch(/\bover\b/i)
  })

  it('reads display_copy from the variant, not the parent product', () => {
    // Product 8743907098840 is one of 41 real cases where a variant carries
    // copy its product does not: the product's display_copy is null while this
    // variant has approved min-order wording. Reading copy from the parent
    // would silently drop it.
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8743907098840',
      'gid://shopify/ProductVariant/51930533757144',
    )
    expect(result.class).toBe('standard-paid')
    expect(result.displayCopy).toMatch(/^Vendor shipping is \$45\.95 on orders under \$700/)
  })

  it('does not lend one variant its sibling\'s copy', () => {
    // Same product, the sibling whose own copy is null. It must stay null
    // rather than inherit the other variant's terms.
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8743907098840',
      'gid://shopify/ProductVariant/49662378639576',
    )
    expect(result.class).toBe('unknown')
    expect(result.displayCopy).toBeNull()
  })

  it('returns the fallback for a missing product GID', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/does-not-exist',
      'gid://shopify/ProductVariant/does-not-exist',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('returns the fallback for an unmatched variant GID under a real product', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651919917272',
      'gid://shopify/ProductVariant/does-not-exist',
    )
    expect(result).toEqual(FALLBACK)
  })
})

describe('resolveCardShippingDisplay', () => {
  it('resolves a single-variant clean_free product to standard-free', () => {
    const result = resolveCardShippingDisplay('gid://shopify/Product/8651919917272')
    expect(result.class).toBe('standard-free')
  })

  it('falls back to unknown when variants diverge, even though one variant is genuinely free', () => {
    // 8651920310488 has one unknown variant and one standard-free variant.
    const result = resolveCardShippingDisplay('gid://shopify/Product/8651920310488')
    expect(result).toEqual(FALLBACK)
  })

  it('resolves a uniformly-unknown multi-variant product to unknown (not a divergence, just unknown)', () => {
    const result = resolveCardShippingDisplay('gid://shopify/Product/8695976394968')
    expect(result.class).toBe('unknown')
  })

  it('returns the fallback for a missing product GID', () => {
    const result = resolveCardShippingDisplay('gid://shopify/Product/does-not-exist')
    expect(result).toEqual(FALLBACK)
  })
})

describe('resolveVariantsForProduct', () => {
  it('returns the true per-variant class for every variant, even on a divergent product', () => {
    const result = resolveVariantsForProduct('gid://shopify/Product/8651920310488')
    expect(result['gid://shopify/ProductVariant/46997944238296'].class).toBe('unknown')
    expect(result['gid://shopify/ProductVariant/51930534117592'].class).toBe('standard-free')
  })

  it('returns an empty object for a missing product GID', () => {
    expect(resolveVariantsForProduct('gid://shopify/Product/does-not-exist')).toEqual({})
  })
})

describe('duplicate-variant-GID handling', () => {
  beforeEach(() => {
    vi.stubEnv('SHIPPING_FACTS_PATH', DUPLICATE_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', DUPLICATE_CHECKSUM)
    // This fixture is synthetic QA data, so the allowed shop moves with it.
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', DUPLICATE.store)
    __resetShippingFactsCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    __resetShippingFactsCacheForTests()
  })

  it('resolveVariantShippingDisplay returns the fallback for a variant GID duplicated across two products', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/TEST-dup-a',
      'gid://shopify/ProductVariant/TEST-dup-variant',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('resolveVariantsForProduct returns the fallback for a duplicated variant when called with either product GID', () => {
    // Test with first product
    const resultA = resolveVariantsForProduct('gid://shopify/Product/TEST-dup-a')
    expect(resultA['gid://shopify/ProductVariant/TEST-dup-variant']).toEqual(FALLBACK)

    // Test with second product
    const resultB = resolveVariantsForProduct('gid://shopify/Product/TEST-dup-b')
    expect(resultB['gid://shopify/ProductVariant/TEST-dup-variant']).toEqual(FALLBACK)
  })
})

describe('RATES_ONLY_SHOWS_CLAIM gate', () => {
  beforeEach(() => {
    vi.stubEnv('SHIPPING_FACTS_PATH', RATES_ONLY_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', RATES_ONLY_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', RATES_ONLY.store)
    __resetShippingFactsCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    __resetShippingFactsCacheForTests()
  })

  it('defaults to gated (unset RATES_ONLY_SHOWS_CLAIM): a standard-free variant whose effective_rate_class disagrees falls back', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/TEST-drift-single',
      'gid://shopify/ProductVariant/TEST-drift-single-v1',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('gates the card-level claim too when any variant\'s effective_rate_class disagrees', () => {
    const result = resolveCardShippingDisplay('gid://shopify/Product/TEST-drift-multi')
    expect(result).toEqual(FALLBACK)
  })

  it('gates resolveVariantsForProduct per-variant', () => {
    const result = resolveVariantsForProduct('gid://shopify/Product/TEST-drift-multi')
    expect(result['gid://shopify/ProductVariant/TEST-drift-multi-v1'].class).toBe('standard-free')
    expect(result['gid://shopify/ProductVariant/TEST-drift-multi-v2']).toEqual(FALLBACK)
  })

  // DEV-SHIP-03: hardened per Juliette's directive — RATES_ONLY_SHOWS_CLAIM
  // no longer reads the environment at all, so no value (including the
  // literal string "false", which used to bypass this check) can let a
  // rate-drifted claim through.
  it('the old "false" bypass is gone — a drifted claim stays suppressed regardless of the env var', () => {
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', 'false')
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/TEST-drift-single',
      'gid://shopify/ProductVariant/TEST-drift-single-v1',
    )
    expect(result).toEqual(FALLBACK)
  })

})
