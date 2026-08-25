import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('@/lib/env.server', () => ({ serverEnv: { shopifyWebhookSecret: 'test-secret' } }))
vi.mock('@/lib/seo/indexnow', () => ({ submitUrlToIndexNow: vi.fn().mockResolvedValue(undefined) }))

import { revalidateTag } from 'next/cache'
const mockRevalidateTag = vi.mocked(revalidateTag)

import { submitUrlToIndexNow } from '@/lib/seo/indexnow'
const mockSubmitToIndexNow = vi.mocked(submitUrlToIndexNow)

function signBody(body: string): string {
  return crypto.createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64')
}

const ISR_ROUTE_FILES = [
  'app/page.tsx',
  'app/blog/[handle]/page.tsx',
]

// Fully dynamic since e167141: the root layout reads headers() for the CSP
// nonce, so these render per-request. Freshness is handled at the fetch layer
// (storefrontFetch cache tags + the Shopify webhook via app/api/revalidate),
// not by route-level ISR — a route-level `revalidate` export here would be
// dead config that misleads readers about how caching works.
//
// solutions/occ joined this list with DEV-OCC-01: the page now reads
// searchParams for the OCC catalog's filter/sort/search/page state, so it
// cannot be statically revalidated. Its Storefront fetches carry
// revalidate + collection cache tags instead.
const DYNAMIC_ROUTE_FILES = [
  'app/category/[slug]/page.tsx',
  'app/product/[slug]/page.tsx',
  'app/solutions/occ/page.tsx',
  // industries/[slug] joined for the same reason: supported industries now
  // render the full discovery engine and read searchParams for filter/sort/
  // search/page state, so route-level ISR cannot apply. Freshness comes from
  // the fetch-level cache tags in CategoryResults.
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
})
