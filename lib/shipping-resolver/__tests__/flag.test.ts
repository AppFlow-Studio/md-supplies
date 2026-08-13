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

// DEV-SHIP-03: hardened per Juliette's directive — no environment-variable
// escape hatch exists anymore. The rate-confirmation guarantee is always on,
// regardless of what RATES_ONLY_SHOWS_CLAIM is set to (or not set to).
describe('isRatesOnlyClaimEnabled', () => {
  it('is always enabled when the env var is unset', () => {
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', undefined as unknown as string)
    expect(isRatesOnlyClaimEnabled()).toBe(true)
  })

  it('is always enabled regardless of the env var value', () => {
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', 'no')
    expect(isRatesOnlyClaimEnabled()).toBe(true)
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', '0')
    expect(isRatesOnlyClaimEnabled()).toBe(true)
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', 'true')
    expect(isRatesOnlyClaimEnabled()).toBe(true)
  })

  it('stays enabled even when explicitly set to "false" — the old bypass is gone', () => {
    vi.stubEnv('RATES_ONLY_SHOWS_CLAIM', 'false')
    expect(isRatesOnlyClaimEnabled()).toBe(true)
  })
})
