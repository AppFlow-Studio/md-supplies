import { describe, it, expect, vi } from 'vitest'

const cookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(cookieStore) }))

import {
  ATTRIBUTION_COOKIE,
  serializeAttribution,
  readStoredAttribution,
  formatAttributionLine,
} from '../attribution'

describe('serializeAttribution', () => {
  it('returns null when the source carries no tracking params', () => {
    expect(serializeAttribution(new URLSearchParams('page=2&sort=price'))).toBeNull()
  })

  it('serializes gclid + utm_* as a JSON object, dropping non-tracking params', () => {
    const value = serializeAttribution(
      new URLSearchParams('gclid=abc123&utm_source=google&page=2'),
    )
    expect(JSON.parse(value!)).toEqual({ gclid: 'abc123', utm_source: 'google' })
  })
})

describe('readStoredAttribution', () => {
  it('returns {} when no cookie is set', async () => {
    cookieStore.get.mockReturnValueOnce(undefined)
    expect(await readStoredAttribution()).toEqual({})
  })

  it('parses a previously-captured cookie', async () => {
    cookieStore.get.mockReturnValueOnce({ value: JSON.stringify({ gclid: 'abc123' }) })
    expect(await readStoredAttribution()).toEqual({ gclid: 'abc123' })
    expect(cookieStore.get).toHaveBeenCalledWith(ATTRIBUTION_COOKIE)
  })

  it('fails safe (empty object, not a throw) on a malformed/tampered cookie', async () => {
    cookieStore.get.mockReturnValueOnce({ value: 'not-json{' })
    expect(await readStoredAttribution()).toEqual({})
  })

  it('drops non-string values from a tampered cookie rather than propagating them', async () => {
    cookieStore.get.mockReturnValueOnce({ value: JSON.stringify({ gclid: 'abc', nested: { a: 1 } }) })
    expect(await readStoredAttribution()).toEqual({ gclid: 'abc' })
  })
})

describe('formatAttributionLine', () => {
  it('returns an empty string for no attribution', () => {
    expect(formatAttributionLine({})).toBe('')
  })

  it('formats every captured key=value pair on one line', () => {
    const line = formatAttributionLine({ gclid: 'abc123', utm_source: 'google' })
    expect(line).toContain('gclid=abc123')
    expect(line).toContain('utm_source=google')
  })
})
