'use client'

import Link from "next/link";
import { ShieldCheck, Check, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";

// Figma asset URLs — replace with permanent CDN once available
const PRODUCT_CARDS = [
  {
    name: "Professional Thermometer",
    priceFrom: "$2.40/unit",
    pricePer: "Box of 40",
    img: "https://www.figma.com/api/mcp/asset/226d283f-825f-471a-b2c6-f75a4c4758fd",
  },
  {
    name: "Insulin Delivery System",
    priceFrom: "$4.60/unit",
    pricePer: "Box of 40",
    img: "https://www.figma.com/api/mcp/asset/356abec0-5f2d-491a-b744-aea8cfc297a2",
  },
  {
    name: "Sterile Barrier Pack",
    priceFrom: "$2.20/unit",
    pricePer: "Box of 50",
    img: "https://www.figma.com/api/mcp/asset/74ba38c1-0c87-488b-8cbb-585446711a84",
  },
  {
    name: "Digital BP Monitor",
    priceFrom: "$4.80/unit",
    pricePer: "Box of 10",
    img: "https://www.figma.com/api/mcp/asset/111e9c13-d77a-4538-a51b-96a4947d03b4",
  },
];

function ProductCard({ name, priceFrom, pricePer, img }: {
  name: string; priceFrom: string; pricePer: string; img: string;
}) {
  return (
    <Link
      href="/products"
      className="group bg-white overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="aspect-square overflow-hidden bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-[12px] font-semibold text-navy-900 leading-snug">{name}</p>
        <p className="text-[10px] text-gray-500">From {priceFrom} · {pricePer}</p>
      </div>
    </Link>
  );
}

export function HeroSection() {
  return (
    <section className="w-full bg-neutral-100">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 md:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12 xl:gap-20">

          {/* ── Left: content ── */}
          <div className="flex-1 min-w-0 flex flex-col items-start gap-5 sm:gap-6">

            <FadeIn delay={0}>
              <div className="flex items-center gap-2 bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-2">
                <ShieldCheck size={14} className="text-teal-500 shrink-0" />
                <span className="text-[11px] font-semibold tracking-[0.08em] text-teal-500 uppercase">
                  Certified Medical Supplier
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div>
                <h1 className="text-[38px] sm:text-[46px] lg:text-[55px] font-bold leading-[1.15] tracking-tight text-navy-900">
                  Medical-Grade Supplies
                </h1>
                <h1 className="text-[38px] sm:text-[46px] lg:text-[55px] font-bold leading-[1.15] tracking-tight text-teal-500">
                  Wholesale Prices
                </h1>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-gray-500 text-[15px] leading-[1.9] max-w-122.5">
                Bulk pricing on 4,000+ products. Trusted by urgent care centers,
                HRT clinics, home health agencies, and first responders.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="bg-navy-900 text-white text-sm font-semibold px-10 py-[18px] hover:bg-navy-950 transition-colors"
                >
                  Shop All Products
                </Link>
                <Link
                  href="/contact"
                  className="border border-navy-900 text-navy-900 text-sm font-semibold px-10 py-[18px] hover:bg-navy-900 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="bg-[rgba(0,193,255,0.2)] px-5 py-4 flex flex-col gap-2 w-full max-w-77.75 mt-1">
                <p className="text-navy-900 text-[17px] font-bold">OCC Program</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Check size={12} className="text-teal-500 shrink-0" />
                  <span>Free shipping on all eligible items</span>
                </div>
                <Link
                  href="/occ"
                  className="text-teal-500 text-sm font-semibold hover:underline flex items-center gap-1 mt-0.5"
                >
                  Shop OCC <ArrowRight size={13} />
                </Link>
              </div>
            </FadeIn>

          </div>

          {/* ── Right: product grid ── */}
          <FadeIn delay={0.2} className="w-full sm:w-105 lg:w-115 xl:w-135 shrink-0">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex flex-col gap-3 sm:gap-4 flex-1 mt-8">
                {[PRODUCT_CARDS[0], PRODUCT_CARDS[2]].map(({ name, priceFrom, pricePer, img }) => (
                  <ProductCard key={name} name={name} priceFrom={priceFrom} pricePer={pricePer} img={img} />
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:gap-4 flex-1">
                {[PRODUCT_CARDS[1], PRODUCT_CARDS[3]].map(({ name, priceFrom, pricePer, img }) => (
                  <ProductCard key={name} name={name} priceFrom={priceFrom} pricePer={pricePer} img={img} />
                ))}
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
