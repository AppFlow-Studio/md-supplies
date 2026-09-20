import { describe, it, expect, vi, beforeEach } from 'vitest'

// FIX-duplicate-category-urls (2026-09-05 Izzy brief): every subcategory was
// live at two indexable, self-canonicalising URLs — flat (/category/<tag>)
// and nested (/category/<parent>/<tag>) — and two nested URLs canonicalised
// to empty /product/ placeholder pages because their parent slug was no
// longer a registered L1. See docs/audits/2026-09-04-p0-seo-migration-
// integrity/EXCEPTIONS.md's sibling ticket write-up and the brief package
// for the sampled pairs (exam-gloves, insulin-pen-needles, blood-collection-
// tubes, etc).
vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({
  fetchProductTagSummaries: vi.fn(async () => []),
  hasFlatCategoryCollection: vi.fn(async () => false),
}))
vi.mock('@/lib/csp-nonce', () => ({ getNonce: vi.fn(async () => 'test-nonce') }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import CategoryProductPage, { generateMetadata } from '../[slug]/[product]/page'
import { fetchProductTagSummaries, hasFlatCategoryCollection } from '@/lib/category-tree-data.server'
import { redirect } from 'next/navigation'

const mockFetchProductTagSummaries = vi.mocked(fetchProductTagSummaries)
const mockHasFlatCategoryCollection = vi.mocked(hasFlatCategoryCollection)
const mockRedirect = vi.mocked(redirect)

beforeEach(() => {
  mockFetchProductTagSummaries.mockReset()
  mockHasFlatCategoryCollection.mockReset()
  mockRedirect.mockClear()
})

describe('FIX-duplicate-category-urls Defect 1 — nested tag with its own flat collection', () => {
  it('generateMetadata canonicalizes the nested route to the flat form when a live flat collection exists', async () => {
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'p1', categories: ['gloves'], subcategories: ['exam-gloves'] },
    ])
    mockHasFlatCategoryCollection.mockResolvedValue(true)

    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'gloves', product: 'exam-gloves' }),
      searchParams: Promise.resolve({}),
    })

    expect(mockHasFlatCategoryCollection).toHaveBeenCalledWith('exam-gloves')
    expect(meta.alternates?.canonical).toBe('https://mdsupplies.com/category/exam-gloves')
    expect(meta.robots).toBe('noindex,follow')
  })

  it('redirects the nested route to the flat form at render time when a live flat collection exists', async () => {
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'p1', categories: ['gloves'], subcategories: ['exam-gloves'] },
    ])
    mockHasFlatCategoryCollection.mockResolvedValue(true)

    await expect(
      CategoryProductPage({
        params: Promise.resolve({ slug: 'gloves', product: 'exam-gloves' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT:/category/exam-gloves')
  })

  it('renders the nested page normally (no redirect) when no flat collection exists for the tag', async () => {
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'p1', categories: ['gloves'], subcategories: ['exam-gloves'] },
    ])
    mockHasFlatCategoryCollection.mockResolvedValue(false)

    const result = await CategoryProductPage({
      params: Promise.resolve({ slug: 'gloves', product: 'exam-gloves' }),
      searchParams: Promise.resolve({}),
    })

    expect(result).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

describe('FIX-duplicate-category-urls Defect 2 — subcategory tag nested under a stale/non-L1 parent slug', () => {
  it('generateMetadata never falls through to the product lookup for a known tag under an unrecognized slug', async () => {
    // 'skin-preparation' is not a registered L1 collectionHandle — the
    // documented root cause (a renamed/removed parent) behind
    // /category/skin-preparation/alcohol-prep-pads canonicalising to the
    // empty /product/alcohol-prep-pads placeholder.
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'p1', categories: ['gloves'], subcategories: ['alcohol-prep-pads'] },
    ])
    mockHasFlatCategoryCollection.mockResolvedValue(true)

    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'skin-preparation', product: 'alcohol-prep-pads' }),
      searchParams: Promise.resolve({}),
    })

    expect(meta.alternates?.canonical).toBe('https://mdsupplies.com/category/alcohol-prep-pads')
    expect(meta.robots).toBe('noindex,follow')
  })

  it('redirects to the flat form when one exists for a tag reached via a stale parent slug', async () => {
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'p1', categories: ['gloves'], subcategories: ['alcohol-prep-pads'] },
    ])
    mockHasFlatCategoryCollection.mockResolvedValue(true)

    await expect(
      CategoryProductPage({
        params: Promise.resolve({ slug: 'skin-preparation', product: 'alcohol-prep-pads' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT:/category/alcohol-prep-pads')
  })

  it('redirects to the tag\'s true nested parent when no flat collection exists', async () => {
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'p1', categories: ['gloves'], subcategories: ['alcohol-prep-pads'] },
    ])
    mockHasFlatCategoryCollection.mockResolvedValue(false)

    await expect(
      CategoryProductPage({
        params: Promise.resolve({ slug: 'skin-preparation', product: 'alcohol-prep-pads' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT:/category/gloves/alcohol-prep-pads')
  })
})
