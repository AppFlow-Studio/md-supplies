"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star, ShieldCheck, Truck, RotateCcw, Plus, Minus, ShoppingCart, ChevronRight,
} from "lucide-react";
import type { ProductDetailData } from "@/lib/products";

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          strokeWidth={0}
          fill={i < Math.floor(rating) ? "#F4B942" : i < rating ? "#F4B942" : "#e5e7eb"}
          className="shrink-0"
        />
      ))}
    </span>
  );
}

// ─── Tab panel ───────────────────────────────────────────────────────────────

const TABS = ["DESCRIPTION", "SPECIFICATIONS", "ORDERING INFO", "REVIEWS"] as const;
type Tab = typeof TABS[number];

function TabContent({ tab, product }: { tab: Tab; product: ProductDetailData }) {
  if (tab === "DESCRIPTION") {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px]">
          High Performance Protection
        </h2>
        <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">
          {product.description}
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-navy-900 text-[15px] font-semibold leading-[28px] tracking-[0.3px]">
            Key Features:
          </p>
          {product.keyFeatures.map((f, i) => (
            <p key={i} className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">
              → {f}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "SPECIFICATIONS") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full max-w-[600px]">
          <tbody>
            {product.specifications.map(({ label, value }, i) => (
              <tr key={label} className={i % 2 === 0 ? "bg-neutral-50" : "bg-white"}>
                <td className="py-3 px-4 text-[14px] font-semibold text-navy-900 w-[200px]">{label}</td>
                <td className="py-3 px-4 text-[14px] text-gray-500">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "ORDERING INFO") {
    return (
      <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px] max-w-[700px]">
        {product.orderingInfo}
      </p>
    );
  }

  // REVIEWS
  return (
    <div className="flex flex-col gap-6 max-w-[700px]">
      <div className="flex items-center gap-4">
        <span className="text-navy-900 text-[48px] font-bold leading-none">{product.rating}</span>
        <div className="flex flex-col gap-1">
          <StarRating rating={product.rating} />
          <span className="text-gray-500 text-[13px]">{product.reviewCount} reviews</span>
        </div>
      </div>
      <p className="text-gray-500 text-[15px] leading-[28px]">
        No individual reviews to display yet. Be the first to review this product.
      </p>
    </div>
  );
}

// ─── Commonly Purchased With card ─────────────────────────────────────────────

function RelatedCard({ brand, name, price, image, slug }: {
  brand: string; name: string; price: number; image: string; slug: string;
}) {
  return (
    <Link href={`/shop/${slug}`} className="group flex flex-col bg-[#f9faf9] flex-1 min-w-0">
      <div className="relative overflow-hidden bg-[#f9faf9] aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={name} className="size-full object-contain" />
        <div className="absolute inset-x-0 bottom-0 h-[40px] bg-navy-900 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <ShoppingCart size={13} className="text-white" />
          <span className="text-white text-[12px] font-medium tracking-[0.24px]">Add to cart</span>
        </div>
      </div>
      <div className="px-4 pt-4 pb-5 flex flex-col gap-1">
        <span className="text-teal-500 text-[13px] font-semibold tracking-[0.26px] uppercase">{brand}</span>
        <p className="text-black text-[14px] font-semibold tracking-[0.28px] leading-5 line-clamp-2 mb-2">{name}</p>
        <span className="text-black text-[18px] font-bold tracking-[0.36px]">${price.toFixed(2)}</span>
      </div>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductDetail({ product }: { product: ProductDetailData }) {
  const [activeImg,  setActiveImg]  = useState(0);
  const [activeUnit, setActiveUnit] = useState(1);
  const [qty,        setQty]        = useState(2);
  const [activeTab,  setActiveTab]  = useState<Tab>("DESCRIPTION");

  const currentUnit = product.units[activeUnit];

  return (
    <>
      {/* ── Breadcrumbs ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href="/"         className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <Link href="/shop"     className="text-gray-500 hover:text-navy-900 transition-colors">Gloves</Link>
          <span className="text-gray-500">›</span>
          <Link href="/shop"     className="text-gray-500 hover:text-navy-900 transition-colors">Exam Gloves</Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold line-clamp-1">{product.name}</span>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="bg-[#f9fafc]">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-14 flex flex-col lg:flex-row gap-10 xl:gap-14">

          {/* Left – image gallery */}
          <div className="lg:w-[52%] shrink-0 flex flex-col gap-4">
            {/* Main image */}
            <div className="relative bg-[#f9faf9] aspect-square overflow-hidden">
              {product.freeShipping && (
                <span className="absolute top-0 left-0 z-10 bg-[#006e46] text-white text-[13px] font-semibold h-[38px] px-5 flex items-center tracking-[0.26px]">
                  FREE SHIPPING
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images[activeImg] ?? product.images[0]}
                alt={product.name}
                className="size-full object-contain"
              />
            </div>
            {/* Thumbnails */}
            <div className="flex gap-3">
              {product.images.slice(0, 5).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`size-[100px] sm:size-[120px] lg:size-[139px] shrink-0 overflow-hidden bg-[#f9faf9] transition-colors ${
                    activeImg === i ? "border-[3px] border-navy-900" : "border border-gray-200 hover:border-navy-900"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${product.name} view ${i + 1}`} className="size-full object-contain" />
                </button>
              ))}
            </div>
          </div>

          {/* Right – product info */}
          <div className="flex-1 flex flex-col gap-5">

            {/* Brand + rating */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase">
                {product.brand}
              </span>
              <div className="flex items-center gap-2">
                <StarRating rating={product.rating} />
                <span className="text-gray-500 text-[13px] tracking-[0.26px]">
                  {product.rating} ({product.reviewCount} Reviews)
                </span>
              </div>
            </div>

            {/* Name */}
            <h1 className="text-navy-900 text-[24px] sm:text-[28px] font-semibold leading-[1.25] tracking-tight">
              {product.name}
            </h1>

            {/* SKU */}
            <p className="text-gray-500 text-[13px] tracking-[0.26px]">
              SKU: {product.sku}
            </p>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className={`size-[8px] rounded-full shrink-0 ${product.inStock ? "bg-green-500" : "bg-red-400"}`} />
              <span className="text-gray-500 text-[13px] tracking-[0.26px]">
                {product.inStock ? "In Stock – Ships Same Day" : "Out of Stock"}
              </span>
            </div>

            <div className="h-px bg-gray-200" />

            {/* SELECT UNIT */}
            <div className="flex flex-col gap-3">
              <p className="text-navy-900 text-[13px] font-semibold tracking-[0.26px] uppercase">
                Select Unit
              </p>
              <div className="flex gap-3 flex-wrap">
                {product.units.map((unit, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveUnit(i)}
                    className={`flex flex-col items-center justify-center h-[77px] flex-1 min-w-[100px] px-4 transition-colors ${
                      activeUnit === i
                        ? "bg-[rgba(102,102,100,0.1)] border border-navy-900"
                        : "border border-[rgba(102,102,100,0.5)] hover:border-navy-900"
                    }`}
                  >
                    <span className="text-navy-900 text-[15px] font-semibold leading-[1.3]">{unit.label}</span>
                    <span className="text-gray-500 text-[13px] tracking-[0.26px]">{unit.priceLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-navy-900 text-[30px] font-bold leading-none">
                ${currentUnit.price.toFixed(2)}
              </span>
              {product.strikePrice && (
                <span className="text-gray-500 text-[15px] line-through tracking-[0.3px]">
                  ${product.strikePrice.toFixed(2)}
                </span>
              )}
              {product.savePct && (
                <span className="text-[#006e46] text-[13px] font-semibold tracking-[0.26px]">
                  Save {product.savePct}% · {product.saleLabel}
                </span>
              )}
            </div>

            {/* Qty + Add to cart */}
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              {/* Quantity */}
              <div className="flex border border-[rgba(102,102,100,0.5)] h-[56px] w-[167px] shrink-0">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="flex-1 flex items-center justify-center text-navy-900 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <div className="flex items-center justify-center w-[55px] border-x border-[rgba(102,102,100,0.5)] text-navy-900 text-[16px] font-semibold">
                  {qty}
                </div>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="flex-1 flex items-center justify-center text-navy-900 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Add to cart */}
              <button className="flex-1 bg-navy-900 text-white h-[56px] flex items-center justify-center gap-2 text-[15px] font-semibold tracking-[0.3px] uppercase hover:bg-navy-950 transition-colors">
                <ShoppingCart size={16} />
                Add to Cart
              </button>
            </div>

            {/* Request a quote */}
            <button className="border border-navy-900 text-navy-900 h-[46px] text-[14px] font-semibold tracking-[0.28px] hover:bg-neutral-50 transition-colors">
              Request a Quote
            </button>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 pt-1">
              {[
                { icon: <ShieldCheck size={16} className="text-teal-500" />, label: "Quality Certified"  },
                { icon: <Truck       size={16} className="text-teal-500" />, label: "2-3 Day Delivery"   },
                { icon: <RotateCcw   size={16} className="text-teal-500" />, label: "30-Day Return"      },
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

      {/* ── Tabs + Description ── */}
      <section className="bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          {/* Tab strip */}
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto scrollbar-hide gap-0">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-5 text-[15px] font-semibold tracking-[0.3px] whitespace-nowrap border-b-[3px] transition-colors ${
                    activeTab === tab
                      ? "text-teal-500 border-teal-500"
                      : "text-navy-900 border-transparent hover:text-teal-500"
                  }`}
                >
                  {tab === "REVIEWS" ? `REVIEWS (${product.reviewCount})` : tab}
                </button>
              ))}
            </div>
          </div>
          {/* Tab content */}
          <div className="py-10 sm:py-14">
            <TabContent tab={activeTab} product={product} />
          </div>
        </div>
      </section>

      {/* ── Commonly Purchased With ── */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
          <h2 className="text-navy-900 text-[20px] font-semibold tracking-[0.4px] mb-8">
            Commonly Purchased With
          </h2>
          <div className="flex flex-col sm:flex-row gap-[23px]">
            {product.commonlyPurchasedWith.map(p => (
              <RelatedCard key={p.id} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── You May Also Need ── */}
      <section className="bg-[#f9fafc] border-t border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
          <h2 className="text-navy-900 text-[20px] font-semibold tracking-[0.4px] mb-8">
            You May Also Need
          </h2>
          <div className="flex items-stretch gap-0 overflow-x-auto scrollbar-hide">
            {product.youMayAlsoNeed.map((item, i) => (
              <div key={item.id} className="flex items-stretch">
                {/* Item */}
                <div className="flex flex-col bg-[#f9faf9] w-[185px] sm:w-[201px] shrink-0">
                  <div className="bg-[#f9faf9] h-[160px] sm:h-[185px] overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="size-full object-contain" />
                  </div>
                  <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
                    <p className="text-black text-[14px] font-semibold tracking-[0.28px] leading-5 line-clamp-2">{item.name}</p>
                    <span className="text-black text-[18px] font-bold tracking-[0.36px]">${item.price.toFixed(2)}</span>
                  </div>
                </div>
                {/* Plus separator */}
                {i < product.youMayAlsoNeed.length - 1 && (
                  <div className="flex items-center justify-center w-[40px] shrink-0">
                    <span className="text-navy-900 text-[20px] font-semibold">+</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
