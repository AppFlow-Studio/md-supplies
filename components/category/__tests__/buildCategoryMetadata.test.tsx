import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { buildCategoryMetadata } from '../CategoryPageView'
import type { CollectionHero } from '@/lib/shopify/types'

const mockFetch = vi.mocked(storefrontFetch)

const collection: CollectionHero = {
  id: 'gid://shopify/Collection/1',
  title: 'Exam Gloves',
  handle: 'exam-gloves',
  description: 'Nitrile and latex exam gloves.',
  descriptionHtml: '<p>Nitrile and latex exam gloves.</p>',
  image: { id: 'img1', url: 'https://cdn.shopify.com/exam-gloves.jpg', altText: null, width: 800, height: 800 },
  seo: { title: null, description: null },
}

beforeEach(() => {
  mockFetch.mockReset()
})

function ogImageUrl(m: Awaited<ReturnType<typeof buildCategoryMetadata>>): string | undefined {
  return (m.openGraph as { images?: { url: string }[] })?.images?.[0]?.url
}

describe('buildCategoryMetadata — OG image', () => {
  it('passes the collection image through on the canonical (unfiltered, page 1) branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', {})
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })

  it('passes the collection image through on the filtered/sorted branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', { sort: 'PRICE_ASC' })
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })

  it('passes the collection image through on the paginated branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', { page: '2' })
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })

  it('falls back to the default OG image when the collection has no image', async () => {
    mockFetch.mockResolvedValue({ collection: { ...collection, image: null } })
    const m = await buildCategoryMetadata('exam-gloves', {})
    expect(ogImageUrl(m)).not.toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })
})
