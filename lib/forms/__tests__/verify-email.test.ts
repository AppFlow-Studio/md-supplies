import { describe, it, expect, vi, beforeEach } from 'vitest'

const resolveMx = vi.fn()
const resolve4 = vi.fn()
const resolve6 = vi.fn()

vi.mock('node:dns/promises', () => ({
  resolveMx: (...args: unknown[]) => resolveMx(...args),
  resolve4: (...args: unknown[]) => resolve4(...args),
  resolve6: (...args: unknown[]) => resolve6(...args),
}))

import { hasValidMxRecord } from '@/lib/forms/verify-email'

function enotfound() {
  return Object.assign(new Error('not found'), { code: 'ENOTFOUND' })
}

beforeEach(() => {
  resolveMx.mockReset()
  resolve4.mockReset()
  resolve6.mockReset()
})

describe('hasValidMxRecord', () => {
  it('is true when the domain has MX records', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx.clinic.com', priority: 10 }])
    expect(await hasValidMxRecord('jane@clinic.com')).toBe(true)
    expect(resolve4).not.toHaveBeenCalled()
  })

  it('is true when MX is absent but an A record exists (RFC 5321 fallback)', async () => {
    resolveMx.mockRejectedValue(enotfound())
    resolve4.mockResolvedValue(['203.0.113.10'])
    resolve6.mockRejectedValue(enotfound())
    expect(await hasValidMxRecord('jane@clinic.com')).toBe(true)
  })

  it('is true when MX is absent but an AAAA record exists', async () => {
    resolveMx.mockRejectedValue(enotfound())
    resolve4.mockRejectedValue(enotfound())
    resolve6.mockResolvedValue(['2001:db8::1'])
    expect(await hasValidMxRecord('jane@clinic.com')).toBe(true)
  })

  it('treats a lone null-MX record (RFC 7505) as no MX and falls back to A', async () => {
    resolveMx.mockResolvedValue([{ exchange: '', priority: 0 }])
    resolve4.mockResolvedValue(['203.0.113.10'])
    resolve6.mockRejectedValue(enotfound())
    expect(await hasValidMxRecord('jane@example.com')).toBe(true)
  })

  it('is false when MX, A, and AAAA are all confirmed absent', async () => {
    resolveMx.mockRejectedValue(enotfound())
    resolve4.mockRejectedValue(enotfound())
    resolve6.mockRejectedValue(enotfound())
    expect(await hasValidMxRecord('jane@thisdomaindoesnotexist.test')).toBe(false)
  })

  it('fails open on an MX lookup timeout', async () => {
    vi.useFakeTimers()
    resolveMx.mockImplementation(() => new Promise(() => {}))
    const resultPromise = hasValidMxRecord('jane@slow-dns.test')
    await vi.advanceTimersByTimeAsync(3000)
    expect(await resultPromise).toBe(true)
    vi.useRealTimers()
  })

  it('fails open on a non-"no records" DNS error (e.g. SERVFAIL)', async () => {
    const err = Object.assign(new Error('server failure'), { code: 'ESERVFAIL' })
    resolveMx.mockRejectedValue(err)
    resolve4.mockRejectedValue(err)
    resolve6.mockRejectedValue(err)
    expect(await hasValidMxRecord('jane@flaky-dns.test')).toBe(true)
  })

  it('is false for a malformed email with no domain part', async () => {
    expect(await hasValidMxRecord('not-an-email')).toBe(false)
    expect(resolveMx).not.toHaveBeenCalled()
  })
})
