import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import {
  assertAllowedOrigin,
  readJsonBounded,
  sanitizeHeaderValue,
  fieldErrors,
  isHoneypotFilled,
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

// Origin checks depend on env; make sure tests are isolated.
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL
})
afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL
})
