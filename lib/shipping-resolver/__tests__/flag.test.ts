import { describe, it, expect, afterEach, vi } from 'vitest'
import { isShippingResolverEnabled } from '../flag'

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
