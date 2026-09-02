import { describe, it, expect, vi, beforeEach } from 'vitest'

const submitStoreReview = vi.fn()
vi.mock('@/lib/trustshop/store', () => ({
  submitStoreReview: (...args: unknown[]) => submitStoreReview(...args),
}))

// Real lib/rate-limit.ts keeps bucket state in a module-level Map with no
// reset hook — mocked here so tests in this file don't share a bucket (see
// the identical note in app/api/reviews/product/__tests__/route.test.ts).
const isRateLimited = vi.fn((_key: string, _opts: { limit: number; windowMs: number }) => false)
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: (key: string, opts: { limit: number; windowMs: number }) => isRateLimited(key, opts),
  clientIp: () => 'unknown',
}))

import { POST } from '@/app/api/reviews/store/route'

const HOST = 'shop.example.com'

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://${HOST}/api/reviews/store`, {
    method: 'POST',
    headers: {
      host: HOST,
      origin: `https://${HOST}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = {
  star: 5,
  title: 'Great experience',
  content: 'Ordering was smooth and shipping was fast.',
  name: 'Alex Smith',
  email: 'alex@example.com',
  elapsedMs: 5000,
}

beforeEach(() => {
  submitStoreReview.mockReset().mockResolvedValue({ ok: true })
  isRateLimited.mockReset().mockReturnValue(false)
})

describe('POST /api/reviews/store', () => {
  it('submits and returns 200 on a valid payload', async () => {
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(submitStoreReview).toHaveBeenCalledOnce()
  })

  it('never conflates with a product review — rejects a client-supplied productGid', async () => {
    // .strict() rejects the extra field outright.
    const res = await POST(post({ ...valid, productGid: 'gid://shopify/Product/1' }))
    expect(res.status).toBe(400)
    expect(submitStoreReview).not.toHaveBeenCalled()
  })

  it('never forwards a client-supplied buyer_verification field', async () => {
    const res = await POST(post({ ...valid, buyer_verification: true }))
    expect(res.status).toBe(400)
    expect(submitStoreReview).not.toHaveBeenCalled()
  })

  it('returns 403 on a cross-origin request', async () => {
    const res = await POST(post(valid, { origin: 'https://evil.net' }))
    expect(res.status).toBe(403)
    expect(submitStoreReview).not.toHaveBeenCalled()
  })

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(post('{not json'))
    expect(res.status).toBe(400)
  })

  it('returns 413 on an oversize body', async () => {
    const res = await POST(post({ ...valid, content: 'a'.repeat(20_000) }))
    expect(res.status).toBe(413)
    expect(submitStoreReview).not.toHaveBeenCalled()
  })

  it('returns 200 but does not submit when the honeypot is filled', async () => {
    const res = await POST(post({ ...valid, website: 'x' }))
    expect(res.status).toBe(200)
    expect(submitStoreReview).not.toHaveBeenCalled()
  })

  it('returns 200 but does not submit when submitted too fast', async () => {
    const res = await POST(post({ ...valid, elapsedMs: 200 }))
    expect(res.status).toBe(200)
    expect(submitStoreReview).not.toHaveBeenCalled()
  })

  describe('validation', () => {
    it('rejects star < 1', async () => {
      const res = await POST(post({ ...valid, star: 0 }))
      expect(res.status).toBe(400)
    })

    it('rejects star > 5', async () => {
      const res = await POST(post({ ...valid, star: 6 }))
      expect(res.status).toBe(400)
    })

    it('rejects a non-integer star', async () => {
      const res = await POST(post({ ...valid, star: 4.5 }))
      expect(res.status).toBe(400)
    })

    it('rejects missing content', async () => {
      const { content, ...rest } = valid
      void content
      const res = await POST(post(rest))
      expect(res.status).toBe(400)
    })

    it('rejects missing name', async () => {
      const { name, ...rest } = valid
      void name
      const res = await POST(post(rest))
      expect(res.status).toBe(400)
    })

    it('rejects missing email', async () => {
      const { email, ...rest } = valid
      void email
      const res = await POST(post(rest))
      expect(res.status).toBe(400)
    })

    it('rejects an invalid email', async () => {
      const res = await POST(post({ ...valid, email: 'not-an-email' }))
      expect(res.status).toBe(400)
    })

    it('rejects a title over 100 characters', async () => {
      const res = await POST(post({ ...valid, title: 'a'.repeat(101) }))
      expect(res.status).toBe(400)
    })

    it('rejects content over 4000 characters', async () => {
      const res = await POST(post({ ...valid, content: 'a'.repeat(4001) }))
      expect(res.status).toBe(400)
    })
  })

  it('returns a generic 502 on provider failure without leaking detail', async () => {
    submitStoreReview.mockResolvedValue({ ok: false, reason: 'provider_error' })
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).not.toMatch(/trustshop/i)
  })

  it('returns 429 when the per-IP rate limit is tripped', async () => {
    isRateLimited.mockReturnValue(true)
    const res = await POST(post(valid))
    expect(res.status).toBe(429)
    expect(submitStoreReview).not.toHaveBeenCalled()
  })
})
