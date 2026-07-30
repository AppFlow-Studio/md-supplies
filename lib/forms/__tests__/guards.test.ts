import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import {
  assertAllowedOrigin,
  assertNoForeignOrigin,
  assertAllowedCountry,
  readJsonBounded,
  sanitizeHeaderValue,
  fieldErrors,
  isHoneypotFilled,
  isSubmittedTooFast,
} from '@/lib/forms/guards'

function postRequest(headers: Record<string, string>, body = '{}') {
  return new Request('https://shop.example.com/api/sourcing', {
    method: 'POST',
    headers,
    body,
  })
}

describe('assertAllowedOrigin', () => {
  it('allows a same-host Origin', () => {
    const req = postRequest({
      host: 'shop.example.com',
      origin: 'https://shop.example.com',
    })
    expect(assertAllowedOrigin(req).ok).toBe(true)
  })

  it('allows a same-host Referer when Origin is absent', () => {
    const req = postRequest({
      host: 'shop.example.com',
      referer: 'https://shop.example.com/contact',
    })
    expect(assertAllowedOrigin(req).ok).toBe(true)
  })

  it('rejects a cross-origin request', () => {
    const req = postRequest({
      host: 'shop.example.com',
      origin: 'https://evil.example.net',
    })
    const result = assertAllowedOrigin(req)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it('rejects when neither Origin nor Referer is present', () => {
    const req = postRequest({ host: 'shop.example.com' })
    expect(assertAllowedOrigin(req).ok).toBe(false)
  })
})

describe('assertNoForeignOrigin', () => {
  function getRequest(headers: Record<string, string>) {
    return new Request('https://shop.example.com/api/search/predictive?q=ab', { headers })
  }

  it('allows a same-host Origin or Referer', () => {
    expect(
      assertNoForeignOrigin(
        getRequest({ host: 'shop.example.com', origin: 'https://shop.example.com' }),
      ).ok,
    ).toBe(true)
    expect(
      assertNoForeignOrigin(
        getRequest({ host: 'shop.example.com', referer: 'https://shop.example.com/search' }),
      ).ok,
    ).toBe(true)
  })

  it('allows when neither Origin nor Referer is present (same-origin GET)', () => {
    expect(assertNoForeignOrigin(getRequest({ host: 'shop.example.com' })).ok).toBe(true)
  })

  it('rejects a foreign Origin', () => {
    const result = assertNoForeignOrigin(
      getRequest({ host: 'shop.example.com', origin: 'https://evil.example.net' }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it('rejects a foreign Referer when Origin is absent', () => {
    expect(
      assertNoForeignOrigin(
        getRequest({ host: 'shop.example.com', referer: 'https://evil.example.net/page' }),
      ).ok,
    ).toBe(false)
  })
})

describe('readJsonBounded', () => {
  it('parses a small valid JSON body', async () => {
    const req = postRequest({ host: 'h', 'content-type': 'application/json' }, '{"a":1}')
    const result = await readJsonBounded(req)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual({ a: 1 })
  })

  it('rejects malformed JSON with 400', async () => {
    const req = postRequest({ host: 'h' }, '{not json')
    const result = await readJsonBounded(req)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(400)
  })

  it('rejects an oversize body (by Content-Length) with 413', async () => {
    const big = JSON.stringify({ x: 'a'.repeat(20_000) })
    const req = postRequest(
      { host: 'h', 'content-length': String(big.length) },
      big,
    )
    const result = await readJsonBounded(req, 16_384)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(413)
  })

  it('rejects an oversize body when Content-Length lies', async () => {
    const big = 'a'.repeat(20_000)
    // No content-length header, so the cap must be enforced while reading.
    const req = postRequest({ host: 'h' }, big)
    const result = await readJsonBounded(req, 16_384)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(413)
  })
})

describe('sanitizeHeaderValue', () => {
  it('strips CR and LF to prevent header injection', () => {
    expect(sanitizeHeaderValue('Jane\r\nBcc: evil@x.com')).toBe('JaneBcc: evil@x.com')
  })

  it('leaves clean values unchanged', () => {
    expect(sanitizeHeaderValue('Dr. Jane Smith')).toBe('Dr. Jane Smith')
  })
})

describe('fieldErrors', () => {
  it('flattens a ZodError to one message per field', () => {
    const schema = z.object({ email: z.email(), name: z.string().min(1) })
    const result = schema.safeParse({ email: 'bad', name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = fieldErrors(result.error)
      expect(errors.email).toBeTruthy()
      expect(errors.name).toBeTruthy()
    }
  })
})

describe('isHoneypotFilled', () => {
  it('is true when website is a non-empty string', () => {
    expect(isHoneypotFilled({ website: 'http://spam' })).toBe(true)
  })

  it('is false when website is empty', () => {
    expect(isHoneypotFilled({ website: '' })).toBe(false)
  })

  it('is false when website is absent', () => {
    expect(isHoneypotFilled({ name: 'x' })).toBe(false)
  })

  it('is false for non-object input', () => {
    expect(isHoneypotFilled(null)).toBe(false)
    expect(isHoneypotFilled('nope')).toBe(false)
  })
})

describe('isSubmittedTooFast', () => {
  it('is true when elapsedMs is missing', () => {
    expect(isSubmittedTooFast({ name: 'x' })).toBe(true)
  })

  it('is true when elapsedMs is below the threshold', () => {
    expect(isSubmittedTooFast({ elapsedMs: 400 })).toBe(true)
  })

  it('is false when elapsedMs meets the threshold', () => {
    expect(isSubmittedTooFast({ elapsedMs: 1200 })).toBe(false)
  })

  it('is false when elapsedMs comfortably exceeds the threshold', () => {
    expect(isSubmittedTooFast({ elapsedMs: 5000 })).toBe(false)
  })

  it('is true for non-object input', () => {
    expect(isSubmittedTooFast(null)).toBe(true)
  })
})

describe('assertAllowedCountry', () => {
  function reqWithCountry(country: string | null) {
    const headers: Record<string, string> = { host: 'shop.example.com' }
    if (country) headers['x-vercel-ip-country'] = country
    return postRequest(headers)
  }

  it('allows a US request', () => {
    expect(assertAllowedCountry(reqWithCountry('US')).ok).toBe(true)
  })

  it('allows a CA request', () => {
    expect(assertAllowedCountry(reqWithCountry('CA')).ok).toBe(true)
  })

  it('rejects a request from outside the US/CA', () => {
    const result = assertAllowedCountry(reqWithCountry('RU'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it('allows when the country header is absent (non-Vercel environment)', () => {
    expect(assertAllowedCountry(reqWithCountry(null)).ok).toBe(true)
  })
})

// Origin checks depend on env; make sure tests are isolated.
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL
})
afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL
})
