import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ProductView } from '../ProductView'
import type { Product, ProductVariant, CollectionProduct } from '@/lib/shopify/types'

afterEach(cleanup)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/product/aerowalk-ultra-lite-rollator',
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string; priority?: boolean }) => {
    const { fill: _fill, sizes: _sizes, priority: _priority, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('@/components/store/CartProvider', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}))

const blueImg = { id: 'img-blue', url: 'https://cdn/blue.jpg', altText: 'Blue', width: 800, height: 800 }
const whiteImg = { id: 'img-white', url: 'https://cdn/white.jpg', altText: 'White', width: 800, height: 800 }

const blueVariant: ProductVariant = {
  id: 'gid://shopify/ProductVariant/1', title: 'Blue', sku: '10277BL',
  availableForSale: true, quantityAvailable: 10,
  selectedOptions: [{ name: 'Color', value: 'Blue' }],
  price: { amount: '129.99', currencyCode: 'USD' }, compareAtPrice: null,
  image: blueImg,
  manufacturerNumber: '10277BL', orderSize: 'Each', unitsPerOrder: '1', description: null,
}

const whiteVariant: ProductVariant = {
  ...blueVariant, id: 'gid://shopify/ProductVariant/2', title: 'White',
  selectedOptions: [{ name: 'Color', value: 'White' }],
  image: whiteImg,
  manufacturerNumber: '10277WT', orderSize: null, unitsPerOrder: null,
  description: 'Includes an extra-wide seat pad not on other colors.',
}

const product: Product = {
  id: 'gid://shopify/Product/1', title: 'AeroWalk Ultra-Lite Rollator',
  handle: 'aerowalk-ultra-lite-rollator', description: 'A lightweight rollator.',
  descriptionHtml: '<p>A lightweight rollator.</p>', vendor: 'Drive Medical',
  availableForSale: true, tags: [],
  priceRange: { minVariantPrice: { amount: '129.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '129.99', currencyCode: 'USD' } },
  images: { nodes: [blueImg] },
  variants: { nodes: [blueVariant, whiteVariant] },
  options: [{ id: 'opt1', name: 'Color', values: ['Blue', 'White'] }],
  seo: { title: null, description: null }, collections: { nodes: [] },
  brandName: null, unitsPerOrder: '1', quantityOfUnits: null, orderSize: 'Each',
  material: null, use: null, features: null, color: null, sterility: null,
  thickness: null, gloveSize: null, needleGauge: null, needleLength: null,
  sizeLength: null, estimatedRestockDate: null, backorderRestockEta: null,
  testsFor: null, detectableDrugs: null, adulterants: null, otherFeatures: null,
  typeList: null, customBadge1: null, customBadge2: null, customBadge3: null,
  shippingReturns: null,
}

function renderPDP(initialVariant: ProductVariant, productOverrides: Partial<Product> = {}) {
  return render(
    <ProductView
      product={{ ...product, ...productOverrides }}
      initialVariant={initialVariant}
      relatedProducts={[]}
      complementaryProducts={[]}
    />,
  )
}

describe('ProductView — manufacturer number vs internal SKU (AeroWalk)', () => {
  it('shows internal SKU and manufacturer number as two separately-labeled values near the title', () => {
    renderPDP(blueVariant)
    expect(screen.getByText('SKU: 10277BL')).toBeInTheDocument()
    expect(screen.getByText('Mfr #: 10277BL')).toBeInTheDocument()
  })

  it('Specifications tab shows Manufacturer Item Number and Internal SKU as separate rows, not one conflated "Item Number"', () => {
    renderPDP(blueVariant)
    expect(screen.getByText('Manufacturer Item Number')).toBeInTheDocument()
    expect(screen.getByText('Internal SKU')).toBeInTheDocument()
    expect(screen.queryByText('Item Number')).not.toBeInTheDocument()
  })

  it('switching from Blue to White updates the manufacturer number', () => {
    renderPDP(blueVariant)
    fireEvent.click(screen.getByRole('button', { name: 'Color: White' }))
    expect(screen.getByText('Mfr #: 10277WT')).toBeInTheDocument()
  })
})

// P0.5 (Bilal, 2026-08-18): renamed from "RETURNS" to "VENDOR SHIPPING &
// RETURNS", and the tab is hidden entirely (not a generic-policy fallback)
// when custom.shipping_returns is empty. The general policy still lives at
// /returns (DEV-POLICY-01) — this tab is vendor-specific-only.
describe('ProductView — Vendor Shipping & Returns (H-01/P0.5)', () => {
  it('renders the vendor-specific return policy on the Vendor Shipping & Returns tab when custom.shipping_returns is set', () => {
    const richText = JSON.stringify({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Ships via Drive Medical freight. Returns require a 30-day RGA.' }] }],
    })
    renderPDP(blueVariant, { shippingReturns: richText })
    fireEvent.click(screen.getByRole('tab', { name: 'VENDOR SHIPPING & RETURNS' }))
    expect(screen.getByText('Drive Medical Return Policy')).toBeInTheDocument()
    expect(screen.getByText(/Ships via Drive Medical freight/)).toBeInTheDocument()
  })

  it('hides the Vendor Shipping & Returns tab entirely when custom.shipping_returns is empty', () => {
    renderPDP(blueVariant, { shippingReturns: null })
    expect(screen.queryByRole('tab', { name: 'VENDOR SHIPPING & RETURNS' })).not.toBeInTheDocument()
    expect(screen.queryByText('Drive Medical Return Policy')).not.toBeInTheDocument()
    expect(screen.queryByText('Return Authorization Required')).not.toBeInTheDocument()
  })
})

describe('ProductView — ORDER PACKAGING breakdown (LG-04, 2026-08-17)', () => {
  it('shows Inner Pack Quantity and Packs Per Case but not Total when the source never stated one (izzy: "blank means no data, not zero")', () => {
    const boxVariant: ProductVariant = {
      ...blueVariant,
      innerPackQuantity: '100',
      packsPerCase: '8',
      totalOrderQuantity: null,
    }
    renderPDP(boxVariant)
    fireEvent.click(screen.getByRole('tab', { name: 'ORDER PACKAGING' }))
    expect(screen.getByText('Inner Pack Quantity')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Packs Per Case')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.queryByText('Total Order Quantity')).not.toBeInTheDocument()
  })

  it('shows only Total Order Quantity when that is the only value the source gave', () => {
    const totalOnlyVariant: ProductVariant = {
      ...blueVariant,
      innerPackQuantity: null,
      packsPerCase: null,
      totalOrderQuantity: '2000',
    }
    renderPDP(totalOnlyVariant)
    fireEvent.click(screen.getByRole('tab', { name: 'ORDER PACKAGING' }))
    expect(screen.getByText('Total Order Quantity')).toBeInTheDocument()
    expect(screen.getByText('2000')).toBeInTheDocument()
    expect(screen.queryByText('Inner Pack Quantity')).not.toBeInTheDocument()
    expect(screen.queryByText('Packs Per Case')).not.toBeInTheDocument()
  })

  it('shows none of the three breakdown rows when the variant has no packaging-breakdown data at all', () => {
    const emptyVariant: ProductVariant = {
      ...blueVariant,
      innerPackQuantity: null,
      packsPerCase: null,
      totalOrderQuantity: null,
    }
    renderPDP(emptyVariant)
    fireEvent.click(screen.getByRole('tab', { name: 'ORDER PACKAGING' }))
    expect(screen.queryByText('Inner Pack Quantity')).not.toBeInTheDocument()
    expect(screen.queryByText('Packs Per Case')).not.toBeInTheDocument()
    expect(screen.queryByText('Total Order Quantity')).not.toBeInTheDocument()
  })

  it('shows the newly-selected variant\'s packaging breakdown, never a stale value carried over from the previously-selected variant', () => {
    const boxVariant: ProductVariant = {
      ...blueVariant,
      innerPackQuantity: '100',
      packsPerCase: '8',
      totalOrderQuantity: null,
    }
    const caseVariant: ProductVariant = {
      ...whiteVariant,
      innerPackQuantity: null,
      packsPerCase: null,
      totalOrderQuantity: '2000',
    }
    renderPDP(boxVariant, { variants: { nodes: [boxVariant, caseVariant] } })
    fireEvent.click(screen.getByRole('tab', { name: 'ORDER PACKAGING' }))
    expect(screen.getByText('Inner Pack Quantity')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Packs Per Case')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.queryByText('Total Order Quantity')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Color: White' }))

    expect(screen.getByText('Total Order Quantity')).toBeInTheDocument()
    expect(screen.getByText('2000')).toBeInTheDocument()
    expect(screen.queryByText('Inner Pack Quantity')).not.toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(screen.queryByText('Packs Per Case')).not.toBeInTheDocument()
    expect(screen.queryByText('8')).not.toBeInTheDocument()
  })
})

describe('ProductView — variant-sourced order unit, above Add to Cart', () => {
  it('falls back to the shared product order size when the variant has none (White)', () => {
    renderPDP(whiteVariant)
    expect(screen.getByText('Each')).toBeInTheDocument()
  })

  it('order unit block renders before the Add to Cart button in document order', () => {
    renderPDP(blueVariant)
    const orderUnitLabel = screen.getByText('UNIT')
    const addToCart = screen.getByRole('button', { name: /Add to Cart/i })
    // DOCUMENT_POSITION_FOLLOWING = 4 means addToCart follows orderUnitLabel
    expect(orderUnitLabel.compareDocumentPosition(addToCart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('ProductView — Variant Description supplement (no duplicate display)', () => {
  it('renders the variant description when it differs from the product description', () => {
    renderPDP(whiteVariant)
    expect(screen.getByText(/extra-wide seat pad/)).toBeInTheDocument()
  })

  it('renders nothing extra when the variant has no description', () => {
    renderPDP(blueVariant)
    expect(screen.queryByText('Variant Details')).not.toBeInTheDocument()
  })

  // Izzy's real 2026-08-15 AeroWalk QA write created custom.variant_description
  // as a rich_text_field, not the plain multi-line text the field contract
  // proposed — confirmed by querying live QA data (scripts/verify-aerowalk-pilot.ts),
  // which returned Shopify's JSON AST verbatim in .value. Without flattening,
  // this JSON would render as-is on the page.
  it('flattens Shopify rich-text JSON instead of rendering it raw', () => {
    const richTextVariant: ProductVariant = {
      ...whiteVariant,
      description: JSON.stringify({
        type: 'root',
        children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Blue frame with matching fork covers.' }] }],
      }),
    }
    renderPDP(richTextVariant)
    expect(screen.getByText('Blue frame with matching fork covers.')).toBeInTheDocument()
    expect(screen.queryByText(/"type":"root"/)).not.toBeInTheDocument()
  })
})

// Task 4 (2026-08-18): "You May Also Need" (the relatedProducts.slice(4)
// overflow scroll row) hand-rolled bare <div> cards instead of reusing
// RelatedProductCard like its two siblings ("Frequently Bought With" /
// "You May Also Like") — no <Link>, no keyboard focus, no accessible name.
describe('ProductView — You May Also Need cards are clickable (Task 4)', () => {
  function collectionProduct(overrides: Partial<CollectionProduct> = {}): CollectionProduct {
    return {
      id: 'gid://shopify/Product/900',
      title: 'Filler Item',
      handle: 'filler-item',
      vendor: 'AcmeMed',
      availableForSale: true,
      tags: [],
      priceRange: { minVariantPrice: { amount: '5.00', currencyCode: 'USD' }, maxVariantPrice: { amount: '5.00', currencyCode: 'USD' } },
      images: { nodes: [] },
      variants: { nodes: [] },
      ...overrides,
    }
  }

  it('You May Also Need cards are real links to the product page', () => {
    const relatedProducts: CollectionProduct[] = [
      collectionProduct({ id: 'gid://shopify/Product/901', handle: 'item-1', title: 'Item 1' }),
      collectionProduct({ id: 'gid://shopify/Product/902', handle: 'item-2', title: 'Item 2' }),
      collectionProduct({ id: 'gid://shopify/Product/903', handle: 'item-3', title: 'Item 3' }),
      collectionProduct({ id: 'gid://shopify/Product/904', handle: 'item-4', title: 'Item 4' }),
      collectionProduct({ id: 'gid://shopify/Product/905', handle: 'extra-recommended-item', title: 'Extra Recommended Item' }),
    ]
    render(
      <ProductView
        product={product}
        initialVariant={blueVariant}
        relatedProducts={relatedProducts}
        complementaryProducts={[]}
      />,
    )

    const links = screen.getAllByRole('link', { name: /Extra Recommended Item/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/product/extra-recommended-item')
  })
})
