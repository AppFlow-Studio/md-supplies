import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clientIp } from '@/lib/rate-limit'

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
})
afterEach(() => {
  vi.useRealTimers()
})

// Import fresh per test so the module-level bucket map starts empty.
async function freshIsRateLimited() {
  const { isRateLimited } = await import('@/lib/rate-limit')
  return isRateLimited
}

describe('isRateLimited', () => {
  it('allows requests up to the limit, then blocks', async () => {
    const isRateLimited = await freshIsRateLimited()
    const opts = { limit: 3, windowMs: 60_000 }
    expect(isRateLimited('ip:1', opts)).toBe(false)
    expect(isRateLimited('ip:1', opts)).toBe(false)
    expect(isRateLimited('ip:1', opts)).toBe(false)
    expect(isRateLimited('ip:1', opts)).toBe(true)
  })

  it('tracks keys independently', async () => {
    const isRateLimited = await freshIsRateLimited()
    const opts = { limit: 1, windowMs: 60_000 }
    expect(isRateLimited('ip:a', opts)).toBe(false)
    expect(isRateLimited('ip:a', opts)).toBe(true)
    expect(isRateLimited('ip:b', opts)).toBe(false)
  })

  it('resets after the window expires', async () => {
    const isRateLimited = await freshIsRateLimited()
    const opts = { limit: 1, windowMs: 60_000 }
    expect(isRateLimited('ip:1', opts)).toBe(false)
    expect(isRateLimited('ip:1', opts)).toBe(true)
    vi.advanceTimersByTime(60_001)
    expect(isRateLimited('ip:1', opts)).toBe(false)
  })
})

describe('clientIp', () => {
  it('takes the first hop of x-forwarded-for', () => {
    const req = new Request('https://x.test', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    })
    expect(clientIp(req)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip, then "unknown"', () => {
    expect(
      clientIp(new Request('https://x.test', { headers: { 'x-real-ip': '198.51.100.2' } })),
    ).toBe('198.51.100.2')
    expect(clientIp(new Request('https://x.test'))).toBe('unknown')
  })
})
