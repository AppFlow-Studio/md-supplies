import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getShippingFactsData, __resetShippingFactsCacheForTests } from '../data'

const VALID_FIXTURE = join(__dirname, 'fixtures/valid-payload.json')
const VALID_CHECKSUM = '802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53'
const DUPLICATE_FIXTURE = join(__dirname, 'fixtures/duplicate-variant-payload.json')
const DUPLICATE_CHECKSUM = '900b5bd2691e4491f3fd58b9ce92e353b7f43628b86157e4de1657c7d4a51865'

beforeEach(() => {
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
    expect(data.productsByGid.size).toBe(19)
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
      _meta: { schema_version: 'v3.0' },
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
