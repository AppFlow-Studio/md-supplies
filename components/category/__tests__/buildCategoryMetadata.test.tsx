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

function ogImageDimensions(m: Awaited<ReturnType<typeof buildCategoryMetadata>>): { width?: number; height?: number } | undefined {
  return (m.openGraph as { images?: { width?: number; height?: number }[] })?.images?.[0]
}

describe('buildCategoryMetadata — OG image', () => {
  it('passes the collection image through on the canonical (unfiltered, page 1) branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', {})
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
    const dims = ogImageDimensions(m)
    expect(dims?.width).toBe(800)
    expect(dims?.height).toBe(800)
  })

  it('passes the collection image through on the filtered/sorted branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', { sort: 'PRICE_ASC' })
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
    const dims = ogImageDimensions(m)
    expect(dims?.width).toBe(800)
    expect(dims?.height).toBe(800)
  })

  it('passes the collection image through on the paginated branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', { page: '2' })
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
    const dims = ogImageDimensions(m)
    expect(dims?.width).toBe(800)
    expect(dims?.height).toBe(800)
  })

  it('falls back to the default OG image when the collection has no image', async () => {
    mockFetch.mockResolvedValue({ collection: { ...collection, image: null } })
    const m = await buildCategoryMetadata('exam-gloves', {})
    expect(ogImageUrl(m)).not.toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })
})

// ── P0.5 / P0.6: the two Surgery routes carry their own identity ────────────
//
// The Trocar collection's Shopify `seo.title` is
// "Trocars & Trocar Kits - 3.2mm, 3.5mm, 4.5mm - FDA Registered". The scope is
// now correct (this route serves exactly those 41 products), but the
// FDA-registration assertion is uncontrolled merchandising copy this codebase
// cannot verify, so featured subcategories take the registry name and approved
// description instead — the same rule proxy collections already follow.
describe('buildCategoryMetadata — Surgery & Procedure vs Trocars identity', () => {
  const surgeryCollection: CollectionHero = {
    id: 'gid://shopify/Collection/10',
    title: 'Surgery & Procedure',
    handle: 'surgery-procedure',
    description: 'Shop a complete range of surgery and procedure supplies.',
    descriptionHtml: '<p>Shop a complete range of surgery and procedure supplies.</p>',
    image: null,
    seo: { title: null, description: null },
  }

  const trocarCollection: CollectionHero = {
    id: 'gid://shopify/Collection/11',
    title: 'Trocars & Trocar Kits',
    handle: 'trocars-trocar-kits',
    description: 'Surgery & Procedure > Trocars & Trocar Kits Shop FDA-registered Trocars.',
    descriptionHtml: '<p>Shop FDA-registered Trocars.</p>',
    image: null,
    seo: {
      title: 'Trocars & Trocar Kits - 3.2mm, 3.5mm, 4.5mm - FDA Registered',
      description: 'FDA-registered trocars for hormone pellet insertion.',
    },
  }

  it('titles the broad parent "Surgery & Procedure"', async () => {
    mockFetch.mockResolvedValue({ collection: surgeryCollection })
    const m = await buildCategoryMetadata('surgery-procedure', {})
    expect(JSON.stringify(m.title)).toContain('Surgery & Procedure')
    expect(JSON.stringify(m.title)).not.toContain('Trocar')
  })

  it('titles the Trocar route "Trocars & Trocar Kits", never "Surgery & Procedure"', async () => {
    mockFetch.mockResolvedValue({ collection: trocarCollection })
    const m = await buildCategoryMetadata('trocars-trocar-kits', {})
    expect(JSON.stringify(m.title)).toContain('Trocars & Trocar Kits')
    expect(JSON.stringify(m.title)).not.toMatch(/^.*Surgery & Procedure.*$/)
  })

  it('does not restate the unverifiable FDA-registration claim', async () => {
    mockFetch.mockResolvedValue({ collection: trocarCollection })
    const m = await buildCategoryMetadata('trocars-trocar-kits', {})
    const serialized = JSON.stringify({ title: m.title, description: m.description, og: m.openGraph })
    expect(serialized).not.toMatch(/FDA/i)
  })

  it('uses the approved registry description for the Trocar route', async () => {
    mockFetch.mockResolvedValue({ collection: trocarCollection })
    const m = await buildCategoryMetadata('trocars-trocar-kits', {})
    expect(m.description).toMatch(/3\.2mm/)
    expect(m.description).toMatch(/trocar kits/i)
  })

  it('canonicalises each route to its own URL', async () => {
    mockFetch.mockResolvedValue({ collection: surgeryCollection })
    const surgery = await buildCategoryMetadata('surgery-procedure', {})
    mockFetch.mockResolvedValue({ collection: trocarCollection })
    const trocars = await buildCategoryMetadata('trocars-trocar-kits', {})

    expect(String(surgery.alternates?.canonical)).toContain('/category/surgery-procedure')
    expect(String(trocars.alternates?.canonical)).toContain('/category/trocars-trocar-kits')
    expect(String(surgery.alternates?.canonical)).not.toBe(String(trocars.alternates?.canonical))
  })

  it('noindexes filtered states on both routes', async () => {
    mockFetch.mockResolvedValue({ collection: trocarCollection })
    const m = await buildCategoryMetadata('trocars-trocar-kits', { sort: 'PRICE_ASC' })
    expect(JSON.stringify(m.robots)).toMatch(/noindex|"index":false/)
  })
})
