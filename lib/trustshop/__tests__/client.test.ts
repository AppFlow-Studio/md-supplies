import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

const TEST_KEY = 'trustshop-secret-key-do-not-log'

function stubEnv() {
  vi.stubEnv('TRUSTSHOP_API_BASE_URL', 'https://integrations.trustshop.io')
  vi.stubEnv('TRUSTSHOP_INTEGRATION_KEY', TEST_KEY)
}

const schema = z.object({ ok: z.boolean() })

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  stubEnv()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('trustShopGet', () => {
  it('returns schema-validated data on a 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet } = await import('../client')

    const data = await trustShopGet('/storefront/product/reviews/summary', {
      operation: 'summary',
      schema,
    })

    expect(data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('attaches the bearer token on the outgoing request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet } = await import('../client')

    await trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema })

    const [, init] = fetchMock.mock.calls[0]
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TEST_KEY}`)
  })

  it('retries a 500 up to the cap, then throws', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet, TrustShopError } = await import('../client')

    await expect(
      trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema }),
    ).rejects.toBeInstanceOf(TrustShopError)

    // Initial attempt + MAX_GET_RETRIES(2) retries = 3 calls total.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  }, 10_000)

  it('retries a 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet } = await import('../client')

    await expect(
      trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema }),
    ).rejects.toThrow()

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
  }, 10_000)

  it('does NOT retry a 403 (config failure, not transient)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet, TrustShopError } = await import('../client')

    const err = await trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema }).catch((e) => e)
    expect(err).toBeInstanceOf(TrustShopError)
    expect((err as InstanceType<typeof TrustShopError>).kind).toBe('config')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry a 404 (not_found, not transient)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet } = await import('../client')

    await expect(
      trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema }),
    ).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws a validation error on malformed JSON without crashing the caller', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('not json', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet, TrustShopError } = await import('../client')

    const err = await trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema }).catch((e) => e)
    expect(err).toBeInstanceOf(TrustShopError)
    expect((err as InstanceType<typeof TrustShopError>).kind).toBe('validation')
  })

  it('throws a validation error when the response drifts from the schema', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ unexpected: 1 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet, TrustShopError } = await import('../client')

    const err = await trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema }).catch((e) => e)
    expect(err).toBeInstanceOf(TrustShopError)
    expect((err as InstanceType<typeof TrustShopError>).kind).toBe('validation')
  })

  it('never logs the bearer token, on success or failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopGet } = await import('../client')

    await trustShopGet('/storefront/product/reviews/summary', { operation: 'summary', schema }).catch(() => {})

    const allLoggedText = [...errorSpy.mock.calls, ...logSpy.mock.calls].flat().join(' ')
    expect(allLoggedText).not.toContain(TEST_KEY)
  }, 10_000)
})

describe('trustShopPost', () => {
  it('makes exactly one attempt on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopPost } = await import('../client')

    await trustShopPost('/storefront/product/reviews', { operation: 'submit', body: { star: 5 }, schema })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('NEVER retries on a 500 — exactly one fetch call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopPost, TrustShopError } = await import('../client')

    await expect(
      trustShopPost('/storefront/product/reviews', { operation: 'submit', body: { star: 5 }, schema }),
    ).rejects.toBeInstanceOf(TrustShopError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('NEVER retries on a timeout — exactly one fetch call', async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted')
      err.name = 'TimeoutError'
      return Promise.reject(err)
    })
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopPost, TrustShopError } = await import('../client')

    const err = await trustShopPost('/storefront/product/reviews', { operation: 'submit', body: { star: 5 }, schema }).catch((e) => e)
    expect(err).toBeInstanceOf(TrustShopError)
    expect((err as InstanceType<typeof TrustShopError>).kind).toBe('timeout')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('NEVER retries on a 429 either — POST retry is unconditional-never, not status-dependent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopPost } = await import('../client')

    await trustShopPost('/storefront/product/reviews', { operation: 'submit', body: { star: 5 }, schema }).catch(() => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats a 2xx with an unparsable body as success, not a failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('not json', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { trustShopPost } = await import('../client')

    await expect(
      trustShopPost('/storefront/product/reviews', { operation: 'submit', body: { star: 5 }, schema }),
    ).resolves.toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
