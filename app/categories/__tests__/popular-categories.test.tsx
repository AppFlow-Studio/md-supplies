import { describe, it, expect } from 'vitest'
import {
  CATEGORY_TREE_L1,
  FEATURED_SUBCATEGORIES,
  getCategorySlug,
  getFeaturedSubcategoriesForParent,
} from '@/lib/category-tree'

/**
 * P0.3 — Trocars & Trocar Kits joins the /categories "Popular Categories"
 * strip WITHOUT displacing Surgery & Procedure and without leaving an orphaned
 * card in the grid.
 *
 * This mirrors the selection logic in app/categories/page.tsx rather than
 * rendering the page: that component is an async Server Component whose body
 * is three Storefront round-trips, and the thing that actually broke is the
 * SELECTION — which entries survive the live-handle gate, in what order, and
 * how many are kept.
 */

const POPULAR_LIMIT = 12
const MOBILE_COLUMNS = 2
const DESKTOP_COLUMNS = 4

type Entry = { key: string; href: string; displayName: string }

function buildPopular(liveHandles: Set<string>, limit = POPULAR_LIMIT): Entry[] {
  const l1 = CATEGORY_TREE_L1.filter(
    (c) => c.navGroup === 'primary' && liveHandles.has(c.collectionHandle),
  ).map((c) => ({
    key: c.tag,
    href: `/category/${getCategorySlug(c)}`,
    displayName: c.displayName,
  }))

  return l1
    .flatMap((entry) => [
      entry,
      ...getFeaturedSubcategoriesForParent(entry.key)
        .filter((s) => liveHandles.has(s.collectionHandle))
        .map((s) => ({ key: s.slug, href: `/category/${s.slug}`, displayName: s.displayName })),
    ])
    .slice(0, limit)
}

/** Every registry handle live — the real production case. */
const ALL_LIVE = new Set<string>([
  ...CATEGORY_TREE_L1.map((c) => c.collectionHandle),
  ...FEATURED_SUBCATEGORIES.map((s) => s.collectionHandle),
])

describe('Popular Categories strip (P0.3)', () => {
  const popular = buildPopular(ALL_LIVE)

  it('includes BOTH Surgery & Procedure and Trocars & Trocar Kits', () => {
    const names = popular.map((e) => e.displayName)
    expect(names).toContain('Surgery & Procedure')
    expect(names).toContain('Trocars & Trocar Kits')
  })

  it('points each at its own distinct route', () => {
    const byName = new Map(popular.map((e) => [e.displayName, e.href]))
    expect(byName.get('Surgery & Procedure')).toBe('/category/surgery-procedure')
    expect(byName.get('Trocars & Trocar Kits')).toBe('/category/trocars-trocar-kits')
  })

  it('places Trocars immediately after its parent, not appended at the end', () => {
    const names = popular.map((e) => e.displayName)
    expect(names.indexOf('Trocars & Trocar Kits')).toBe(names.indexOf('Surgery & Procedure') + 1)
  })

  it('fills whole rows at both grid widths — no orphaned final card', () => {
    // grid-cols-2 on phones, sm:grid-cols-4 above. A count that is not a
    // common multiple leaves a short last row, which is the "orphaned card"
    // and "excessive empty space" the brief rules out.
    expect(popular.length % MOBILE_COLUMNS).toBe(0)
    expect(popular.length % DESKTOP_COLUMNS).toBe(0)
  })

  it('renders every card exactly once', () => {
    const keys = popular.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
    const hrefs = popular.map((e) => e.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('the old 8-card window did NOT reach Surgery & Procedure — the regression this guards', () => {
    // Documents why the limit moved: at 8, the strip stopped at Mobility, so
    // adding Trocars alone would not have put either card on the page.
    const oldWindow = buildPopular(ALL_LIVE, 8).map((e) => e.displayName)
    expect(oldWindow).not.toContain('Surgery & Procedure')
    expect(oldWindow).not.toContain('Trocars & Trocar Kits')
  })

  it('drops the child but keeps the parent when the Trocar collection is not live', () => {
    const withoutTrocars = new Set(ALL_LIVE)
    withoutTrocars.delete('trocars-trocar-kits')
    const names = buildPopular(withoutTrocars).map((e) => e.displayName)
    expect(names).toContain('Surgery & Procedure')
    expect(names).not.toContain('Trocars & Trocar Kits')
  })

  it('is not silently truncated by a partial collection page', () => {
    // The real bug behind the missing cards: /categories gated on a single
    // 250-row `GET_COLLECTIONS` page while the store has ~695 collections, so
    // 9 registry handles — surgery-procedure among them — looked non-existent.
    // With only the first-page handles live, the parent disappears entirely.
    const truncated = new Set(['gloves', 'wound-care', 'trocars-trocar-kits'])
    const names = buildPopular(truncated).map((e) => e.displayName)
    expect(names).not.toContain('Surgery & Procedure')
    // Which is exactly why app/categories/page.tsx must call
    // fetchAllCollectionHandles() (paginated) and not GET_COLLECTIONS.
  })
})

describe('/categories page wiring (P0.3)', () => {
  it('uses the paginated handle fetcher, never the truncated single-page query', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(process.cwd(), 'app', 'categories', 'page.tsx'), 'utf8')
    // Strip comments first: the file explains the truncation bug by name, and
    // a prose mention of GET_COLLECTIONS must not read as a usage.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

    expect(code).toContain('fetchAllCollectionHandles')
    expect(code).not.toMatch(/\bGET_COLLECTIONS\b/)
    expect(code).not.toMatch(/first:\s*250/)
  })
})
