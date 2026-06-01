'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Star, ShieldCheck, Truck, RotateCcw, Plus, Minus,
} from 'lucide-react'
import type { Product, CollectionProduct, ProductVariant } from '@/lib/shopify/types'
import { VariantSelector } from './VariantSelector'
import { AddToCartButton } from './AddToCartButton'
import { RelatedArticles } from '@/components/blog/RelatedArticles'
import type { BlogArticleSummary } from '@/lib/shopify/types'

type Tab = 'DESCRIPTION' | 'SPECIFICATIONS' | 'ORDERING INFO' | 'REVIEWS'
const TABS: Tab[] = ['DESCRIPTION', 'SPECIFICATIONS', 'ORDERING INFO', 'REVIEWS']

function getDefaultVariant(variants: ProductVariant[]): ProductVariant {
  return variants.find((v) => v.availableForSale) ?? variants[0]
}

function RelatedProductCard({ product }: { product: CollectionProduct }) {
  const price = parseFloat(
    product.variants.nodes[0]?.price.amount ?? product.priceRange.minVariantPrice.amount,
  )
  const image = product.images.nodes[0]

  return (
    <Link href={`/product/${product.handle}`} className="group flex flex-col bg-neutral-50 flex-1 min-w-[160px]">
      <div className="relative overflow-hidden bg-neutral-50 aspect-square">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.altText ?? product.title} className="size-full object-contain" />
        ) : (
          <div className="size-full bg-gray-100" />
        )}
      </div>
      <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
        <span className="text-teal-500 text-[12px] font-semibold uppercase tracking-[0.24px]">
          {product.vendor}
        </span>
        <p className="text-black text-[13px] font-semibold leading-5 line-clamp-2">{product.title}</p>
        <span className="text-black text-[16px] font-bold">${price.toFixed(2)}</span>
      </div>
    </Link>
  )
}

interface Props {
  product: Product
  relatedProducts: CollectionProduct[]
  relatedArticles?: BlogArticleSummary[]
}

export function ProductView({ product, relatedProducts, relatedArticles = [] }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    () => getDefaultVariant(product.variants.nodes),
  )
  const [orderQty, setOrderQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('DESCRIPTION')

  const price = parseFloat(selectedVariant.price.amount)
  const compareAt = selectedVariant.compareAtPrice
    ? parseFloat(selectedVariant.compareAtPrice.amount)
    : null
  const images = product.images.nodes
  const savePct =
    compareAt && compareAt > price
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : null

  const qty = selectedVariant.quantityAvailable ?? null
  const restockDate = product.estimatedRestockDate
    ? new Date(product.estimatedRestockDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null

  const stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backordered' = (() => {
    if (!selectedVariant.availableForSale) return restockDate ? 'backordered' : 'out_of_stock'
    if (qty !== null && qty <= 9) return 'low_stock'
    return 'in_stock'
  })()

  const SPEC_ROWS: { label: string; value: string | null }[] = [
    { label: 'Brand',            value: product.brandName },
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
    { label: 'Units Per Order',  value: product.unitsPerOrder },
    { label: 'Quantity of Units',value: product.quantityOfUnits },
    { label: 'Order Size',       value: product.orderSize },
  ].filter((r) => r.value != null)

  return (
    <>
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <Link href="/shop" className="text-gray-500 hover:text-navy-900 transition-colors">
            {product.vendor}
          </Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold line-clamp-1">{product.title}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="bg-[#f9fafc]">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-14 flex flex-col lg:flex-row gap-10 xl:gap-14">

          {/* Left – Image gallery */}
          <div className="lg:w-[52%] shrink-0 flex flex-col gap-4">
            <div className="relative bg-neutral-50 aspect-square overflow-hidden">
              {images[activeImg] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[activeImg].url}
                  alt={images[activeImg].altText ?? product.title}
                  className="size-full object-contain"
                />
              ) : (
                <div className="size-full bg-gray-100" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={`size-[80px] sm:size-[100px] lg:size-[120px] shrink-0 overflow-hidden bg-neutral-50 transition-colors ${
                      activeImg === i
                        ? 'border-[3px] border-navy-900'
                        : 'border border-gray-200 hover:border-navy-900'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.altText ?? product.title} className="size-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right – Product info */}
          <div className="flex-1 flex flex-col gap-5">
            {/* Brand + rating placeholder */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase">
                {product.vendor}
              </span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} strokeWidth={0} fill={i < 4 ? '#F4B942' : '#e5e7eb'} />
                ))}
                <span className="text-gray-500 text-[13px] tracking-[0.26px] ml-1">4.8</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-navy-900 text-[24px] sm:text-[28px] font-semibold leading-[1.25] tracking-tight">
              {product.title}
            </h1>

            {/* SKU placeholder — Shopify exposes this via `variants[0].sku` in Admin API but not Storefront */}
            <p className="text-gray-500 text-[13px] tracking-[0.26px]">
              SKU: {selectedVariant.id.split('/').pop()}
            </p>

            {/* Availability */}
            <div className="flex items-center gap-2">
              {stockStatus === 'in_stock' && (
                <>
                  <span className="size-[8px] rounded-full shrink-0 bg-green-500" />
                  <span className="text-gray-500 text-[13px] tracking-[0.26px]">
                    {qty !== null ? `In Stock – ${qty} available` : 'In Stock – Ships Same Day'}
                  </span>
                </>
              )}
              {stockStatus === 'low_stock' && (
                <>
                  <span className="size-[8px] rounded-full shrink-0 bg-amber-400" />
                  <span className="text-amber-600 text-[13px] font-semibold tracking-[0.26px]">
                    Low Stock – only {qty} left
                  </span>
                </>
              )}
              {stockStatus === 'backordered' && (
                <>
                  <span className="size-[8px] rounded-full shrink-0 bg-orange-400" />
                  <span className="text-orange-600 text-[13px] font-semibold tracking-[0.26px]">
                    Back-ordered – ships {restockDate ?? 'soon'}
                  </span>
                </>
              )}
              {stockStatus === 'out_of_stock' && (
                <>
                  <span className="size-[8px] rounded-full shrink-0 bg-red-400" />
                  <span className="text-red-500 text-[13px] font-semibold tracking-[0.26px]">
                    Out of Stock
                  </span>
                </>
              )}
            </div>

            <div className="h-px bg-gray-200" />

            {/* Variant selector */}
            <VariantSelector
              options={product.options}
              variants={product.variants.nodes}
              selectedVariant={selectedVariant}
              onSelect={setSelectedVariant}
            />

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-navy-900 text-[30px] font-bold leading-none">
                ${price.toFixed(2)}
              </span>
              {compareAt && compareAt > price && (
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
                  onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                  className="flex-1 flex items-center justify-center text-navy-900 hover:bg-neutral-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <div className="flex items-center justify-center w-[55px] border-x border-[rgba(102,102,100,0.5)] text-navy-900 text-[16px] font-semibold">
                  {orderQty}
                </div>
                <button
                  onClick={() => setOrderQty((q) => q + 1)}
                  className="flex-1 flex items-center justify-center text-navy-900 hover:bg-neutral-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              <AddToCartButton
                variantId={selectedVariant.id}
                quantity={orderQty}
                availableForSale={selectedVariant.availableForSale}
              />
            </div>

            {/* Request a quote */}
            <button className="border border-navy-900 text-navy-900 h-[46px] text-[14px] font-semibold tracking-[0.28px] hover:bg-neutral-50 transition-colors">
              Request a Quote
            </button>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 pt-1">
              {[
                { icon: <ShieldCheck size={16} className="text-teal-500" />, label: 'Quality Certified' },
                { icon: <Truck size={16} className="text-teal-500" />, label: '2-3 Day Delivery' },
                { icon: <RotateCcw size={16} className="text-teal-500" />, label: '30-Day Return' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  {icon}
                  <span className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.24px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab}
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

          <div className="py-10 sm:py-14 max-w-[760px]">
            {activeTab === 'DESCRIPTION' && (
              <div
                className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }}
              />
            )}

            {activeTab === 'SPECIFICATIONS' && (
              <div className="flex flex-col gap-6">
                {(product.options.length > 0 || SPEC_ROWS.length > 0) ? (
                  <table className="w-full max-w-[600px]">
                    <tbody>
                      {product.options.map((opt, i) => (
                        <tr key={opt.id} className={i % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}>
                          <td className="py-3 px-4 text-[14px] font-semibold text-navy-900 w-[200px]">
                            {opt.name}
                          </td>
                          <td className="py-3 px-4 text-[14px] text-gray-500">
                            {opt.values.join(', ')}
                          </td>
                        </tr>
                      ))}
                      {SPEC_ROWS.map(({ label, value }, i) => (
                        <tr
                          key={label}
                          className={(product.options.length + i) % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}
                        >
                          <td className="py-3 px-4 text-[14px] font-semibold text-navy-900 w-[200px]">
                            {label}
                          </td>
                          <td className="py-3 px-4 text-[14px] text-gray-500">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-[15px]">No specifications available.</p>
                )}

                {/* Badges */}
                {(product.customBadge1 || product.customBadge2 || product.customBadge3) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[product.customBadge1, product.customBadge2, product.customBadge3]
                      .filter(Boolean)
                      .map((badge) => (
                        <span
                          key={badge}
                          className="bg-teal-50 text-teal-700 text-[12px] font-semibold px-3 py-1 border border-teal-200"
                        >
                          {badge}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ORDERING INFO' && (
              <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">
                Orders placed before 3 PM EST ship same day. Standard delivery is 2–3 business days.
                Bulk orders of 10+ cases qualify for additional volume discounts. Contact your
                account manager or use the B2B quote form for custom pricing.
              </p>
            )}

            {activeTab === 'REVIEWS' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-navy-900 text-[48px] font-bold leading-none">4.8</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} strokeWidth={0} fill={i < 5 ? '#F4B942' : '#e5e7eb'} />
                      ))}
                    </div>
                    <span className="text-gray-500 text-[13px]">Based on customer reviews</span>
                  </div>
                </div>
                <p className="text-gray-500 text-[15px] leading-[28px]">
                  No individual reviews to display yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
            <h2 className="text-navy-900 text-[20px] font-semibold tracking-[0.4px] mb-8">
              Commonly Purchased With
            </h2>
            <div className="flex flex-col sm:flex-row gap-[23px]">
              {relatedProducts.slice(0, 4).map((p) => (
                <RelatedProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {relatedProducts.length > 4 && (
        <section className="bg-[#f9fafc] border-t border-gray-200">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
            <h2 className="text-navy-900 text-[20px] font-semibold tracking-[0.4px] mb-8">
              You May Also Need
            </h2>
            <div className="flex gap-0 overflow-x-auto scrollbar-hide items-stretch">
              {relatedProducts.slice(4).map((item, i, arr) => (
                <div key={item.id} className="flex items-stretch">
                  <div className="flex flex-col bg-neutral-50 w-[185px] sm:w-[201px] shrink-0">
                    <div className="bg-neutral-50 h-[160px] sm:h-[185px] overflow-hidden flex items-center justify-center">
                      {item.images.nodes[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.images.nodes[0].url}
                          alt={item.images.nodes[0].altText ?? item.title}
                          className="size-full object-contain"
                        />
                      )}
                    </div>
                    <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
                      <p className="text-black text-[13px] font-semibold leading-5 line-clamp-2">
                        {item.title}
                      </p>
                      <span className="text-black text-[16px] font-bold">
                        ${parseFloat(item.priceRange.minVariantPrice.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-center justify-center w-[40px] shrink-0">
                      <span className="text-navy-900 text-[20px] font-semibold">+</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <RelatedArticles articles={relatedArticles} heading="From Our Blog" />
    </>
  )
}
