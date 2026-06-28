import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'test-token')
  vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'admin-token')
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('BUNNYCDN_STORAGE_ACCESS_KEY', 'bunny-key')
})

describe('storefrontFetch error handling', () => {
  it('logs and throws on non-ok HTTP response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { storefrontFetch } = await import('../storefront')
    await expect(storefrontFetch('query { x }')).rejects.toThrow('503')
    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.context).toBe('storefront')
    expect(logged.message).toContain('503')
    spy.mockRestore()
  })

  it('logs and throws on GraphQL errors', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'Field not found' }] }),
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { storefrontFetch } = await import('../storefront')
    await expect(storefrontFetch('query { x }')).rejects.toThrow('Field not found')
    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.message).toBe('Field not found')
    spy.mockRestore()
  })

  it('applies an 8-second AbortSignal timeout by default', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { x: 1 } }),
    })
    const { storefrontFetch } = await import('../storefront')
    await storefrontFetch('query { x }')
    expect(timeoutSpy).toHaveBeenCalledWith(8000)
    timeoutSpy.mockRestore()
  })

  it('logs and throws on fetch network/timeout error', async () => {
    fetchMock.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { storefrontFetch } = await import('../storefront')
    await expect(storefrontFetch('query { x }')).rejects.toThrow('signal timed out')
    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.context).toBe('storefront')
    spy.mockRestore()
  })
})
