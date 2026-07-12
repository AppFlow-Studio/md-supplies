import Link from 'next/link'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { FadeIn } from '@/components/ui/FadeIn'
import { ManufacturersGrid } from '@/components/b2b/ManufacturersGrid'
import { BrandGrid } from '@/components/brand/BrandGrid'
import { getActivePartners } from '@/lib/partners'
import { BRANDS } from '@/lib/brands'

export const metadata = buildMetadata({
  pageType: 'partners',
  description: 'Our network of trusted medical supply manufacturers and partners.',
})

const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/7e97ac3a-09ed-42db-96c5-a2d21b722527'


export default function PartnersPage() {
  return (
    <main id="main-content" className="bg-[#f9fafc]">
      <WebPageSchema
        name="Our Partners"
        description="Browse MDSupplies brand and vendor partners supplying medical and dental products."
        url={`${SITE_URL}/partners`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Partners', item: `${SITE_URL}/partners` },
        ]}
      />

      {/* ─── Hero ─── */}
      <section className="relative bg-white overflow-hidden">

        {/* Mobile: text first, image below */}
        <div className="lg:hidden px-4 sm:px-8 pt-8 pb-0">
          <FadeIn>
            <span className="inline-block bg-[rgba(0,193,255,0.2)] text-teal-500 text-[12px] font-semibold rounded-full px-4 py-1.5 mb-3 tracking-[0.3px] uppercase">
              Partners
            </span>
            <h1 className="text-[28px] font-bold text-navy-900 leading-[1.2] mb-3">
              Trusted Partner Network
            </h1>
            <p className="text-gray-500 text-[16px] leading-[26px] mb-6">
              MDSupplies &amp; Partners, Inc. partners with top manufacturers and vendors to provide a comprehensive selection of medical supplies.
            </p>
          </FadeIn>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Medical supply warehouse"
            className="w-full aspect-[4/3] object-cover"
            loading="eager"
          />
        </div>

        {/* Desktop: text card left, image right (absolute) */}
        <div className="hidden lg:flex relative min-h-[580px] items-center">
          <div className="absolute inset-0 left-[38%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt="Medical supply warehouse"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
          <div className="relative z-10 bg-white ml-[59px] w-[55vw] px-14 py-14">
            <FadeIn>
              <span className="inline-block bg-[rgba(0,193,255,0.2)] text-teal-500 text-[15px] font-semibold rounded-full px-5 py-2 mb-6 tracking-[0.3px]">
                PARTNERS
              </span>
              <h1 className="text-[50px] font-bold text-navy-900 leading-[1.2] mb-6">
                Trusted Partner<br />Network
              </h1>
              <p className="text-gray-500 text-[18px] leading-[30px] max-w-[516px]">
                MDSupplies &amp; Partners, Inc. partners with top manufacturers and vendors to provide a comprehensive selection of medical supplies. We specialize in serving healthcare practices, hospitals, urgent care centers, schools, charities, and individual consumers with high-quality, reliable products.
              </p>
            </FadeIn>
          </div>
        </div>

      </section>

      {/* ─── Our Manufacturers ─── */}
      <section className="bg-[#f9fafc] px-4 sm:px-8 lg:px-[61px] pt-[80px] lg:pt-[104px] pb-20">
        <FadeIn>
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] mb-10">
            Our Manufacturers
          </h2>
        </FadeIn>
        <ManufacturersGrid
          manufacturers={getActivePartners()
            .map((p) => ({
              name: p.name,
              logo: p.logo.url,
              logoWidth: p.logo.width,
              logoHeight: p.logo.height,
              description: p.description,
              vendorSlug: p.slug,
            }))}
        />
      </section>

      {/* ─── Brands We Carry (full approved list, §6.2) ─── */}
      <section id="brands" className="bg-white px-4 sm:px-8 lg:px-[61px] pt-16 lg:pt-20 pb-20 scroll-mt-24">
        <FadeIn>
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] mb-3">
            Brands We Carry
          </h2>
          <p className="text-gray-500 text-[16px] leading-[26px] max-w-[640px] mb-10">
            {BRANDS.length}+ trusted manufacturers across medical, dental, diagnostic, and
            durable-equipment categories. Select a brand with a dedicated page to shop its products.
          </p>
        </FadeIn>
        <BrandGrid />
      </section>

      {/* ─── Become a Partner CTA ─── */}
      <section className="bg-navy-900 py-[112px] px-8 text-center">
        <FadeIn>
          <h2 className="text-[35px] font-semibold text-[#f9fafc] mb-8 tracking-[0.35px]">
            Become a partner
          </h2>
          <p className="text-white/90 text-[15px] font-normal leading-[30px] max-w-[585px] mx-auto mb-12 tracking-[0.3px]">
            Join our curated ecosystem of global manufacturers and healthcare institutions. We provide the infrastructure for growth and the network for clinical impact.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="bg-white text-navy-900 font-semibold text-[18px] px-[52px] py-[17px] hover:bg-gray-100 transition-colors tracking-[0.36px] whitespace-nowrap"
            >
              Manufacturer Inquiry
            </Link>
            <Link
              href="/contact"
              className="border border-white text-white font-semibold text-[18px] px-[52px] py-[17px] hover:bg-white/10 transition-colors tracking-[0.36px] whitespace-nowrap"
            >
              Provider Enrollment
            </Link>
          </div>
        </FadeIn>
      </section>
    </main>
  )
}
