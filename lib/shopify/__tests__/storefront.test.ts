import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'module'
import path from 'path'

// --- Why this file exists (see task-1-report.md, fix round 2) ---
//
// Under Vitest's default Node resolution, `import { cache } from 'react'`
// resolves to the plain client build, whose `cache()` is a bare passthrough
// (`return fn.apply(null, arguments)` — no memoization at all, verified by
// reading node_modules/react/cjs/react.development.js). A test that
// `vi.mock('@/lib/shopify/storefront', ...)` replaces the whole module and
// never touches `cache()` either way. Neither setup can catch a regression
// in cache()-memoization behavior, which is exactly how the original retry
// bug (a retry silently replaying the first failed call's memoized promise)
// passed review undetected.
//
// Next.js's Server Component runtime instead resolves 'react' through the
// package's `react-server` export condition
// (node_modules/react/react.react-server.js), whose `cache()` really does
// memoize per call-argument-set, keyed off a request-scoped dispatcher
// (`ReactSharedInternals.A`, set by the renderer for the life of one
// render). That is the implementation lib/shopify/storefront.ts is actually
// exercised against in production, so this file loads that exact build and
// installs a minimal fake dispatcher standing in for "one render request" —
// same memoize-by-arguments algorithm Next.js runs, applied to the real
// storefront.ts source, not a reimplementation of either.
const require = createRequire(import.meta.url)
// A direct absolute path, not the 'react/...' specifier: Node's package
// "exports" map only declares the 'react-server' condition subpath (used by
// Next.js's bundler resolution, not plain `require`), so resolving through
// the package specifier is blocked. The underlying file is real and stable
// (react's own package.json "exports" points the 'react-server' condition
// at this exact file).
const reactServerCachePath = path.join(
  path.dirname(require.resolve('react/package.json')),
  'cjs',
  'react.react-server.development.js',
)
const ReactServer = require(reactServerCachePath)
const internals =
  ReactServer.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

/** Stands in for the per-request cache root Next.js's renderer provides. */
function makeRequestDispatcher() {
  const typeCaches = new Map<unknown, unknown>()
  return {
    getCacheForType(createRootCache: () => unknown) {
      let c = typeCaches.get(createRootCache)
      if (c === undefined) {
        c = createRootCache()
        typeCaches.set(createRootCache, c)
      }
      return c
    },
    cacheSignal() {
      return null
    },
  }
}

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: ReactServer.cache }
})

function mockOkFetch() {
  let calls = 0
  global.fetch = vi.fn(async () => {
    calls++
    return {
      ok: true,
      json: async () => ({ data: { call: calls } }),
    } as unknown as Response
  })
  return () => calls
}

describe('storefrontFetch against the real react-server cache() semantics', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SHOPIFY_STORE_DOMAIN = 'md-supplies-qa-shipping-and-checkout.myshopify.com'
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'token'
  })

  afterEach(() => {
    internals.A = null
  })

  it('dedupes two calls with identical query/variables/fetchOptions within one request (no salt)', async () => {
    const getCalls = mockOkFetch()
    const { storefrontFetch } = await import('../storefront')

    internals.A = makeRequestDispatcher()
    const a = await storefrontFetch('query { x }', { a: 1 })
    const b = await storefrontFetch('query { x }', { a: 1 })

    expect(getCalls()).toBe(1)
    expect(a).toEqual(b)
  })

  it('does NOT dedupe when a different dedupeSalt is passed on the second call', async () => {
    const getCalls = mockOkFetch()
    const { storefrontFetch } = await import('../storefront')

    internals.A = makeRequestDispatcher()
    await storefrontFetch('query { x }', { a: 1 })
    await storefrontFetch('query { x }', { a: 1 }, undefined, 'retry')

    expect(getCalls()).toBe(2)
  })

  it('two calls with the SAME salt still dedupe (salt does not defeat normal dedup)', async () => {
    const getCalls = mockOkFetch()
    const { storefrontFetch } = await import('../storefront')

    internals.A = makeRequestDispatcher()
    await storefrontFetch('query { x }', { a: 1 }, undefined, 'retry')
    await storefrontFetch('query { x }', { a: 1 }, undefined, 'retry')

    expect(getCalls()).toBe(1)
  })

  it('a retry with a distinct salt actually issues a new HTTP request after the first call failed — the bug this guards against', async () => {
    let calls = 0
    global.fetch = vi.fn(async () => {
      calls++
      if (calls === 1) throw new Error('network blip')
      return { ok: true, json: async () => ({ data: { ok: true } }) } as unknown as Response
    })

    const { storefrontFetch } = await import('../storefront')

    internals.A = makeRequestDispatcher()
    await expect(storefrontFetch('query { x }', { a: 1 })).rejects.toThrow('network blip')

    // Without a dedupeSalt, this next call is BYTE-IDENTICAL to the failed
    // call above and would hit cache()'s memoized rejected promise for that
    // argument set — throwing instantly, with `calls` staying at 1, and no
    // real retry ever happening. That is the bug this test guards against.
    const result = await storefrontFetch('query { x }', { a: 1 }, undefined, 'retry')

    expect(calls).toBe(2)
    expect(result).toEqual({ ok: true })
  })
})
