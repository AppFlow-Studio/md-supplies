import { describe, it, expect, vi, beforeEach } from 'vitest'

const submitProductReview = vi.fn()
vi.mock('@/lib/trustshop/product', () => ({
  submitProductReview: (...args: unknown[]) => submitProductReview(...args),
}))

const storefrontFetch = vi.fn()
vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: (...args: unknown[]) => storefrontFetch(...args),
}))

// Real lib/rate-limit.ts keeps its bucket state in a module-level Map with no
// reset hook — every test in this file otherwise shares one 'unknown'-IP
// bucket and would trip the 5/hour cap by the 6th POST. Mocked here (default
// never-limited); the "returns 429" test below flips it for one call. The
// limiter's own logic is already covered by lib/__tests__/rate-limit.test.ts.
const isRateLimited = vi.fn((_key: string, _opts: { limit: number; windowMs: number }) => false)
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: (key: string, opts: { limit: number; windowMs: number }) => isRateLimited(key, opts),
  clientIp: () => 'unknown',
}))

import { POST } from '@/app/api/reviews/product/route'

const HOST = 'shop.example.com'
const PRODUCT_GID = 'gid://shopify/Product/7857484955713'

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://${HOST}/api/reviews/product`, {
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
  productGid: PRODUCT_GID,
  star: 5,
  title: 'Great product',
  content: 'Worked exactly as described, fast shipping too.',
  name: 'Jane Smith',
  email: 'jane@example.com',
  elapsedMs: 5000,
}

beforeEach(() => {
  submitProductReview.mockReset().mockResolvedValue({ ok: true })
  storefrontFetch.mockReset().mockResolvedValue({ product: { id: PRODUCT_GID } })
  isRateLimited.mockReset().mockReturnValue(false)
})

describe('POST /api/reviews/product', () => {
  it('submits and returns 200 on a valid payload', async () => {
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(submitProductReview).toHaveBeenCalledOnce()
  })

  it('resolves the numeric Shopify product id from the GID before submitting', async () => {
    await POST(post(valid))
    expect(submitProductReview.mock.calls[0][0].shopifyProductId).toBe(7857484955713)
  })

  it('never forwards a client-supplied buyer_verification field', async () => {
    // .strict() on the schema rejects the extra field outright — this proves
    // the request is rejected rather than silently accepted-with-stripping.
    const res = await POST(post({ ...valid, buyer_verification: true }))
    expect(res.status).toBe(400)
    expect(submitProductReview).not.toHaveBeenCalled()
  })

  it('never forwards a client-supplied numeric product_id field', async () => {
    const res = await POST(post({ ...valid, product_id: 999 }))
    expect(res.status).toBe(400)
    expect(submitProductReview).not.toHaveBeenCalled()
  })

  it('returns 403 on a cross-origin request', async () => {
    const res = await POST(post(valid, { origin: 'https://evil.net' }))
    expect(res.status).toBe(403)
    expect(submitProductReview).not.toHaveBeenCalled()
  })

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(post('{not json'))
    expect(res.status).toBe(400)
  })

  it('returns 413 on an oversize body', async () => {
    const res = await POST(post({ ...valid, content: 'a'.repeat(20_000) }))
    expect(res.status).toBe(413)
    expect(submitProductReview).not.toHaveBeenCalled()
  })

  it('returns 200 but does not submit when the honeypot is filled', async () => {
    const res = await POST(post({ ...valid, website: 'x' }))
    expect(res.status).toBe(200)
    expect(submitProductReview).not.toHaveBeenCalled()
  })

  it('returns 200 but does not submit when submitted too fast', async () => {
    const res = await POST(post({ ...valid, elapsedMs: 200 }))
    expect(res.status).toBe(200)
    expect(submitProductReview).not.toHaveBeenCalled()
  })

  describe('validation', () => {
    it('rejects star < 1', async () => {
      const res = await POST(post({ ...valid, star: 0 }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.fields.star).toBeTruthy()
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

    it('rejects a malformed product GID', async () => {
      const res = await POST(post({ ...valid, productGid: 'not-a-gid' }))
      expect(res.status).toBe(400)
      expect(submitProductReview).not.toHaveBeenCalled()
    })
  })

  it('returns 404 when the product does not resolve on Shopify', async () => {
    storefrontFetch.mockResolvedValue({ product: null })
    const res = await POST(post(valid))
    expect(res.status).toBe(404)
    expect(submitProductReview).not.toHaveBeenCalled()
  })

  it('returns a generic 502 on provider failure without leaking detail', async () => {
    submitProductReview.mockResolvedValue({ ok: false, reason: 'provider_error' })
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).not.toMatch(/trustshop/i)
  })

  it('returns 429 when the per-IP rate limit is tripped', async () => {
    isRateLimited.mockReturnValue(true)
    const res = await POST(post(valid))
    expect(res.status).toBe(429)
    expect(submitProductReview).not.toHaveBeenCalled()
  })
})
