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
import { ShippingBlock } from './ShippingBlock'
import { ProductLabelBadges } from './ProductLabelBadges'
import { ReturnPolicyContent } from '@/components/policy/ReturnPolicyContent'
import { resolveReturnPolicy } from '@/lib/policy/return-policy'
import { resolveProductLabels } from '@/lib/labels/labels'
import { publicBrand } from '@/lib/brand'
import { hasUsablePrice } from '@/lib/purchasability'
import { useSelectedVariant } from './useSelectedVariant'
import { resolveVariantValue, resolveVariantSupplement } from '@/lib/product/resolve-variant-value'
import { shopifyRichTextToPlainParagraphs } from '@/lib/policy/rich-text'

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
        {/* DEV-SHIP-04: recommendation cards previously hardcoded labels={[]}
            (RX/Backorder never shown here, even though GET_PRODUCT_RECS
            already selects both via the shared PRODUCT_CARD_FRAGMENT) — only
            the Free Shipping claim was wired up. Same resolveProductLabels
            contract every other card grid uses, so recs can't disagree with
            the PDP/category card for the same product. shippingDisplay is
            the same resolver-and-metafield-gated claim the grid cards show —
            never a locally-inferred one. */}
        <ProductLabelBadges
          labels={resolveProductLabels({
            tags: product.tags,
            isBackordered: product.backorder,
            isRxOnly: product.isRxOnly,
          })}
          shippingDisplay={product.shippingDisplay ?? null}
        />
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
  /** Server-resolved from `?variant=` (or the default) — see
      lib/product/resolve-variant.ts — so the initial render, ProductSchema
      and this component's client state can never disagree (LG-03). */
  initialVariant: ProductVariant
  relatedProducts: CollectionProduct[]
  complementaryProducts: CollectionProduct[]
  breadcrumbs?: BreadcrumbItem[]
  partnerSlug?: string | null
  variantShippingDisplays?: Record<string, ShippingDisplay>
}

export function ProductView({ product, initialVariant, relatedProducts, complementaryProducts, breadcrumbs, partnerSlug, variantShippingDisplays = {} }: Props) {
  // Public brand only. Shopify `vendor` is the FULFILLING vendor (MedPlus,
  // Medchain, …) and must never be presented as a brand — when brand_name is
  // absent the brand line, spec row, and analytics item_brand are all omitted.
  // Declared before the analytics effect that reads it.
  const brandDisplay = publicBrand(product)

  const { selectedVariant, select: selectVariant, galleryImages, activeImg, setActiveImg } =
    useSelectedVariant(product, initialVariant)
  const shippingDisplay = variantShippingDisplays[selectedVariant.id] ?? null
  const [orderQty, setOrderQty] = useState(1)
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
  const images = galleryImages
  const savePct =
    compareAt && compareAt > price
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : null

  // DEV-LABEL-01 / DEV-CATALOG-01: backorder + RX come from the shared label
  // contract (single metafield source, stale ETAs suppressed) so card and PDP
  // can never disagree. availableForSale only gates purchasability — it is
  // never presented as a real-time "In Stock" inventory claim. Backorder is
  // gated on the custom.backorder boolean alone, independent of availability.
  const labels = resolveProductLabels({
    tags: product.tags,
    isBackordered: product.backorder,
    estimatedRestockDate: product.estimatedRestockDate,
    // Same UNION the checkout gate uses (tag OR custom.is_rx_only), so the
    // PDP badge can never disagree with whether the cart will actually be gated.
    isRxOnly: product.isRxOnly,
  })
  const backorderLabel = labels.find((l) => l.type === 'backorder') ?? null

  const stockStatus: 'available' | 'out_of_stock' | 'backordered' = (() => {
    if (!selectedVariant.availableForSale) return backorderLabel ? 'backordered' : 'out_of_stock'
    return 'available'
  })()

  const variantSku = selectedVariant.sku || (selectedVariant.id.split('/').pop() ?? '')

  // LG-03: a color-neutral parent title must still show which color is
  // selected, so the H1/breadcrumb can't contradict the SKU/image the
  // shopper just picked. Only a genuine multi-value color dimension carries
  // this identity risk — a single-color product or an Each/Case selection
  // doesn't rename the product, so those get no suffix.
  const isMultiColor = product.options.some(
    (o) => o.name.toLowerCase() === 'color' && o.values.length > 1,
  )
  const selectedColor = isMultiColor
    ? selectedVariant.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
    : undefined
  const displayTitle = selectedColor ? `${product.title} — ${selectedColor}` : product.title

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

  const hasOptions = product.options.length > 0 &&
    !(product.options.length === 1 && product.options[0].values.length === 1)

  // AeroWalk pilot: variant-specific order unit overrides the shared product
  // value; falls back to it only when the variant's own field is blank
  // (resolveVariantValue — Bilal's rule 2). Used identically by the
  // above-the-fold block and the ORDER PACKAGING tab, so they can never show
  // two different totals for the same selection (LG-04 acceptance).
  const resolvedOrderSize = resolveVariantValue(selectedVariant.orderSize, product.orderSize)
  const resolvedUnitsPerOrder = resolveVariantValue(
    selectedVariant.unitsPerOrder,
    product.unitsPerOrder ?? product.quantityOfUnits,
  )
  const resolvedHasPackaging = Boolean(resolvedOrderSize || resolvedUnitsPerOrder)

  // Variant Description supplements the product Description tab — never
  // shown if blank, never shown if it would just repeat the product
  // description verbatim (resolveVariantSupplement — Bilal's rule 3).
  const variantDescriptionSupplement = resolveVariantSupplement(
    selectedVariant.description,
    product.description,
  )

  // H-01 — Vendor Shipping & Returns: custom.shipping_returns (rich text),
  // confirmed by Izzy's 2026-08-14 field contract as the live theme's actual
  // source. Flattened to plain paragraphs and handed to resolveReturnPolicy's
  // vendorPolicyText below — the approved general fallback still renders
  // when a product has no value (not every product carries this field).
  const vendorPolicyText = shopifyRichTextToPlainParagraphs(product.shippingReturns).join('\n\n') || null

  return (
    <>
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <Breadcrumb
          items={[
            ...(breadcrumbs ?? []),
            { label: displayTitle },
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
                alt={cleanShopifyAlt(images[activeImg]?.altText) ?? displayTitle}
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
              {displayTitle}
            </h1>

            {/* SKU + Manufacturer Item Number — kept as two separately-
                labeled values (never conflated): the plan's Figure 3
                requirement, previously violated by the Specifications tab
                (see below), now consistent site-wide. */}
            <div className="flex flex-col gap-0.5">
              <p className="text-gray-500 text-[13px] tracking-[0.26px]">
                SKU: {variantSku}
              </p>
              {selectedVariant.manufacturerNumber && (
                <p className="text-gray-500 text-[13px] tracking-[0.26px]">
                  Mfr #: {selectedVariant.manufacturerNumber}
                </p>
              )}
            </div>

            {/* Availability — negative states only. No "In stock" claim:
                vendor inventory is not real time (DEV-CATALOG-01), so an
                available product simply shows no availability text and the
                add-to-cart control does the talking.
                DEV-SHIP-04: this row is Out-of-Stock ONLY. ProductLabelBadges
                below is the single customer-facing Backorder rendering path —
                this row must never also render "Backorder", or the product
                shows the label twice. An unavailable, backordered variant
                therefore shows no text here at all (Backorder alone, from
                ProductLabelBadges) rather than a conflicting "Out of Stock". */}
            {stockStatus === 'out_of_stock' && (
              <div className="flex items-center gap-2" data-testid="availability-status">
                <span className="size-[8px] rounded-full shrink-0 bg-red-400" />
                {/* Semantic status token (--color-ink-danger, 6.42:1).
                    red-500 was 3.81:1 at 13px — below the 4.5:1 AA
                    minimum and flagged serious by axe. */}
                <span className="text-ink-danger text-[13px] font-semibold tracking-[0.26px]">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Product badges. A shipping claim may come only from the resolver,
                never from a tag: `free-shipping` is an uncurated catalog tag and
                is not an approved source for a customer-facing promise. RX and
                Backorder are display-only labels from the shared contract
                (lib/labels) — RX never enforces checkout behavior itself.
                Order (RX -> Backorder -> Free Shipping) is guaranteed by
                ProductLabelBadges. */}
            <ProductLabelBadges labels={labels} shippingDisplay={shippingDisplay} size="md" />

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
                onSelect={selectVariant}
              />
            )}

            {/* UNIT / QUANTITY — variant-sourced, positioned directly below
                the selector and above Add to Cart per Bilal (2026-08-14):
                "Populate variant-specific order units/packaging and display
                them clearly above Add to Cart." Reads the same resolved
                values as the ORDER PACKAGING tab — never a second
                computation (LG-04). */}
            {resolvedHasPackaging && (
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
                    {resolvedOrderSize && (
                      <p className="text-gray-500 text-[15px] font-medium tracking-[0.3px]">
                        {resolvedOrderSize}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 px-4 py-3">
                    {resolvedUnitsPerOrder && (
                      <p className="text-gray-500 text-[15px] font-medium tracking-[0.3px]">
                        {resolvedUnitsPerOrder}
                      </p>
                    )}
                  </div>
                </div>
              </div>
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
                {/* Manufacturer Item Number and Internal SKU — kept as two
                    separate, separately-labeled rows. Previously this tab
                    showed one heading, "Item Number", over `variantSku` (the
                    INTERNAL sku) — silently conflating the two identifiers
                    the launch plan's non-negotiable rule requires kept
                    apart (Figure 3). */}
                {selectedVariant.manufacturerNumber && (
                  <div>
                    <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Manufacturer Item Number</h2>
                    <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">{selectedVariant.manufacturerNumber}</p>
                  </div>
                )}
                <div>
                  <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Internal SKU</h2>
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

                {/* Variant Details — supplements the description above only
                    when the archived source had genuinely variant-specific
                    content; never a duplicate of it (resolveVariantSupplement). */}
                {variantDescriptionSupplement && (
                  <div>
                    <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Variant Details</h2>
                    <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">{variantDescriptionSupplement}</p>
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
                {resolvedHasPackaging ? (
                  <table className="w-full max-w-[500px]">
                    <tbody>
                      {[
                        { label: 'Order Size', value: resolvedOrderSize },
                        { label: 'Units Per Order', value: resolvedUnitsPerOrder },
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
              // DEV-POLICY-01 / H-01: always the approved policy from the
              // central module. custom.shipping_returns (vendorPolicyText,
              // resolved above) supplies vendor-specific copy when a product
              // has it; every other product still shows the approved general
              // fallback (never empty, never invented).
              <ReturnPolicyContent
                sections={resolveReturnPolicy({ vendor: product.vendor, vendorPolicyText }).sections}
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
