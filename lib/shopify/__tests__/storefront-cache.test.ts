import { describe, it, expect, vi, beforeEach } from 'vitest'

// React's cache() is a no-op in the development/node build — it does not
// memoize outside a React server render context. Replace it with a real
// Map-based memoizer so tests that assert deduplication actually work.
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
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { ok: true } }),
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'test-token')
})

describe('storefrontFetch request-level memoization', () => {
  it('calls fetch only once for two identical calls within the same request', async () => {
    const { storefrontFetch } = await import('../storefront')
    await storefrontFetch('query Foo { x }', { a: 1 })
    await storefrontFetch('query Foo { x }', { a: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
