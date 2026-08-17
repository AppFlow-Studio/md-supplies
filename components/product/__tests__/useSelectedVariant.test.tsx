import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelectedVariant } from '../useSelectedVariant'
import type { Product, ProductVariant } from '@/lib/shopify/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/product/aerowalk',
}))

const blueImg = { id: 'img-blue', url: 'https://cdn/blue.jpg', altText: 'Blue', width: 800, height: 800 }
const whiteImg = { id: 'img-white', url: 'https://cdn/white.jpg', altText: 'White', width: 800, height: 800 }

function makeVariant(overrides: Partial<ProductVariant>): ProductVariant {
  return {
    id: 'gid://shopify/ProductVariant/1',
    title: 'Blue',
    sku: 'SKU-1',
    availableForSale: true,
    quantityAvailable: 10,
    selectedOptions: [{ name: 'Color', value: 'Blue' }],
    price: { amount: '10.00', currencyCode: 'USD' },
    compareAtPrice: null,
    ...overrides,
  }
}

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'gid://shopify/Product/1',
    title: 'AeroWalk Ultra-Lite Rollator',
    handle: 'aerowalk-ultra-lite-rollator',
    description: '', descriptionHtml: '', vendor: 'Drive Medical',
    availableForSale: true, tags: [],
    priceRange: { minVariantPrice: { amount: '10', currencyCode: 'USD' }, maxVariantPrice: { amount: '10', currencyCode: 'USD' } },
    images: { nodes: [blueImg] },
    variants: { nodes: [] },
    options: [{ id: 'opt1', name: 'Color', values: ['Blue', 'White', 'Grey'] }],
    seo: { title: null, description: null },
    collections: { nodes: [] },
    brandName: null, unitsPerOrder: null, quantityOfUnits: null, orderSize: null,
    material: null, use: null, features: null, color: null, sterility: null,
    thickness: null, gloveSize: null, needleGauge: null, needleLength: null,
    sizeLength: null, estimatedRestockDate: null, backorderRestockEta: null,
    testsFor: null, detectableDrugs: null, adulterants: null, otherFeatures: null,
    typeList: null, customBadge1: null, customBadge2: null, customBadge3: null,
    shippingReturns: null,
    ...overrides,
  }
}

describe('useSelectedVariant — gallery fallback (AeroWalk gap)', () => {
  it('uses the selected variant image first when present', () => {
    const variant = makeVariant({ image: whiteImg })
    const product = makeProduct({ images: { nodes: [blueImg] } })
    const { result } = renderHook(() => useSelectedVariant(product, variant))
    expect(result.current.galleryImages[0]).toEqual(whiteImg)
  })

  it('never falls back to another color\'s shared images when the selected variant has no image on a multi-color product', () => {
    const variant = makeVariant({ image: null })
    const product = makeProduct({ images: { nodes: [blueImg] } }) // only Blue's image exists at product level
    const { result } = renderHook(() => useSelectedVariant(product, variant))
    expect(result.current.galleryImages).toEqual([])
    expect(result.current.isMultiColor).toBe(true)
  })

  it('falls back to the shared product gallery when the product is not multi-color (no leak risk)', () => {
    const variant = makeVariant({ image: null, selectedOptions: [{ name: 'Title', value: 'Case of 24' }] })
    const product = makeProduct({
      images: { nodes: [blueImg] },
      options: [{ id: 'opt1', name: 'Title', values: ['Each', 'Case of 24'] }],
    })
    const { result } = renderHook(() => useSelectedVariant(product, variant))
    expect(result.current.galleryImages).toEqual([blueImg])
    expect(result.current.isMultiColor).toBe(false)
  })

  it('resets the active image index when the selected variant changes', () => {
    const blue = makeVariant({ id: 'v-blue', image: blueImg })
    const white = makeVariant({ id: 'v-white', image: whiteImg, selectedOptions: [{ name: 'Color', value: 'White' }] })
    const product = makeProduct({ images: { nodes: [] } })
    const { result } = renderHook(() => useSelectedVariant(product, blue))
    act(() => result.current.setActiveImg(2))
    expect(result.current.activeImg).toBe(2)
    act(() => result.current.select(white))
    expect(result.current.activeImg).toBe(0)
  })
})
