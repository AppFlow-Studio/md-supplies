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

// Cache Components migration: route-segment `revalidate` is incompatible with
// cacheComponents and has been removed from EVERY route. These data-fetching
// public routes are now statically prerendered (PPR) — the bare URL is a
// CDN-served static shell — instead of ISR-via-`revalidate`. Freshness comes from
// the fetch-level data-cache tags + the Shopify webhook (app/api/revalidate).
const FORMER_ISR_ROUTE_FILES = [
  'app/page.tsx',
  'app/blog/[handle]/page.tsx',
  'app/product/[slug]/page.tsx',
]

// These were the always-dynamic, searchParams-reading routes. Under Cache
// Components the server no longer reads searchParams — filters/sort/search moved
// client-side (/category) or into a <Suspense> boundary (occ/industries) — so
// they too prerender a static shell. None ever carried (or should carry) a
// `revalidate` export.
const FORMER_DYNAMIC_ROUTE_FILES = [
  'app/category/[slug]/page.tsx',
  'app/solutions/occ/page.tsx',
  'app/industries/[industry-slug]/page.tsx',
]

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('Cache Components: route-segment revalidate is gone', () => {
  it('next.config.ts enables cacheComponents', () => {
    expect(read('next.config.ts')).toMatch(/cacheComponents:\s*true/)
  })

  for (const file of [...FORMER_ISR_ROUTE_FILES, ...FORMER_DYNAMIC_ROUTE_FILES]) {
    it(`${file} no longer exports revalidate (incompatible with cacheComponents)`, () => {
      expect(read(file)).not.toMatch(/export const revalidate/)
    })
  }

  it('/product/[slug], /category/[slug] and /category/[slug]/[product] prerender via generateStaticParams', () => {
    expect(read('app/product/[slug]/page.tsx')).toMatch(/generateStaticParams/)
    expect(read('app/category/[slug]/[product]/page.tsx')).toMatch(/generateStaticParams/)
    // /category/[slug] re-exports it from CategoryPageView.
    expect(
      read('app/category/[slug]/page.tsx') + read('components/category/CategoryPageView.tsx'),
    ).toMatch(/generateStaticParams/)
  })
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
