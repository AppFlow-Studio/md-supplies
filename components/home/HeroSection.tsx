'use client'

import Link from "next/link";
import { FadeIn } from "@/components/ui/FadeIn";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import type { CollectionProduct } from "@/lib/shopify/types";
import { Van } from "lucide-react";

function OccIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="1" y="4" width="12" height="9" rx="1" stroke="#0086b1" strokeWidth="1.4" fill="none"/>
      <path d="M4.5 4V3C4.5 1.895 5.395 1 6.5 1h1C8.605 1 9.5 1.895 9.5 3v1" stroke="#0086b1" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="1" y1="7.5" x2="13" y2="7.5" stroke="#0086b1" strokeWidth="1.4"/>
    </svg>
  );
}

interface Props {
  products: CollectionProduct[];
}

function ProductCard({ product }: { product: CollectionProduct }) {
  const price = parseFloat(
    product.variants.nodes[0]?.price.amount ?? product.priceRange.minVariantPrice.amount,
  );
  const image = product.images.nodes[0];

  return (
    <Link
      href={`/product/${product.handle}`}
      className="group bg-white overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="aspect-square overflow-hidden bg-white p-7">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.altText ?? product.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-[14px] font-semibold text-navy-900 leading-snug line-clamp-2">{product.title}</p>
        <p className="text-[12px] text-gray-500">From ${price.toFixed(2)} · {product.vendor}</p>
      </div>
    </Link>
  );
}

export function HeroSection({ products }: Props) {
  return (
    <section className="w-full bg-neutral-100">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 md:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12 xl:gap-20">

          {/* ── Left: content ── */}
          <div className="flex-1 min-w-0 flex flex-col items-start gap-5 sm:gap-6">

            {/* Badge — no icon per Figma design */}
            <FadeIn delay={0}>
              <div className="inline-flex bg-[rgba(0,193,255,0.2)] rounded-full px-5 py-2">
                <span className="text-[15px] font-semibold tracking-[0.3px] text-teal-500">
                  CERTIFIED MEDICAL SUPPLIER
                </span>
              </div>
            </FadeIn>

            {/* Heading */}
            <FadeIn delay={0.1}>
              <div>
                <h1 className="text-[38px] sm:text-[46px] lg:text-[55px] font-semibold leading-[1.2] tracking-[0.9px] text-navy-900">
                  Medical-Grade Supplies{" "}
                </h1>
                <h1 className="text-[38px] sm:text-[46px] lg:text-[55px] font-semibold leading-[1.2] tracking-[0.9px] text-teal-500">
                  Built for Clinicians
                </h1>
              </div>
            </FadeIn>

            {/* Description */}
            <FadeIn delay={0.2}>
              <p className="text-gray-500 text-[18px] leading-[30px] tracking-[0.36px] max-w-[516px]">
                8,000+ products across every clinical category. Trusted by urgent care centers,
                HRT clinics, home health agencies, and first responders.
              </p>
            </FadeIn>

            {/* CTAs */}
            <FadeIn delay={0.3}>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/products"
                  className="bg-navy-900 text-white border border-navy-900 text-[18px] font-semibold px-[52px] py-[17px] hover:bg-white hover:text-navy-900 hover:border-teal-500 transition-colors tracking-[0.36px]"
                >
                  Shop All Products
                </Link>
                <Link
                  href="/contact"
                  className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-[52px] py-[17px] hover:bg-navy-900 hover:text-white transition-colors tracking-[0.36px]"
                >
                  Contact Us
                </Link>
              </div>
            </FadeIn>

            {/* OCC Program box */}
            <FadeIn delay={0.4}>
              <div className="bg-[rgba(0,193,255,0.2)] px-5 py-4 flex items-center gap-4 w-full max-w-[539px]">
                <Van className="w-10 h-9"/>
                <div className="flex-1">
                  <p className="text-navy-900 text-[18px] font-extrabold tracking-[0.36px] leading-snug">
                    OCC Program
                  </p>
                  <p className="text-navy-900 text-[16px] font-semibold tracking-[0.32px] leading-snug mt-0.5">
                    Free shipping on all eligible items
                  </p>
                </div>
                <Link
                  href="/occ"
                  className="group text-teal-500 text-[15px] font-semibold shrink-0 tracking-[0.3px] inline-flex items-center gap-1"
                >
                  Shop OCC <AnimatedArrow size={14} />
                </Link>
              </div>
            </FadeIn>

          </div>

          {/* ── Right: product grid ── */}
          <FadeIn delay={0.2} className="w-full sm:w-105 lg:w-115 xl:w-135 shrink-0">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex flex-col gap-3 sm:gap-4 flex-1 mt-8">
                {products && [products[0], products[2]].filter(Boolean).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:gap-4 flex-1">
                {products && [products[1], products[3]].filter(Boolean).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
