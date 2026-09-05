import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
// Auto-invokes the scheduled callback synchronously (unlike the real
// next/server after(), which defers to post-response) so the existing
// "submits ... to IndexNow" tests below still observe the end-to-end
// behavior without change; the dedicated after()-usage tests further down
// assert on the mock's call args directly to confirm after() — not a bare
// un-awaited call — is the scheduling mechanism.
vi.mock('next/server', () => ({ after: vi.fn((fn: () => unknown) => fn()) }))
vi.mock('@/lib/env.server', () => ({ serverEnv: { shopifyWebhookSecret: 'test-secret' } }))
vi.mock('@/lib/seo/indexnow', () => ({ submitUrlToIndexNow: vi.fn().mockResolvedValue(undefined) }))

import { revalidateTag } from 'next/cache'
const mockRevalidateTag = vi.mocked(revalidateTag)

import { after } from 'next/server'
const mockAfter = vi.mocked(after)

import { submitUrlToIndexNow } from '@/lib/seo/indexnow'
const mockSubmitToIndexNow = vi.mocked(submitUrlToIndexNow)

function signBody(body: string): string {
  return crypto.createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64')
}

const ISR_ROUTE_FILES = [
  'app/page.tsx',
  'app/blog/[handle]/page.tsx',
  // /product/[slug] became ISR once the global CSP nonce was removed (CSP is now
  // per-route in proxy.ts) and it stopped reading searchParams server-side —
  // ?variant is reconciled client-side (components/product/useSelectedVariant.ts).
  'app/product/[slug]/page.tsx',
]

// These render per-request because they READ searchParams (filter/sort/search/
// page state) — NOT because of any CSP nonce. The global force-dynamic from the
// layout's headers() nonce read is gone (CSP is now applied per-route in
// proxy.ts); reading searchParams is what forces dynamic here. A route-level
// `revalidate` export would be dead config. Freshness comes from the fetch-level
// cache tags in CategoryResults + the Shopify webhook (app/api/revalidate).
// (Caching these is the deferred PPR / Cache Components phase.)
const DYNAMIC_ROUTE_FILES = [
  'app/category/[slug]/page.tsx',
  'app/solutions/occ/page.tsx',
  'app/industries/[industry-slug]/page.tsx',
]

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('ISR: every data-fetching Track A/B route exports revalidate', () => {
  for (const file of ISR_ROUTE_FILES) {
    it(`${file} exports a numeric revalidate`, () => {
      expect(read(file)).toMatch(/export const revalidate = \d+/)
    })
  }
})

describe('dynamic routes: tag-invalidated pages do not carry dead ISR config', () => {
  for (const file of DYNAMIC_ROUTE_FILES) {
    it(`${file} does not export revalidate`, () => {
      expect(read(file)).not.toMatch(/export const revalidate/)
    })
  }
})

describe('POST /api/revalidate — products/* also invalidates the broad collections tag', () => {
  beforeEach(() => {
    mockRevalidateTag.mockReset()
    mockSubmitToIndexNow.mockReset()
    mockAfter.mockReset()
  })

  it('invalidates products, product:<handle>, AND the broad collections tag on products/update', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'wheelchair-transport-17' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/update',
      },
      body,
    })

    const res = await POST(request)
    const json = await res.json()

    expect(json.revalidated).toEqual(
      expect.arrayContaining(['products', 'product:wheelchair-transport-17', 'collections']),
    )
    expect(mockRevalidateTag).toHaveBeenCalledWith('collections', 'max')
  })

  it('does not invalidate a specific collection:<handle> tag — the payload has no collection membership', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'wheelchair-transport-17' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/update',
      },
      body,
    })

    const res = await POST(request)
    const json = await res.json()
    expect(json.revalidated).not.toEqual(expect.arrayContaining([expect.stringMatching(/^collection:/)]))
  })

  it('submits the product URL to IndexNow when the payload carries a handle', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'wheelchair-transport-17' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/update',
      },
      body,
    })

    await POST(request)

    expect(mockSubmitToIndexNow).toHaveBeenCalledWith('https://mdsupplies.com/product/wheelchair-transport-17')
  })

  it('does not submit to IndexNow when the payload has no handle (e.g. some delete payloads)', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ id: 12345 })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/delete',
      },
      body,
    })

    await POST(request)

    expect(mockSubmitToIndexNow).not.toHaveBeenCalled()
  })

  it('submits the resolved category URL to IndexNow on a collections/* webhook, using the canonical slug not the raw handle', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'face-coverings' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'collections/update',
      },
      body,
    })

    await POST(request)

    expect(mockSubmitToIndexNow).toHaveBeenCalledWith('https://mdsupplies.com/category/face-masks')
  })

  // Final-review fix wave (Fix 2): a bare `void submitUrlToIndexNow(...)` is
  // not guaranteed to complete on a serverless platform — the function
  // instance can freeze/reclaim as soon as the HTTP response is sent.
  // `after()` (next/server) schedules the callback to run once the response
  // is finished, without blocking it — the right primitive for this.
  it('schedules the product IndexNow submission via after(), not a bare un-awaited call', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'wheelchair-transport-17' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/update',
      },
      body,
    })

    await POST(request)

    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockAfter.mock.calls[0][0]).toBeInstanceOf(Function)
    // The scheduled callback is what actually calls IndexNow (the test mock
    // above invokes it synchronously so this is already reflected).
    expect(mockSubmitToIndexNow).toHaveBeenCalledWith('https://mdsupplies.com/product/wheelchair-transport-17')
  })

  it('schedules the category IndexNow submission via after(), not a bare un-awaited call', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'face-coverings' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'collections/update',
      },
      body,
    })

    await POST(request)

    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockAfter.mock.calls[0][0]).toBeInstanceOf(Function)
    expect(mockSubmitToIndexNow).toHaveBeenCalledWith('https://mdsupplies.com/category/face-masks')
  })
})
