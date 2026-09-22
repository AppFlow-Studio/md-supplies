import { describe, it, expect, afterEach } from 'vitest'
import { isPersistentVendorAttributionEnabled } from '@/lib/analytics/vendor-attribution-flag'

const VAR = 'ENABLE_PERSISTENT_VENDOR_ATTRIBUTION'
const original = process.env[VAR]

afterEach(() => {
  if (original === undefined) delete process.env[VAR]
  else process.env[VAR] = original
})

/**
 * The commercial scope boundary. Persistent vendor attribution is built but
 * must not run until the extra scope is funded, so every ambiguous value has
 * to fail to DISABLED — a misconfigured deploy may only ever fail closed.
 */
describe('isPersistentVendorAttributionEnabled', () => {
  it('is DISABLED when the variable is unset — the critical safety case', () => {
    delete process.env[VAR]
    expect(isPersistentVendorAttributionEnabled()).toBe(false)
  })

  it('is ENABLED only for the exact string "true"', () => {
    process.env[VAR] = 'true'
    expect(isPersistentVendorAttributionEnabled()).toBe(true)
  })

  it.each(['false', '0', '', ' ', 'TRUE', 'True', 'yes', '1', 'on', 'enabled', 'ture'])(
    'is DISABLED for %j',
    (value) => {
      process.env[VAR] = value
      expect(isPersistentVendorAttributionEnabled()).toBe(false)
    },
  )

  it('is not a NEXT_PUBLIC_ variable, so it can never be inlined into a client bundle', async () => {
    // Enforcement has to be server-side: both gated paths (proxy.ts's cookie
    // write and app/actions/cart.ts's Shopify stamping) run on the server, and
    // the funding boundary must not be flippable from a URL or the console.
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('lib/analytics/vendor-attribution-flag.ts', 'utf8')
    // Assert on what the code READS, not on prose — the doc comment
    // legitimately explains why NEXT_PUBLIC_ was avoided.
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_/)
    expect(src).toContain('process.env.ENABLE_PERSISTENT_VENDOR_ATTRIBUTION')
  })
})
