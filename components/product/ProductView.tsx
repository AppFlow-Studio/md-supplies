'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, Truck, RotateCcw, Plus, Minus,
} from 'lucide-react'
import type { Product, CollectionProduct, ProductVariant } from '@/lib/shopify/types'
import { ProductImage } from '@/components/shared/ProductImage'
import { track } from '@/lib/analytics/track'
import { buildViewItemEvent } from '@/lib/analytics/events'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { VariantSelector } from './VariantSelector'
import { AddToCartButton } from './AddToCartButton'
import { cleanShopifyAlt } from '@/lib/alt-text'
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'
import { SHIPPING_FALLBACK_MESSAGE } from '@/lib/shipping-resolver/copy'
import { ShippingBadge } from './ShippingBadge'
import { ShippingBlock } from './ShippingBlock'
import { ReturnPolicyContent } from '@/components/policy/ReturnPolicyContent'
import { resolveReturnPolicy } from '@/lib/policy/return-policy'
import { resolveBackorderLabel, resolveRxLabel } from '@/lib/labels/labels'
import { publicBrand } from '@/lib/brand'
import { hasUsablePrice, getDefaultVariant } from '@/lib/purchasability'

type Tab = 'SPECIFICATIONS' | 'ORDER PACKAGING' | 'RETURNS' | 'REVIEWS'
const TABS: Tab[] = ['SPECIFICATIONS', 'ORDER PACKAGING', 'RETURNS', 'REVIEWS']

function RelatedProductCard({ product }: { product: CollectionProduct }) {
  const price = parseFloat(
    product.variants.nodes[0]?.price.amount ?? product.priceRange.minVariantPrice.amount,
  )
  const image = product.images.nodes[0]

  return (
    <Link href={`/product/${product.handle}`} className="group flex flex-col bg-neutral-50 flex-1 min-w-[160px]">
      <div className="relative overflow-hidden bg-neutral-50 aspect-square">
        <ProductImage src={image?.url} alt={cleanShopifyAlt(image?.altText) ?? product.title} />
      </div>
      <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
        {/* Public brand only — omitted when none is approved (lib/brand.ts). */}
        {publicBrand(product) && (
          <span className="text-teal-500 text-[12px] font-semibold uppercase tracking-[0.24px]">
            {publicBrand(product)}
          </span>
        )}
        <p className="text-black text-[13px] font-semibold leading-5 line-clamp-2">{product.title}</p>
        <span className="text-black text-[16px] font-bold">
          {hasUsablePrice(price) ? `$${price.toFixed(2)}` : 'Contact for pricing'}
        </span>
      </div>
    </Link>
  )
}

interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  product: Product
  relatedProducts: CollectionProduct[]
  complementaryProducts: CollectionProduct[]
  breadcrumbs?: BreadcrumbItem[]
  partnerSlug?: string | null
  variantShippingDisplays?: Record<string, ShippingDisplay>
}

export function ProductView({ product, relatedProducts, complementaryProducts, breadcrumbs, partnerSlug, variantShippingDisplays = {} }: Props) {
  // Public brand only. Shopify `vendor` is the FULFILLING vendor (MedPlus,
  // Medchain, …) and must never be presented as a brand — when brand_name is
  // absent the brand line, spec row, and analytics item_brand are all omitted.
  // Declared before the analytics effect that reads it.
  const brandDisplay = publicBrand(product)

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    () => getDefaultVariant(product.variants.nodes),
  )
  const shippingDisplay = variantShippingDisplays[selectedVariant.id] ?? null
  const [orderQty, setOrderQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('SPECIFICATIONS')

  useEffect(() => {
    track(
      {
        ...buildViewItemEvent({
          currency: selectedVariant.price.currencyCode,
          item: {
            item_id: selectedVariant.id,
            item_name: product.title,
            price: parseFloat(selectedVariant.price.amount),
            // Public brand only; never the fulfilling vendor (lib/brand.ts).
            ...(brandDisplay ? { item_brand: brandDisplay } : {}),
          },
        }),
      },
    )
    // Fire once per product page visit, not on every variant switch — App Router
    // reuses this client component instance across product-to-product navigation,
    // so `product.id` (not `[]`) is the dependency that makes this refire correctly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const price = parseFloat(selectedVariant.price.amount)
  const compareAt = selectedVariant.compareAtPrice
    ? parseFloat(selectedVariant.compareAtPrice.amount)
    : null
  const images = product.images.nodes
  const savePct =
    compareAt && compareAt > price
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : null

  // DEV-LABEL-01 / DEV-CATALOG-01: backorder + RX come from the shared label
  // contract (single metafield source, stale ETAs suppressed) so card and PDP
  // can never disagree. availableForSale only gates purchasability — it is
  // never presented as a real-time "In Stock" inventory claim.
  const backorderLabel = resolveBackorderLabel({
    estimatedRestockDate: product.estimatedRestockDate,
    availableForSale: selectedVariant.availableForSale,
  })
  // Same UNION the checkout gate uses (tag OR custom.is_rx_only), so the PDP
  // badge can never disagree with whether the cart will actually be gated.
  const rxLabel = resolveRxLabel(product.tags, product.isRxOnly)

  const stockStatus: 'available' | 'out_of_stock' | 'backordered' = (() => {
    if (!selectedVariant.availableForSale) return backorderLabel ? 'backordered' : 'out_of_stock'
    return 'available'
  })()

  const variantSku = selectedVariant.sku || (selectedVariant.id.split('/').pop() ?? '')

  const SPEC_ROWS: { label: string; value: string | null }[] = [
    { label: 'Material',         value: product.material },
    { label: 'Color',            value: product.color },
    { label: 'Sterility',        value: product.sterility },
    { label: 'Thickness',        value: product.thickness },
    { label: 'Glove Size',       value: product.gloveSize },
    { label: 'Needle Gauge',     value: product.needleGauge },
    { label: 'Needle Length',    value: product.needleLength },
    { label: 'Size / Length',    value: product.sizeLength },
    { label: 'Use',              value: product.use },
    { label: 'Features',         value: product.features },
    { label: 'Other Features',   value: product.otherFeatures },
    { label: 'Type',             value: product.typeList },
    { label: 'Tests For',        value: product.testsFor },
    { label: 'Detectable Drugs', value: product.detectableDrugs },
    { label: 'Adulterants',      value: product.adulterants },
  ].filter((r) => r.value != null)

  const hasPackaging = product.unitsPerOrder || product.orderSize || product.quantityOfUnits
  const hasOptions = product.options.length > 0 &&
    !(product.options.length === 1 && product.options[0].values.length === 1)

  return (
    <>
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <Breadcrumb
          items={[
            ...(breadcrumbs ?? []),
            { label: product.title },
          ]}
        />
      </div>

      {/* Hero */}
      <section className="bg-white pt-10 sm:pt-14">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-14 flex flex-col lg:flex-row gap-10 xl:gap-14">

          {/* Left – Image gallery */}
          <div className="lg:w-[52%] shrink-0 flex flex-col gap-4">
            <div className="relative bg-[#f9faf9] aspect-square overflow-hidden">
              <ProductImage
                key={images[activeImg]?.id ?? activeImg}
                src={images[activeImg]?.url}
                alt={cleanShopifyAlt(images[activeImg]?.altText) ?? product.title}
                sizes="(max-width: 1024px) 100vw, 52vw"
                priority
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`relative size-[80px] sm:size-[100px] lg:size-[120px] shrink-0 overflow-hidden bg-[#f9faf9] transition-colors ${
                      activeImg === i
                        ? 'border-[3px] border-navy-900'
                        : 'border border-gray-200 hover:border-navy-900'
                    }`}
                  >
                    <ProductImage src={img.url} alt={cleanShopifyAlt(img.altText) ?? product.title} sizes="120px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right – Product info */}
          <div className="flex-1 flex flex-col gap-5">
            {/* Brand */}
            {/* Brand line renders only for an approved public brand. The
                partner link is also brand-gated: linking a partner page from
                a fulfilling-vendor string would leak the same information. */}
            {brandDisplay && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                {partnerSlug ? (
                  <Link
                    href={`/partners/${partnerSlug}`}
                    className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase hover:text-ink-link transition-colors"
                  >
                    {brandDisplay}
                  </Link>
                ) : (
                  <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase">
                    {brandDisplay}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <h1 className="text-black text-[24px] sm:text-[30px] font-semibold leading-[1.25] tracking-[0.6px]">
              {product.title}
            </h1>

            {/* SKU */}
            <p className="text-gray-500 text-[13px] tracking-[0.26px]">
              SKU: {variantSku}
            </p>

            {/* Availability — negative states only. No "In stock" claim:
                vendor inventory is not real time (DEV-CATALOG-01), so an
                available product simply shows no availability text and the
                add-to-cart control does the talking. */}
            {stockStatus !== 'available' && (
              <div className="flex items-center gap-2">
                {stockStatus === 'backordered' && backorderLabel && (
                  <>
                    <span className="size-[8px] rounded-full shrink-0 bg-orange-400" />
                    {/* orange-600 measured 3.56:1 on white — below the 4.5:1 AA minimum,
                        flagged [serious] by axe. orange-700 measures ~5.18:1. */}
                    <span className="text-orange-700 text-[13px] font-semibold tracking-[0.26px]">
                      {backorderLabel.text}
                    </span>
                  </>
                )}
                {stockStatus === 'out_of_stock' && (
                  <>
                    <span className="size-[8px] rounded-full shrink-0 bg-red-400" />
                    {/* Semantic status token (--color-ink-danger, 6.42:1).
                        red-500 was 3.81:1 at 13px — below the 4.5:1 AA
                        minimum and flagged serious by axe. */}
                    <span className="text-ink-danger text-[13px] font-semibold tracking-[0.26px]">
                      Out of Stock
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Product badges. A shipping claim may come only from the resolver,
                never from a tag: `free-shipping` is an uncurated catalog tag and
                is not an approved source for a customer-facing promise. The RX
                badge is a display-only label from the shared contract
                (lib/labels) — it never enforces checkout behavior. */}
            {(shippingDisplay || rxLabel) && (
              <div className="flex flex-wrap gap-2">
                {shippingDisplay && (
                  <ShippingBadge shippingDisplay={shippingDisplay} className="px-3 py-1 text-[13px]" />
                )}
                {rxLabel && (
                  <span
                    aria-label={rxLabel.accessibleText}
                    // DEV-LAUNCH-13: bg-amber-600 + white measured ~3.18:1, below
                    // WCAG AA's 4.5:1 for 13px text — same fix as ProductBadges.tsx.
                    className="inline-flex items-center px-3 py-1 text-[13px] font-medium rounded bg-amber-700 text-white"
                  >
                    {rxLabel.text}
                  </span>
                )}
              </div>
            )}

            {/* Always rendered, never blank. Anything the resolver did not
                classify for the selected variant, including every product when
                the resolver is disabled, falls back to the neutral copy. */}
            <p data-testid="shipping-message" className="text-gray-600 text-[13px] tracking-[0.26px]">
              {shippingDisplay?.message ?? SHIPPING_FALLBACK_MESSAGE}
            </p>

            <div className="h-px bg-gray-200" />

            {/* Variant selector */}
            {hasOptions && (
              <VariantSelector
                options={product.options}
                variants={product.variants.nodes}
                selectedVariant={selectedVariant}
                onSelect={setSelectedVariant}
              />
            )}

            {/* Price. A zero/missing price is a quote-only item, not a $0
                product and not an out-of-stock or no-rate signal (Phase 11). */}
            <div className="flex items-baseline gap-3 flex-wrap">
              {hasUsablePrice(price) ? (
                <span className="text-black text-[35px] font-extrabold leading-none tracking-[0.7px]">
                  ${price.toFixed(2)}
                </span>
              ) : (
                <span className="text-navy-900 text-[24px] font-semibold leading-none tracking-[0.4px]">
                  Contact for pricing
                </span>
              )}
              {hasUsablePrice(price) && compareAt && compareAt > price && (
                <span className="text-gray-500 text-[15px] line-through tracking-[0.3px]">
                  ${compareAt.toFixed(2)}
                </span>
              )}
              {savePct && (
                <span className="text-[#006e46] text-[13px] font-semibold tracking-[0.26px]">
                  Save {savePct}%
                </span>
              )}
            </div>

            {/* UNIT / QUANTITY table */}
            {hasPackaging && (
              <div className="border border-[rgba(102,102,100,0.5)]">
                <div className="bg-navy-900 flex">
                  <div className="flex-1 px-4 py-3">
                    <p className="text-white text-[15px] font-bold tracking-[0.3px]">UNIT</p>
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <p className="text-white text-[15px] font-bold tracking-[0.3px]">QUANTITY</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex-1 px-4 py-3">
                    {product.orderSize && (
                      <p className="text-gray-500 text-[15px] font-medium tracking-[0.3px]">
                        {product.orderSize}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 px-4 py-3">
                    {(product.unitsPerOrder || product.quantityOfUnits) && (
                      <p className="text-gray-500 text-[15px] font-medium tracking-[0.3px]">
                        {product.unitsPerOrder ?? product.quantityOfUnits}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Qty + Add to cart */}
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex border border-[rgba(102,102,100,0.5)] h-[56px] w-[167px] shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                  className="flex-1 flex items-center justify-center text-gray-500 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <div className="flex items-center justify-center w-[55px] border-x border-[rgba(102,102,100,0.5)] text-navy-900 text-[18px] font-bold">
                  {orderQty}
                </div>
                <button
                  type="button"
                  onClick={() => setOrderQty((q) => q + 1)}
                  className="flex-1 flex items-center justify-center text-gray-500 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              <AddToCartButton
                variantId={selectedVariant.id}
                quantity={orderQty}
                availableForSale={selectedVariant.availableForSale}
                price={price}
              />
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-5 pt-1">
              {[
                { icon: <ShieldCheck size={15} className="text-gray-500" />, label: 'QUALITY CERTIFIED' },
                { icon: <Truck size={15} className="text-gray-500" />, label: 'FAST SHIPPING' },
                { icon: <RotateCcw size={15} className="text-gray-500" />, label: 'RELIABLE FULFILLMENT' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  {icon}
                  <span className="text-gray-500 text-[13px] tracking-[0.26px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {shippingDisplay && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <ShippingBlock shippingDisplay={shippingDisplay} />
        </div>
      )}

      {/* Tabs */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto scrollbar-hide" role="tablist" aria-label="Product information">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`product-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-selected={activeTab === tab}
                  aria-controls="product-tab-panel"
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-5 text-[15px] font-semibold tracking-[0.3px] whitespace-nowrap border-b-[3px] transition-colors ${
                    activeTab === tab
                      ? 'text-teal-500 border-teal-500'
                      : 'text-navy-900 border-transparent hover:text-teal-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div
            className="py-10 sm:py-14"
            id="product-tab-panel"
            role="tabpanel"
            aria-labelledby={`product-tab-${activeTab.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {activeTab === 'SPECIFICATIONS' && (
              <div className="flex flex-col gap-8 max-w-[760px]">
                {/* Item Number */}
                <div>
                  <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Item Number</h2>
                  <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">{variantSku}</p>
                </div>

                {/* Brand Name */}
                {brandDisplay && (
                  <div>
                    <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Brand Name</h2>
                    <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">{brandDisplay}</p>
                  </div>
                )}

                {/* Description */}
                {(product.descriptionHtml || product.description) && (
                  <div>
                    <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Description</h2>
                    <div
                      className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px] prose max-w-none prose-p:mb-4 prose-ul:pl-5 prose-li:mb-1"
                      dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }}
                    />
                  </div>
                )}

                {/* Specs table */}
                {SPEC_ROWS.length > 0 && (
                  <div>
                    <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-4">Specifications</h2>
                    <table className="w-full max-w-[600px]">
                      <tbody>
                        {SPEC_ROWS.map(({ label, value }, i) => (
                          <tr key={label} className={i % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}>
                            <th scope="row" className="py-3 px-4 text-[14px] font-semibold text-navy-900 w-[200px]">{label}</th>
                            <td className="py-3 px-4 text-[14px] text-gray-500">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Badges */}
                {(product.customBadge1 || product.customBadge2 || product.customBadge3) && (
                  <div className="flex flex-wrap gap-2">
                    {[product.customBadge1, product.customBadge2, product.customBadge3]
                      .filter(Boolean)
                      .map((badge) => (
                        <span
                          key={badge}
                          className="bg-teal-50 text-ink-link text-[12px] font-semibold px-3 py-1 border border-teal-200"
                        >
                          {badge}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ORDER PACKAGING' && (
              <div className="flex flex-col gap-6 max-w-[760px]">
                {hasPackaging ? (
                  <table className="w-full max-w-[500px]">
                    <tbody>
                      {[
                        { label: 'Order Size', value: product.orderSize },
                        { label: 'Units Per Order', value: product.unitsPerOrder },
                        { label: 'Quantity of Units', value: product.quantityOfUnits },
                      ]
                        .filter((r) => r.value != null)
                        .map(({ label, value }, i) => (
                          <tr key={label} className={i % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}>
                            <td className="py-3 px-4 text-[14px] font-semibold text-navy-900 w-[200px]">{label}</td>
                            <td className="py-3 px-4 text-[14px] text-gray-500">{value}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">
                    Packaging information not available for this product.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'RETURNS' && (
              // DEV-POLICY-01: always the approved policy from the central
              // module — vendor-specific copy renders here once IZ-PROD-04
              // populates the approved production source; until then every
              // product shows the approved general fallback (never empty,
              // never invented).
              <ReturnPolicyContent
                sections={resolveReturnPolicy({ vendor: product.vendor }).sections}
                headingLevel="h3"
              />
            )}

            {activeTab === 'REVIEWS' && (
              <div className="flex flex-col gap-6 max-w-[760px]">
                <p className="text-gray-500 text-[15px] leading-[28px]">
                  Reviews are not yet available for this product.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Bought With — complementary (manually curated in S&D) */}
      {complementaryProducts.length > 0 && (
        <section className="bg-[#f9faf9] border-t border-gray-200">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
            <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] mb-8">
              Frequently Bought With
            </h2>
            <div className="flex flex-col sm:flex-row gap-[23px]">
              {complementaryProducts.slice(0, 4).map((p) => (
                <RelatedProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* You May Also Like — Shopify auto-generated related */}
      {relatedProducts.length > 0 && (
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
            <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] mb-8">
              You May Also Like
            </h2>
            <div className="flex flex-col sm:flex-row gap-[23px]">
              {relatedProducts.slice(0, 4).map((p) => (
                <RelatedProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* More products — overflow scroll row */}
      {relatedProducts.length > 4 && (
        <section className="bg-[#f9faf9] border-t border-gray-200">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
            <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] mb-8">
              You May Also Need
            </h2>
            <div
              className="flex gap-0 overflow-x-auto scrollbar-hide items-stretch"
              tabIndex={0}
              role="region"
              aria-label="You May Also Need — scrollable product list"
            >
              {relatedProducts.slice(4).map((item) => (
                <div key={item.id} className="flex flex-col bg-neutral-50 w-[185px] sm:w-[201px] shrink-0">
                  <div className="relative bg-neutral-50 h-[160px] sm:h-[185px] overflow-hidden flex items-center justify-center">
                    <ProductImage src={item.images.nodes[0]?.url} alt={cleanShopifyAlt(item.images.nodes[0]?.altText) ?? item.title} sizes="201px" />
                  </div>
                  <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
                    <p className="text-black text-[14px] font-semibold leading-5 line-clamp-2">
                      {item.title}
                    </p>
                    <span className="text-black text-[18px] font-bold">
                      ${parseFloat(item.priceRange.minVariantPrice.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
