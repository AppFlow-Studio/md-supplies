import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    bunnyCdnAccessKey: 'test-key',
    bunnyCdnHostname: 'ny.storage.bunnycdn.com',
    bunnyCdnZone: 'md-supplies',
  },
}))

function makeRequest(path: string) {
  return new NextRequest(new URL(`http://localhost/api/bunny/${path}`))
}

function makeParams(path: string) {
  return { params: Promise.resolve({ path: path.split('/') }) }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/bunny/[...path]', () => {
  it('proxies the request to the BunnyCDN storage API with the AccessKey header', async () => {
    const body = new ReadableStream()
    vi.mocked(fetch).mockResolvedValue(
      new Response(body, { status: 200, headers: { 'content-type': 'image/webp' } }),
    )

    const res = await GET(makeRequest('mdsupplies/categories/gloves.webp'), makeParams('mdsupplies/categories/gloves.webp'))

    expect(fetch).toHaveBeenCalledWith(
      'https://ny.storage.bunnycdn.com/md-supplies/mdsupplies/categories/gloves.webp',
      { headers: { AccessKey: 'test-key' } },
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('returns 404 when the upstream object is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }))

    const res = await GET(
      makeRequest('mdsupplies/placeholders/products/missing.webp'),
      makeParams('mdsupplies/placeholders/products/missing.webp'),
    )

    expect(res.status).toBe(404)
  })

  it('rejects path traversal segments with 400', async () => {
    const res = await GET(makeRequest('mdsupplies/..%2F..%2Fsecrets'), makeParams('mdsupplies/../../secrets'))

    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
