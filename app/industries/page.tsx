import Link from 'next/link'
import { INDUSTRIES } from '@/lib/industries'
import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
import {BadgeCheck, FileText, Headset, MapPin, Truck} from "lucide-react";
import { AnimatedArrow } from '@/components/ui/AnimatedArrow'
import { getIndustryImagePath } from '@/lib/bunnycdn'

export const revalidate = 3600

const _industriesCanonical = buildCanonical({ path: '/industries' })
export const metadata = {
  title: 'Shop by Industry | MDSupplies',
  description: 'Medical supplies curated for your specialty — urgent care, EMS, pharmacy, physical therapy, and more.',
  robots: buildRobots({ pageType: 'homepage' }), // non-utility type → index,follow; staging guard applied
  alternates: { canonical: _industriesCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'Shop by Industry | MDSupplies',
    description: 'Medical supplies curated for your specialty — urgent care, EMS, pharmacy, physical therapy, and more.',
    url: _industriesCanonical,
  }),
}

const HERO_IMAGE = getIndustryImagePath("industry-clinics-&-doctor's-offices.jpeg")

const STATS = [
  { value: '1,000+', label: 'ACTIVE ACCOUNTS' },
  { value: '8,000+', label: 'PRODUCTS' },
  { value: 'Fast', label: 'FULFILLMENT' },
  { value: '24-48 hr', label: 'FAST SUPPORT' },
]

const WHY_ITEMS = [
  {
    title: 'Fast Shipping',
    description: 'Fast, reliable fulfillment on every order — so your facility never runs short.',
  },
  {
    title: 'Trusted Brands',
    description: 'We stock only industry-leading clinical brands with full ISO certifications.',
  },
  {
    title: 'Dedicated Support',
    description: 'Expert account managers for every facility to handle complex procurement needs.',
  },
]

export default function IndustriesPage() {
  return (
    <main id="main-content" className="bg-neutral-100">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-neutral-100 min-h-[520px] lg:min-h-[600px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[59px] py-14 lg:py-0 lg:h-[716px] flex flex-col lg:flex-row items-center gap-10 lg:gap-0">

          {/* Left content */}
          <div className="flex-1 flex flex-col gap-6 lg:pt-[143px]">
            <div className="inline-flex items-center self-start">
              <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px]">
                SHOP BY INDUSTRY
              </span>
            </div>

            <h1 className="text-navy-900 text-[40px] lg:text-[50px] font-semibold leading-[1.2] tracking-tight max-w-[600px]">
              Medical Supplies for<br />Your Facility
            </h1>

            <p className="text-gray-500 text-[18px] leading-[30px] max-w-[541px]">
              Whether you run an urgent care clinic, HRT practice, or home health agency — we stock the products you need with fast fulfillment and competitive pricing.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/categories"
                className="bg-navy-900 text-white border border-navy-900 text-[18px] font-semibold px-8 h-[59px] flex items-center justify-center hover:bg-white hover:text-navy-900 hover:border-teal-500 transition-colors"
              >
                Shop All Products
              </Link>
              <Link
                href="/contact"
                className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[59px] flex items-center justify-center hover:bg-white transition-colors"
              >
                Contact Us
              </Link>
            </div>

            {/* OCC Program banner */}
            <div className="bg-[rgba(0,193,255,0.2)] flex items-center gap-4 px-6 py-5 mt-2 max-w-[541px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-navy-900 text-[18px] font-extrabold tracking-[0.36px]">OCC Program</span>
                <span className="text-navy-900 text-[16px] font-semibold tracking-[0.32px]">Dedicated pricing, terms &amp; account support</span>
              </div>
              <Link href="/solutions/occ" className="group ml-auto text-teal-500 text-[15px] font-semibold whitespace-nowrap inline-flex items-center gap-1">
                Shop OCC <AnimatedArrow size={14} />
              </Link>
            </div>
          </div>

          {/* Right hero image */}
          <div className="hidden lg:block absolute right-0 top-0 w-[743px] h-[744px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt="Medical professional"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-navy-900 h-[178px] flex items-center">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[59px] w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-white text-[35px] font-semibold">{value}</span>
                <span className="text-[#9e9e9e] text-[15px] tracking-[0.3px]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries We Serve ── */}
      <section className="bg-neutral-100 py-16 lg:py-[71px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[58px]">
          <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] mb-10">
            Industries We Serve
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {INDUSTRIES.map(({ name, slug, image, description }) => (
              <Link
                key={slug}
                href={`/industries/${slug}`}
                className="group bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <span className="text-navy-900 text-[18px] font-semibold tracking-[0.36px]">
                    {name}
                  </span>
                  <p className="text-gray-500 text-[15px] leading-[22px] tracking-[0.3px]">
                    {description}
                  </p>
                  <span className="text-teal-500 text-[14px] font-medium tracking-[0.7px] mt-1 inline-flex items-center gap-1">
                    Shop Industry <AnimatedArrow size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Facilities Choose MD Supplies ── */}
      <section className="bg-navy-900 py-16 lg:py-[100px] overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[59px]">
          <h2 className="text-white text-[28px] font-semibold tracking-[0.56px] text-center mb-14">
            Why Facilities Choose MD Supplies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/20">
            {[
              { icon: <Truck size={24} className="text-teal-300" />,    title: "Fast Shipping",    desc: "Fast, reliable fulfillment on every order — so your facility never runs short." },
              { icon: <BadgeCheck size={24} className="text-teal-300" />,   title: "Trusted Brands",  desc: "We stock only industry-leading clinical brands with full ISO certifications." },
              { icon: <Headset size={24} className="text-teal-300" />, title: "Dedicated Support",   desc: "Expert account managers for every facility to handle complex procurement needs." },
            ].map(({ icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center text-center gap-5 px-8 sm:px-12 py-10 sm:py-0">
                  <div className="w-[50px] h-[50px] rounded-[12px] bg-[rgba(0,193,255,0.2)] flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <h3 className="text-[#f9fafc] text-[16px] font-bold leading-[1.3]">{title}</h3>
                  <p className="text-[rgba(255,255,255,0.65)] text-[14px] leading-[1.65]">{desc}</p>
                </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
