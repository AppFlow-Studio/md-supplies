import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRelatedCategories,
  getSubcategories,
  getCrossLinkedSubcategories,
} from '../category-utils'
import { getL1ByTag, getSubcategoriesOf } from '@/lib/category-tree'
import { BOUNDARY_OVERRIDES } from '@/lib/category-tree/config'

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

describe('getSubcategories (registry-driven)', () => {
  it('returns [] for a slug that is not a registry L1', async () => {
    setupCollections([{ handle: 'gloves-nitrile', title: 'Nitrile Gloves' }])
    expect(await getSubcategories('not-an-l1')).toEqual([])
  })

  it('only surfaces registry category-kind subs that have a live collection', async () => {
    const l1 = getL1ByTag('exam-room')!
    const subs = getSubcategoriesOf(l1.tag)
    const first = subs[0]
    setupCollections([
      { handle: `${l1.handle}-${first.tag}`, title: 'Whatever Title' },
      { handle: `${l1.handle}-not-a-registry-sub`, title: 'Legacy Prefix Match' },
    ])
    const result = await getSubcategories(l1.handle)
    expect(result.map((s) => s.slug)).toEqual([first.tag])
    // label is humanized from the tag, never the collection title
    expect(result[0].label).not.toBe('Whatever Title')
  })
})

describe('getCrossLinkedSubcategories', () => {
  it('cross-links point at the OWNING parent handle (one canonical URL)', () => {
    for (const b of BOUNDARY_OVERRIDES) {
      const crossLinkL1 = getL1ByTag(b.crossLinkTag)!
      const owner = getL1ByTag(b.parentTag)!
      const links = getCrossLinkedSubcategories(crossLinkL1.handle)
      const link = links.find((l) => l.subSlug === b.subcategoryTag)
      if (!link) continue // boundary sub absent from live data
      expect(link.catSlug).toBe(owner.handle)
    }
  })

  it('returns [] for non-L1 slugs', () => {
    expect(getCrossLinkedSubcategories('nope')).toEqual([])
  })
})

import { getPrimaryCollection } from '@/lib/category-utils'
import { getAllowedHandles } from '@/lib/category-nav'
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'

describe('getPrimaryCollection', () => {
  const allowedHandle = [...getAllowedHandles()][0]
  const excludedHandle = [...EXCLUDED_COLLECTION_HANDLES][0]

  it('prefers the first roadmap-approved collection', () => {
    const picked = getPrimaryCollection([
      { handle: 'random-unmapped', title: 'Random' },
      { handle: allowedHandle, title: 'Approved' },
    ])
    expect(picked?.handle).toBe(allowedHandle)
  })

  it('falls back to the first non-excluded collection', () => {
    const picked = getPrimaryCollection([
      { handle: excludedHandle, title: 'Excluded' },
      { handle: 'some-collection', title: 'Some' },
    ])
    expect(picked?.handle).toBe('some-collection')
  })

  it('returns null when every collection is excluded or the list is empty', () => {
    expect(getPrimaryCollection([])).toBeNull()
    expect(getPrimaryCollection([{ handle: excludedHandle, title: 'X' }])).toBeNull()
  })
})
