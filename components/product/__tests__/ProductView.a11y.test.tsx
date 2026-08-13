import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import { ProductView } from '../ProductView'
import type { Product, CollectionProduct } from '@/lib/shopify/types'

afterEach(cleanup)

const replace = vi.fn()
beforeEach(() => replace.mockReset())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/product/flame-blue-glove',
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
  useCart: () => ({
    cart: null,
    isOpen: false,
    lastError: null,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    openCart: vi.fn(),
    closeCart: vi.fn(),
    clearError: vi.fn(),
  }),
}))

const product: Product = {
  id: 'gid://shopify/Product/1',
  title: 'Nitrile Exam Gloves',
  handle: 'nitrile-exam-gloves',
  description: 'Durable exam gloves.',
  descriptionHtml: '<p>Durable exam gloves.</p>',
  vendor: 'AcmeMed',
  availableForSale: true,
  tags: [],
  priceRange: {
    minVariantPrice: { amount: '9.99', currencyCode: 'USD' },
    maxVariantPrice: { amount: '9.99', currencyCode: 'USD' },
  },
  images: { nodes: [{ id: 'img1', url: '/gloves.jpg', altText: 'Gloves', width: 800, height: 800 }] },
  variants: {
    nodes: [{
      id: 'gid://shopify/ProductVariant/1',
      title: 'Default',
      sku: 'SKU-123',
      availableForSale: true,
      quantityAvailable: 10,
      selectedOptions: [],
      price: { amount: '9.99', currencyCode: 'USD' },
      compareAtPrice: null,
    }],
  },
  options: [],
  seo: { title: null, description: null },
  brandName: 'AcmeMed',
  unitsPerOrder: null,
  quantityOfUnits: null,
  orderSize: null,
  material: 'Nitrile',
  use: null,
  features: null,
  color: 'Blue',
  sterility: null,
  thickness: null,
  gloveSize: 'Medium',
  needleGauge: null,
  needleLength: null,
  sizeLength: null,
  estimatedRestockDate: null,
  backorderRestockEta: null,
  testsFor: null,
  detectableDrugs: null,
  adulterants: null,
  otherFeatures: null,
  typeList: null,
  customBadge1: null,
  customBadge2: null,
  customBadge3: null,
  collections: { nodes: [] },
}

describe('ProductView PDP semantic markup (Audit M13)', () => {
  it('exposes Item Number, Brand Name, Description, and Specifications as headings', () => {
    render(<ProductView product={product} initialVariant={product.variants.nodes[0]} relatedProducts={[]} complementaryProducts={[]} />)

    expect(screen.getByRole('heading', { name: 'Item Number' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Brand Name' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Description' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Specifications' })).toBeInTheDocument()
  })

  it('exposes spec-table label cells as row headers', () => {
    render(<ProductView product={product} initialVariant={product.variants.nodes[0]} relatedProducts={[]} complementaryProducts={[]} />)

    const table = screen.getByRole('table')
    const rowHeader = within(table).getByRole('rowheader', { name: 'Material' })
    expect(rowHeader.tagName).toBe('TH')
    expect(rowHeader).toHaveAttribute('scope', 'row')
  })
})

// DEV-RX-02 / Izzy retest on 225678bc: custom.backorder was read nowhere on
// the PDP, so a backordered product never showed the label regardless of the
// metafield's value.
describe('ProductView — Backorder label (DEV-RX-02)', () => {
  it('shows the Backorder badge when custom.backorder is true', () => {
    render(
      <ProductView
        product={{ ...product, backorder: { value: 'true' } }}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getByText('Backorder')).toBeInTheDocument()
  })

  it('renders no Backorder badge when custom.backorder is absent, even with a future ETA', () => {
    render(
      <ProductView
        product={{ ...product, estimatedRestockDate: '2099-01-01' }}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.queryByText(/Backorder/)).not.toBeInTheDocument()
  })

  // Regression for the "TB 1mL Syringe Only, Luer Lock" report
  // (gid://shopify/Product/8833486258392): custom.backorder=true with a
  // stale ETA (its actual restock date, 2026-03-26, well past 36h grace as
  // of any date after that) must still show the generic label — a stale
  // date is decoration-only and must never suppress the boolean.
  it('shows generic Backorder text when the boolean is true and the ETA is stale, even though the variant is available', () => {
    render(
      <ProductView
        product={{
          ...product,
          backorder: { value: 'true' },
          estimatedRestockDate: '2026-03-26',
        }}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getByText('Backorder')).toBeInTheDocument()
    expect(screen.queryByText(/Backorder, ships/)).not.toBeInTheDocument()
  })

  // DEV-SHIP-04 (final business rule): a future, valid ETA must NOT be
  // appended to the text either — the boolean alone controls the label, and
  // the label is always exactly "Backorder". Supersedes the old
  // "appends the ship date" behavior.
  it('shows exactly "Backorder" with no date, even with a valid future ETA', () => {
    render(
      <ProductView
        product={{
          ...product,
          backorder: { value: 'true' },
          estimatedRestockDate: '2099-01-01',
        }}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getByText('Backorder')).toBeInTheDocument()
    expect(screen.queryByText(/2099-01-01/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Backorder, ships/)).not.toBeInTheDocument()
  })

  // Backorder is the merchant's own declaration, independent of real-time
  // availability — an available variant must not suppress it (already
  // covered above) and an unavailable one must not either. DEV-SHIP-04:
  // ProductLabelBadges is the SINGLE customer-facing Backorder rendering
  // path — the availability row must never also render "Backorder", or the
  // product shows the label twice.
  it('shows exactly ONE Backorder label when the selected variant is not available for sale', () => {
    render(
      <ProductView
        product={{
          ...product,
          backorder: { value: 'true' },
          variants: {
            nodes: [{ ...product.variants.nodes[0], availableForSale: false }],
          },
        }}
        initialVariant={{ ...product.variants.nodes[0], availableForSale: false }}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getAllByText('Backorder')).toHaveLength(1)
    // The availability status row (the dot + text pair) must not render at
    // all when backordered — Backorder alone, from ProductLabelBadges. Note:
    // the disabled Add to Cart button separately renders its own "Out of
    // Stock" purchasability label (AddToCartButton/resolvePurchasable) — that
    // is unrelated, unchanged, pre-existing behavior this task does not
    // touch, so it is scoped out here via the status row's own testid rather
    // than asserted absent page-wide.
    expect(screen.queryByTestId('availability-status')).not.toBeInTheDocument()
  })

  // If the boolean is false/missing, unavailable behavior is unchanged:
  // normal "Out of Stock" still renders in the status row, never Backorder.
  it('unavailable without custom.backorder=true still shows Out of Stock, never Backorder', () => {
    render(
      <ProductView
        product={{
          ...product,
          variants: {
            nodes: [{ ...product.variants.nodes[0], availableForSale: false }],
          },
        }}
        initialVariant={{ ...product.variants.nodes[0], availableForSale: false }}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(within(screen.getByTestId('availability-status')).getByText('Out of Stock')).toBeInTheDocument()
    expect(screen.queryByText('Backorder')).not.toBeInTheDocument()
  })
})

// DEV-SHIP-02: recommendation cards ("You May Also Like" / "Frequently
// Bought With") previously carried no shippingDisplay at all — RelatedProductCard
// rendered no badges — so a genuinely free-shipping-eligible related product
// never showed the claim. app/product/[slug]/page.tsx now runs relatedProducts/
// complementaryProducts through attachCardShippingDisplay before they reach
// this component, same as every other card grid.
describe('ProductView — recommendation cards Free Shipping badge (DEV-SHIP-02)', () => {
  function relatedProduct(shippingDisplay: CollectionProduct['shippingDisplay']): CollectionProduct {
    return {
      id: 'gid://shopify/Product/999',
      title: 'Related Product',
      handle: 'related-product',
      vendor: 'AcmeMed',
      availableForSale: true,
      tags: [],
      priceRange: { minVariantPrice: { amount: '9.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '9.99', currencyCode: 'USD' } },
      images: { nodes: [] },
      variants: { nodes: [] },
      shippingDisplay,
    }
  }

  it('shows a Free Shipping badge on a related product whose attached shippingDisplay is standard-free', () => {
    render(
      <ProductView
        product={product}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[relatedProduct({ class: 'standard-free', message: 'Free shipping', displayCopy: null })]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getByText('Free Shipping')).toBeInTheDocument()
  })

  it('shows a Free Shipping badge on a complementary product whose attached shippingDisplay is standard-free', () => {
    render(
      <ProductView
        product={product}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[]}
        complementaryProducts={[relatedProduct({ class: 'standard-free', message: 'Free shipping', displayCopy: null })]}
      />,
    )
    expect(screen.getByText('Free Shipping')).toBeInTheDocument()
  })

  it('shows no Free Shipping badge when the resolver/metafield gate did not confirm it (unknown class)', () => {
    render(
      <ProductView
        product={product}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[relatedProduct({ class: 'unknown', message: 'Shipping calculated at checkout.', displayCopy: null })]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.queryByText('Free Shipping')).not.toBeInTheDocument()
  })

  it('shows no Free Shipping badge when shippingDisplay was never attached', () => {
    render(
      <ProductView
        product={product}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[relatedProduct(undefined)]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.queryByText('Free Shipping')).not.toBeInTheDocument()
  })
})

// DEV-SHIP-04: recommendation cards previously hardcoded labels={[]} — RX and
// Backorder never rendered here at all, even though GET_PRODUCT_RECS already
// selects both metafields via the shared PRODUCT_CARD_FRAGMENT.
describe('ProductView — recommendation cards Backorder label (DEV-SHIP-04)', () => {
  function relatedProductWithBackorder(backorder: { value: string } | null): CollectionProduct {
    return {
      id: 'gid://shopify/Product/999',
      title: 'Related Product',
      handle: 'related-product',
      vendor: 'AcmeMed',
      availableForSale: true,
      tags: [],
      priceRange: { minVariantPrice: { amount: '9.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '9.99', currencyCode: 'USD' } },
      images: { nodes: [] },
      variants: { nodes: [] },
      backorder,
    }
  }

  it('shows exactly "Backorder" on a related product with custom.backorder=true', () => {
    render(
      <ProductView
        product={product}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[relatedProductWithBackorder({ value: 'true' })]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getByText('Backorder')).toBeInTheDocument()
    expect(screen.queryByText(/Backorder, ships/)).not.toBeInTheDocument()
  })

  it('shows exactly "Backorder" on a complementary product with custom.backorder=true', () => {
    render(
      <ProductView
        product={product}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[]}
        complementaryProducts={[relatedProductWithBackorder({ value: 'true' })]}
      />,
    )
    expect(screen.getByText('Backorder')).toBeInTheDocument()
  })

  it('shows no Backorder badge when custom.backorder is false/missing', () => {
    render(
      <ProductView
        product={product}
        initialVariant={product.variants.nodes[0]}
        relatedProducts={[relatedProductWithBackorder(null)]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.queryByText('Backorder')).not.toBeInTheDocument()
  })
})

// LG-03: selecting a different variant must update SKU, image, H1 and the
// selector's pressed state together — not just price/SKU as before.
describe('ProductView — selected-variant identity sync (LG-03)', () => {
  const blueVariant = {
    id: 'gid://shopify/ProductVariant/1',
    title: 'Blue',
    sku: 'SKU-BLUE',
    availableForSale: true,
    quantityAvailable: 10,
    selectedOptions: [{ name: 'Color', value: 'Blue' }],
    price: { amount: '9.99', currencyCode: 'USD' },
    compareAtPrice: null,
    image: { id: 'img-blue', url: '/blue.jpg', altText: 'Blue glove', width: 800, height: 800 },
  }
  const redVariant = {
    ...blueVariant,
    id: 'gid://shopify/ProductVariant/2',
    title: 'Red',
    sku: 'SKU-RED',
    selectedOptions: [{ name: 'Color', value: 'Red' }],
    image: { id: 'img-red', url: '/red.jpg', altText: 'Red glove', width: 800, height: 800 },
  }
  const multiColorProduct: Product = {
    ...product,
    title: 'Flame Glove',
    options: [{ id: 'opt1', name: 'Color', values: ['Blue', 'Red'] }],
    variants: { nodes: [blueVariant, redVariant] },
  }

  it('renders the deep-linked variant (Red) on initial load, not the first/default variant', () => {
    render(
      <ProductView
        product={multiColorProduct}
        initialVariant={redVariant}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Flame Glove — Red' })).toBeInTheDocument()
    expect(screen.getByText('SKU: SKU-RED')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Red glove' }).length).toBeGreaterThan(0)
  })

  it('selecting Red updates the H1, SKU, main image, selector aria-pressed state, and the URL — without leaving a stale identity', () => {
    render(
      <ProductView
        product={multiColorProduct}
        initialVariant={blueVariant}
        relatedProducts={[]}
        complementaryProducts={[]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Flame Glove — Blue' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Color: Red' }))

    expect(screen.getByRole('heading', { name: 'Flame Glove — Red' })).toBeInTheDocument()
    expect(screen.getByText('SKU: SKU-RED')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Red glove' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Color: Red' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Color: Blue' })).toHaveAttribute('aria-pressed', 'false')
    expect(replace).toHaveBeenCalledWith(
      '/product/flame-blue-glove?variant=gid%3A%2F%2Fshopify%2FProductVariant%2F2',
      { scroll: false },
    )
  })

  it('does not append a color suffix for a single-color product', () => {
    render(<ProductView product={product} initialVariant={product.variants.nodes[0]} relatedProducts={[]} complementaryProducts={[]} />)
    expect(screen.getByRole('heading', { name: 'Nitrile Exam Gloves' })).toBeInTheDocument()
  })
})
