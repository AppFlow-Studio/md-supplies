import type { Metadata } from 'next'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS } from '@/lib/shopify/queries/products'
import { slugifyVendor } from '@/lib/brands'
import type { CollectionProduct } from '@/lib/shopify/types'
import { BrandDirectory } from './BrandDirectory'
import Image from 'next/image'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Shop by Brand | MD Supplies',
  description: 'Browse all medical supply brands available at wholesale prices.',
}

const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/724def33-709c-4f45-b49a-f70c80889cdd'

const PROTOCOL_ITEMS = [
  {
    title: 'FDA Compliant',
    description: 'Every product we carry meets FDA compliance standards — so you can procure with confidence.',
    src: '/icons/protocol-1.svg'
  },
  {
    title: 'ISO Certified',
    description: 'We stock only industry-leading clinical brands with full ISO certifications.',
    src: '/icons/protocol-2.svg'
  },
  {
    title: 'Dedicated Support',
    description: 'Expert account managers for every facility to handle complex procurement needs.',
    src: '/icons/protocol-3.svg'
  },
]

export default async function BrandsPage() {
  const data = await storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(
    GET_PRODUCTS,
    { first: 250 },
  )

  const vendorMap = new Map<string, number>()
  for (const p of data.products.nodes) {
    if (p.vendor) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) ?? 0) + 1)
  }

  const brands = Array.from(vendorMap.entries())
    .map(([vendor, count]) => ({ vendor, count, slug: slugifyVendor(vendor) }))
    .sort((a, b) => a.vendor.localeCompare(b.vendor))

  return (
    <main className="bg-neutral-100">

      {/* ── Hero ── */}
      <section className="relative bg-white overflow-hidden">

        {/* Mobile: text first, image below */}
        <div className="lg:hidden px-4 sm:px-8 pt-8 pb-0">
          <span className="text-teal-500 text-[12px] font-semibold tracking-[0.24px] uppercase mb-3 block">
            Shop by Brand
          </span>
          <h1 className="text-navy-900 text-[28px] font-semibold leading-[1.2] tracking-tight mb-3">
            Clinical Standards from Global Leaders
          </h1>
          <p className="text-gray-500 text-[16px] leading-[26px] mb-6">
            Whether you run an urgent care clinic, HRT practice, or home health agency — we stock the products you need with same-day shipping and wholesale pricing.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Medical supplies"
            className="w-full aspect-[4/3] object-cover"
          />
        </div>

        {/* Desktop: text card left, image right (absolute) */}
        <div className="hidden lg:flex relative min-h-[580px] items-center">
          <div className="absolute inset-0 left-[38%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt="Medical supplies"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative z-10 bg-white ml-[59px] w-[55vw] px-14 py-14">
            <span className="inline-block text-teal-500 text-[12px] font-semibold tracking-[0.24px] uppercase mb-4">
              Shop by Brand
            </span>
            <h1 className="text-navy-900 text-[50px] font-semibold leading-[1.2] tracking-tight mb-6 max-w-[600px]">
              Clinical Standards<br />from Global Leaders
            </h1>
            <p className="text-gray-500 text-[18px] leading-[30px] max-w-[516px]">
              Whether you run an urgent care clinic, HRT practice, or home health agency — we stock the products you need with same-day shipping and wholesale pricing.
            </p>
          </div>
        </div>

      </section>

      {/* ── Brand Directory ── */}
      <section className="bg-neutral-100 py-12 lg:py-[66px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[57px]">
          {brands.length === 0 ? (
            <p className="text-gray-500 text-[15px] py-12">No brands available yet.</p>
          ) : (
            <BrandDirectory brands={brands} />
          )}
        </div>
      </section>

      {/* ── Clinical Curator Protocol ── */}
      <section className="bg-navy-900 py-16 lg:py-[100px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[59px]">
          <h2 className="text-white text-[28px] font-semibold tracking-[0.56px] text-center mb-14">
            The Clinical Curator Protocol
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-0 relative">
            {PROTOCOL_ITEMS.map((item, i) => (
              <div key={item.title} className="flex flex-col items-center text-center px-4 lg:px-12 relative">
                <div className="bg-[rgba(0,193,255,0.2)] rounded-[12px] w-[50px] h-[50px] mb-6 flex items-center justify-center">
                  <Image src={item.src} alt='icon' width={100} height={100} className='size-6'/>
                </div>
                <span className="text-white text-[16px] font-bold tracking-[0.32px] mb-3">
                  {item.title}
                </span>
                <p className="text-white text-[14px] leading-[1.6] tracking-[0.28px] max-w-[324px]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
