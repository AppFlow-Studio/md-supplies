import { describe, it, expect } from 'vitest'
import {
  isProductShapeRedirect,
  resolveRedirectChains,
  diffRedirects,
  sortRedirects,
} from '../redirect-sync'

describe('isProductShapeRedirect', () => {
  it('accepts a /products/<handle> -> /products/<handle> row', () => {
    expect(isProductShapeRedirect({ from: '/products/a', to: '/products/b' })).toBe(true)
  })

  it('rejects a collection redirect', () => {
    expect(isProductShapeRedirect({ from: '/collections/gloves', to: '/products/b' })).toBe(false)
  })

  it('rejects a redirect targeting outside /products/', () => {
    expect(isProductShapeRedirect({ from: '/products/a', to: '/pages/discontinued' })).toBe(false)
  })

  it('rejects a nested /products/ path (not a bare handle)', () => {
    expect(isProductShapeRedirect({ from: '/products/a/reviews', to: '/products/b' })).toBe(false)
  })
})

describe('resolveRedirectChains', () => {
  it('leaves an already single-hop row untouched', () => {
    const { resolved, unresolvedCycles } = resolveRedirectChains([{ from: '/products/a', to: '/products/b' }])
    expect(resolved).toEqual([{ from: '/products/a', to: '/products/b' }])
    expect(unresolvedCycles).toEqual([])
  })

  it('collapses a two-hop chain to the final live target', () => {
    // a -> b -> c: b was itself retired and redirects on to c.
    const rows = [
      { from: '/products/a', to: '/products/b' },
      { from: '/products/b', to: '/products/c' },
    ]
    const { resolved } = resolveRedirectChains(rows)
    expect(resolved.find((r) => r.from === '/products/a')).toEqual({ from: '/products/a', to: '/products/c' })
    expect(resolved.find((r) => r.from === '/products/b')).toEqual({ from: '/products/b', to: '/products/c' })
  })

  it('collapses a long chain (matches the 2026-09-15 commit\'s 36-row repoint)', () => {
    const rows = [
      { from: '/products/a', to: '/products/b' },
      { from: '/products/b', to: '/products/c' },
      { from: '/products/c', to: '/products/d' },
      { from: '/products/d', to: '/products/e' },
    ]
    const { resolved, unresolvedCycles } = resolveRedirectChains(rows)
    expect(resolved.find((r) => r.from === '/products/a')?.to).toBe('/products/e')
    expect(unresolvedCycles).toEqual([])
  })

  it('flags a genuine cycle instead of writing a bad guess', () => {
    const rows = [
      { from: '/products/a', to: '/products/b' },
      { from: '/products/b', to: '/products/a' },
    ]
    const { unresolvedCycles } = resolveRedirectChains(rows)
    expect(unresolvedCycles).toEqual(expect.arrayContaining(['/products/a', '/products/b']))
  })
})

describe('diffRedirects', () => {
  const previous = [
    { from: '/products/a', to: '/products/x' },
    { from: '/products/b', to: '/products/y' },
  ]

  it('reports an added row', () => {
    const next = [...previous, { from: '/products/c', to: '/products/z' }]
    const diff = diffRedirects(previous, next)
    expect(diff.added).toEqual([{ from: '/products/c', to: '/products/z' }])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([])
    expect(diff.unchanged).toBe(2)
  })

  it('reports a removed row', () => {
    const next = [previous[0]]
    const diff = diffRedirects(previous, next)
    expect(diff.removed).toEqual([previous[1]])
    expect(diff.unchanged).toBe(1)
  })

  it('reports a changed target (a repointed chain, e.g.)', () => {
    const next = [{ from: '/products/a', to: '/products/w' }, previous[1]]
    const diff = diffRedirects(previous, next)
    expect(diff.changed).toEqual([{ from: '/products/a', oldTo: '/products/x', newTo: '/products/w' }])
    expect(diff.unchanged).toBe(1)
  })
})

describe('sortRedirects', () => {
  it('sorts by from, for stable file diffs', () => {
    const rows = [
      { from: '/products/z', to: '/products/1' },
      { from: '/products/a', to: '/products/2' },
    ]
    expect(sortRedirects(rows).map((r) => r.from)).toEqual(['/products/a', '/products/z'])
  })

  it('does not mutate the input array', () => {
    const rows = [{ from: '/products/z', to: '/products/1' }, { from: '/products/a', to: '/products/2' }]
    const original = [...rows]
    sortRedirects(rows)
    expect(rows).toEqual(original)
  })
})
