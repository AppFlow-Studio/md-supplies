import { describe, it, expect, afterEach, vi } from 'vitest'
import { isShippingResolverEnabled, isRatesOnlyClaimEnabled } from '../flag'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isShippingResolverEnabled', () => {
  it('is disabled when the env var is unset', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', undefined as unknown as string)
    expect(isShippingResolverEnabled()).toBe(false)
  })

  it('is disabled for any value other than the literal string "true"', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'yes')
    expect(isShippingResolverEnabled()).toBe(false)
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', '1')
    expect(isShippingResolverEnabled()).toBe(false)
  })

  it('is enabled only when set to exactly "true"', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    expect(isShippingResolverEnabled()).toBe(true)
  })
})

describe('isRatesOnlyClaimEnabled', () => {
  it('defaults to enabled (the stricter direction) when the env var is unset', () => {
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', undefined as unknown as string)
    expect(isRatesOnlyClaimEnabled()).toBe(true)
  })

  it('stays enabled for any value other than the literal string "false"', () => {
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', 'no')
    expect(isRatesOnlyClaimEnabled()).toBe(true)
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', '0')
    expect(isRatesOnlyClaimEnabled()).toBe(true)
  })

  it('is disabled only when set to exactly "false"', () => {
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', 'false')
    expect(isRatesOnlyClaimEnabled()).toBe(false)
  })
})
