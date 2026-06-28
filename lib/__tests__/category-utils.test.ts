import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRelatedCategories } from '../category-utils'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

function setupCollections(handles: { handle: string; title: string }[]) {
  mockFetch.mockResolvedValue({ collections: { nodes: handles } })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('getRelatedCategories', () => {
  it('excludes removed/hidden categories from the related list', async () => {
    setupCollections([
      { handle: 'gloves', title: 'Gloves' },
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'pharmaceuticals', title: 'Pharmaceuticals' },
      { handle: 'beds', title: 'Beds' },
      { handle: 'office-supplies', title: 'Office Supplies' },
    ])
    const related = await getRelatedCategories('gloves')
    const slugs = related.map((c) => c.slug)
    expect(slugs).toContain('wound-care')
    expect(slugs).not.toContain('pharmaceuticals')
    expect(slugs).not.toContain('beds')
    expect(slugs).not.toContain('office-supplies')
  })

  it('still excludes the current category and its subcategories', async () => {
    setupCollections([
      { handle: 'gloves', title: 'Gloves' },
      { handle: 'gloves-nitrile', title: 'Nitrile Gloves' },
      { handle: 'wound-care', title: 'Wound Care' },
    ])
    const related = await getRelatedCategories('gloves')
    const slugs = related.map((c) => c.slug)
    expect(slugs).not.toContain('gloves')
    expect(slugs).not.toContain('gloves-nitrile')
    expect(slugs).toContain('wound-care')
  })

  it('only returns roadmap-allowed handles as related options', async () => {
    setupCollections([
      { handle: 'gloves', title: 'Gloves' },
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'non-roadmap-handle', title: 'Not In Roadmap' },
    ])
    const related = await getRelatedCategories('wound-care')
    const slugs = related.map((c) => c.slug)
    expect(slugs).toContain('gloves')
    expect(slugs).not.toContain('non-roadmap-handle')
  })
})
