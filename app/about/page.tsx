import Link from "next/link";
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { ShieldCheck, Package, Headphones } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";

const IMG_HERO      = "/images/about/HERO.png";
const IMG_BRANDS    = "/images/about/brands.png";
const IMG_WAREHOUSE = "/images/about/warehouse.png";
const IMG_PRODUCTS  = "/images/about/products.png";

export const metadata = buildMetadata({
  pageType: 'static',
  title: 'About Us',
  description: 'MDSupplies serves clinics, urgent care centers, HRT practices, and first responders with trusted brands and fast fulfillment.',
  slug: 'about',
  image: `${SITE_URL}${IMG_HERO}`,
})

export default function AboutPage() {
  return (
    <main>

      {/* ── Hero ── */}
      <section className="w-full bg-white overflow-hidden">
        <div className="max-w-360 mx-auto flex flex-col lg:flex-row items-stretch">

          {/* Left text */}
          <div className="flex-1 px-4 sm:px-8 lg:px-14 py-16 lg:py-24 flex flex-col justify-center gap-7">
            <FadeIn delay={0}>
              <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase">
                About Us
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="text-[40px] sm:text-[50px] font-semibold text-navy-900 leading-[1.2] tracking-tight max-w-[540px]">
                Supplied You Trust.
                <br />
                Shipping You Can
                <br />
                Count On.
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-gray-500 text-[18px] font-medium leading-[1.65] max-w-[516px]">
                We serve clinics, urgent care centers, HRT practices, and first responders with
                brands you already know and fast, reliable fulfillment.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <Link
                href="/shop"
                className="inline-flex items-center self-start bg-navy-900 text-white text-[18px] font-semibold px-10 py-[18px] hover:bg-navy-950 transition-colors"
              >
                Shop Products
              </Link>
            </FadeIn>
          </div>

          {/* Right image */}
          <FadeIn delay={0.2} className="w-full h-[280px] sm:h-[420px] lg:w-[720px] lg:h-auto shrink-0 relative overflow-hidden ">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG_HERO}
              alt="Medical supplies laid out on a surface"
              className="absolute inset-0 size-full object-cover"
            />
          </FadeIn>

        </div>
      </section>

      {/* ── Built for Facilities Like Yours ── */}
      <section className="w-full bg-neutral-50 overflow-hidden">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24 flex flex-col lg:flex-row gap-12 lg:gap-16 xl:gap-20">

          {/* Left text */}
          <FadeIn delay={0} className="lg:max-w-[516px] shrink-0">
            <div className="flex flex-col gap-6 justify-center">
              <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] leading-[1.3]">
                Built for Facilities Like Yours
              </h2>
              <p className="text-gray-500 text-[18px] font-medium leading-[1.65]">
                MDSupplies was built for healthcare professionals who need reliable products,
                fast shipping, and fair pricing — without the red tape of traditional distributors.
              </p>
              <p className="text-gray-500 text-[18px] font-medium leading-[1.65]">
                We stock over 8,000 products from trusted manufacturers. Whether you&apos;re
                restocking an urgent care clinic, managing supplies for an HRT practice, or
                equipping a first responder team — we make ordering simple.
              </p>
            </div>
          </FadeIn>

          {/* Right 2×2 tile grid */}
          <div className="flex-1 grid grid-cols-2 gap-6">

            {/* Tile 1 – 99.8% Accuracy */}
            <FadeIn delay={0}>
              <div className="bg-white p-8 flex flex-col gap-3">
                <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} className="text-teal-500" />
                </div>
                <h3 className="text-navy-900 text-[22px] font-semibold leading-[1.3] mt-2">
                  99.8% Accuracy
                </h3>
                <p className="text-gray-500 text-[15px] leading-[1.65]">
                  Every order is picked and verified before it ships.
                </p>
              </div>
            </FadeIn>

            {/* Tile 2 – Vast Inventory */}
            <FadeIn delay={0.08}>
              <div className="bg-[rgba(11,23,43,0.06)] p-8 flex flex-col gap-3">
                <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(11,23,43,0.08)] flex items-center justify-center shrink-0">
                  <Package size={24} className="text-navy-900" />
                </div>
                <h3 className="text-navy-900 text-[22px] font-semibold leading-[1.3] mt-2">
                  Vast Inventory
                </h3>
                <p className="text-gray-500 text-[15px] leading-[1.65]">
                  Browse 8,000+ products from trusted brands.
                </p>
              </div>
            </FadeIn>

            {/* Tile 3 – Trusted Brands */}
            <FadeIn delay={0.16}>
              <div className="bg-navy-900 p-8 flex flex-col gap-3">
                <h3 className="text-[#f9fafc] text-[22px] font-semibold leading-[1.3]">
                  Trusted Brands
                </h3>
                <p className="text-[#9e9e9e] text-[15px] leading-[1.65]">
                  BD, Dynarex, Cardinal Health — names you know.
                </p>
              </div>
            </FadeIn>

            {/* Tile 4 – Image */}
            <FadeIn delay={0.24} className="relative overflow-hidden min-h-[200px] ">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMG_BRANDS}
                alt="Medical device"
                className="absolute inset-0 size-full object-cover"
              />
            </FadeIn>

          </div>
        </div>
      </section>

      {/* ── How We Work ── */}
      <section className="w-full bg-white overflow-hidden">

        {/* Centered header */}
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pt-16 md:pt-20 lg:pt-24 pb-10 flex flex-col items-center gap-4 text-center">
          <FadeIn delay={0}>
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase">
                How We Work
              </p>
              <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
                Simple Ordering. Reliable Delivery.
              </h2>
              <p className="text-gray-500 text-[18px] font-medium leading-[1.65] max-w-[746px]">
                From source to shipment, every step is built around speed, accuracy, and trust.
              </p>
            </div>
          </FadeIn>
        </div>

        {/* 2-col content */}
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-16 md:pb-20 lg:pb-24 flex flex-col lg:flex-row gap-5">

          {/* Left – warehouse image with text overlay */}
          <FadeIn delay={0} className="group lg:flex-1 relative overflow-hidden min-h-[360px] lg:min-h-[654px] bg-neutral-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG_WAREHOUSE}
              alt="MDSupplies warehouse"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.8)] transition-opacity duration-300 group-hover:opacity-0" />
            <div className="absolute bottom-0 left-0 p-8 sm:p-10">
              <h3 className="text-[#f9fafc] text-[30px] sm:text-[35px] font-semibold leading-[1.1] mb-3 drop-shadow-md">
                Fast Fulfillment
              </h3>
              <p className="text-[#9e9e9e] text-[15px] leading-[1.65] max-w-[480px] drop-shadow">
                Orders ship from our warehouse to facilities nationwide.
              </p>
            </div>
          </FadeIn>

          {/* Right – 2×2 process cards */}
          <div className="lg:flex-1 grid grid-cols-2 gap-5">

            {/* Source Selection */}
            <FadeIn delay={0}>
              <div className="bg-neutral-50 px-8 pt-[90px] pb-8 flex flex-col gap-3 relative overflow-hidden">
                <span className="absolute top-8 left-8 text-[50px] font-extrabold text-[rgba(11,23,43,0.08)] leading-none select-none pointer-events-none">
                  01
                </span>
                <h3 className="text-navy-900 text-[22px] font-semibold leading-[1.3]">
                  Source Selection
                </h3>
                <p className="text-gray-500 text-[15px] leading-[1.65]">
                  We only partner with FDA-registered manufacturers.
                </p>
              </div>
            </FadeIn>

            {/* Medical products image */}
            <FadeIn delay={0.08} className="relative overflow-hidden min-h-[200px] ">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMG_PRODUCTS}
                alt="Medical products"
                className="absolute inset-0 size-full object-cover"
              />
            </FadeIn>

            {/* Stats */}
            <FadeIn delay={0.16}>
              <div className="bg-navy-900 p-8 flex flex-col justify-center gap-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[#f9fafc] text-[35px] font-semibold leading-none">
                    8,000+
                  </span>
                  <span className="text-gray-500 text-[13px] tracking-[0.3px] uppercase">
                    Products
                  </span>
                </div>
                <div className="h-px bg-white/20" />
                <div className="flex flex-col gap-1">
                  <span className="text-[#f9fafc] text-[35px] font-semibold leading-none">
                    12,000+
                  </span>
                  <span className="text-gray-500 text-[13px] tracking-[0.3px] uppercase leading-tight">
                    Facilities Served
                  </span>
                </div>
              </div>
            </FadeIn>

            {/* Dedicated Support */}
            <FadeIn delay={0.24}>
              <div className="bg-[rgba(11,23,43,0.06)] p-8 flex flex-col gap-3">
                <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(11,23,43,0.08)] flex items-center justify-center shrink-0">
                  <Headphones size={24} className="text-navy-900" />
                </div>
                <h3 className="text-navy-900 text-[22px] font-semibold leading-[1.3] mt-2">
                  Dedicated Support
                </h3>
                <p className="text-gray-500 text-[15px] leading-[1.65]">
                  Real people who respond in hours, not days.
                </p>
                <Link
                  href="/contact"
                  className="group text-navy-900 text-[15px] font-semibold tracking-[0.75px] uppercase hover:text-teal-500 transition-colors mt-auto pt-2 inline-flex items-center gap-1"
                >
                  Contact Us <AnimatedArrow size={14} />
                </Link>
              </div>
            </FadeIn>

          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="w-full bg-navy-900">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24 flex flex-col items-center gap-10 text-center">
          <FadeIn delay={0}>
            <div className="flex flex-col items-center gap-10 text-center">
              <h2 className="text-[#f9fafc] text-[28px] sm:text-[35px] font-semibold leading-[1.25] max-w-[720px]">
                Ready to simplify your supply ordering?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/shop"
                  className="bg-white text-navy-900 text-[18px] font-semibold tracking-[0.36px] px-10 py-[18px] hover:bg-gray-100 transition-colors"
                >
                  Shop All Products
                </Link>
                <Link
                  href="/contact"
                  className="border border-white text-white text-[18px] font-semibold tracking-[0.36px] px-10 py-[18px] hover:bg-white/10 transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

    </main>
  );
}
