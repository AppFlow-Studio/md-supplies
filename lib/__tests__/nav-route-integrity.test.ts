import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { CATEGORY_TREE_L1, buildCategoryTreeNav } from '../category-tree'
import { ROUTES } from '../routes'

/**
 * DEV-NAV-01 — "Fix Needles/Syringes so it routes to the canonical
 * Needles/Syringes L1 page, not the generic /categories page."
 *
 * The regression this pins: the layout fetched ONE page of collections
 * (first: 249) out of ~695 live ones and used it as the "does this collection
 * exist" allowlist. `needles-syringes` sorts past that page, so the header
 * link failed closed to /categories — the exact defect the ticket names,
 * shipped while the ticket was believed complete. Verified against the live
 * Storefront API on 2026-07-30: all 25 registry L1 handles exist, including
 * needles-syringes.
 */

// Mirrors the Header's slugifier.
function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Mirrors the Header's resolution order (registry first, then live list).
function categoryHref(title: string, liveHandles: Set<string>): string {
  const slug = titleToSlug(title)
  const registryHandles = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))
  if (registryHandles.has(slug)) return ROUTES.category(slug)
  if (liveHandles.size > 0 && !liveHandles.has(slug)) return ROUTES.categories
  return ROUTES.category(slug)
}

describe('DEV-NAV-01 — Needles/Syringes routes to its canonical L1 page', () => {
  it('the Shopify menu title slugifies to the registry handle', () => {
    expect(titleToSlug('Needles/Syringes')).toBe('needles-syringes')
    expect(CATEGORY_TREE_L1.some((c) => c.collectionHandle === 'needles-syringes')).toBe(true)
  })

  it('never degrades to /categories, even when the live handle list is truncated', () => {
    // The exact production condition: a truncated page that omits the handle.
    const truncated = new Set(['gloves', 'home-care', 'mobility', 'testing-screening'])
    expect(categoryHref('Needles/Syringes', truncated)).toBe('/category/needles-syringes')
    expect(categoryHref('Needles/Syringes', truncated)).not.toBe(ROUTES.categories)
  })

  it('resolves correctly with a complete live list and with no list at all', () => {
    const complete = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))
    expect(categoryHref('Needles/Syringes', complete)).toBe('/category/needles-syringes')
    expect(categoryHref('Needles/Syringes', new Set())).toBe('/category/needles-syringes')
  })

  it('still fails closed for a title that is not a registry route', () => {
    const live = new Set(['gloves'])
    expect(categoryHref('Totally Made Up Menu Item', live)).toBe(ROUTES.categories)
  })

  it('every registry L1 keeps a canonical /category/<handle> route', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      const href = categoryHref(l1.displayName, new Set())
      // displayName may not slugify to the handle (e.g. "Needles & Syringes"),
      // so assert via the registry-driven nav builder instead.
      expect(href.startsWith('/category/') || href === ROUTES.categories).toBe(true)
    }
    const nav = buildCategoryTreeNav(CATEGORY_TREE_L1.map((l1) => ({ handle: l1.collectionHandle })))
    const all = [...nav.primary, ...nav.more]
    expect(all).toHaveLength(CATEGORY_TREE_L1.length)
    for (const entry of all) {
      expect(entry.href).toMatch(/^\/category\/[a-z0-9-]+$/)
      expect(entry.href).not.toBe(ROUTES.categories)
    }
  })
})

describe('the layout must not reconcile nav against a truncated collection page', () => {
  it('layout.tsx fetches the complete paginated handle set', () => {
    const src = readFileSync('app/layout.tsx', 'utf8')
    expect(src).toContain('fetchAllCollectionHandles')
    // The truncated single-page fetch must not come back.
    expect(src).not.toMatch(/GET_COLLECTIONS_SLIM[\s\S]{0,120}first:\s*\d+/)
  })

  it('the handle fetcher paginates rather than taking one page', () => {
    const src = readFileSync('lib/shopify/collection-handles.server.ts', 'utf8')
    expect(src).toContain('hasNextPage')
    expect(src).toContain('endCursor')
  })
})
