import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      const memo = new Map<string, ReturnType<T>>()
      return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args)
        if (memo.has(key)) return memo.get(key) as ReturnType<T>
        const result = fn(...args) as ReturnType<T>
        memo.set(key, result)
        return result
      }) as T
    },
  }
})

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { ok: true } }),
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'test-token')
  vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'admin-token')
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('BUNNYCDN_STORAGE_ACCESS_KEY', 'bunny-key')
})

describe('storefrontFetch request-level memoization', () => {
  it('calls fetch only once for two identical calls within the same request', async () => {
    const { storefrontFetch } = await import('../storefront')
    await storefrontFetch('query Foo { x }', { a: 1 })
    await storefrontFetch('query Foo { x }', { a: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
