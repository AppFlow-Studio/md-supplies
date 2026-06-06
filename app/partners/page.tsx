import Link from 'next/link'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { FadeIn } from '@/components/ui/FadeIn'
import { ManufacturersGrid } from '@/components/b2b/ManufacturersGrid'

export const metadata = buildMetadata({
  pageType: 'partners',
  description: 'Our network of trusted medical supply manufacturers and partners.',
})

const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/7e97ac3a-09ed-42db-96c5-a2d21b722527'

const MANUFACTURERS = [
  {
    name: 'AD Surgical',
    logo: 'https://www.figma.com/api/mcp/asset/8c489793-5cbe-4f61-8fcd-19ba4119eec9',
    description: 'Leading provider of surgical sutures, wound closure, and procedure kits.',
    vendorSlug: 'ad-surgical',
  },
  {
    name: 'CorDx',
    logo: 'https://www.figma.com/api/mcp/asset/2ff04940-2487-4aa4-8daa-1f440301fc04',
    description: 'Advanced rapid diagnostic testing solutions for clinical and point-of-care settings.',
    vendorSlug: 'cordx',
  },
  {
    name: 'Dukal',
    logo: 'https://www.figma.com/api/mcp/asset/0d3ad4a5-6272-46a4-8120-e7e86dee0773',
    description: 'High-quality disposable medical products for wound care, exam, and procedure use.',
    vendorSlug: 'dukal',
  },
  {
    name: 'Dynarex',
    logo: 'https://www.figma.com/api/mcp/asset/40c82316-c043-4b64-8be8-585ed3276f96',
    description: 'Dependable general medical products trusted by healthcare providers nationwide.',
    vendorSlug: 'dynarex',
  },
  {
    name: 'Kadara',
    logo: 'https://www.figma.com/api/mcp/asset/57a084ab-54d3-4aac-bbb6-2230b7945506',
    description: 'Innovative medical supply solutions focused on quality and clinical performance.',
    vendorSlug: 'kadara',
  },
  {
    name: 'Kemp USA',
    logo: 'https://www.figma.com/api/mcp/asset/4feee5b9-fc58-439f-9232-841240db91f2',
    description: 'Professional-grade medical equipment and emergency response supplies.',
    vendorSlug: 'kemp-usa',
  },
  {
    name: 'Graham Field',
    logo: 'https://www.figma.com/api/mcp/asset/1a1a19d2-e56f-4f27-9b46-e2cc7fffc8df',
    description: 'Comprehensive durable medical equipment and rehabilitation solutions.',
    vendorSlug: 'graham-field',
  },
  {
    name: 'Medline',
    logo: 'https://www.figma.com/api/mcp/asset/9f893490-1d51-45bf-ba02-a012f9d5a8b3',
    description: 'One of the largest manufacturers and distributors of healthcare supplies in the US.',
    vendorSlug: 'medline',
  },
  {
    name: 'Systems',
    logo: 'https://www.figma.com/api/mcp/asset/bd49eacf-6f92-4512-b5fd-c795d35acbd2',
    description: 'Integrated medical supply systems for streamlined clinical procurement.',
    vendorSlug: 'systems',
  },
  {
    name: 'Philip Scalice',
    logo: 'https://www.figma.com/api/mcp/asset/4f85d0fb-edfb-44c7-93d8-11f795a75e52',
    description: 'Specialty medical supplies and instruments for clinical and surgical use.',
    vendorSlug: 'philip-scalice',
  },
  {
    name: 'TrueCare',
    logo: 'https://www.figma.com/api/mcp/asset/35a25913-e45f-40fb-bed3-02bfccad6b4e',
    description: 'Patient-centered wound care and disposable medical supply solutions.',
    vendorSlug: 'truecare',
  },
  {
    name: 'Vive Health',
    logo: 'https://www.figma.com/api/mcp/asset/0b4afb00-deb5-4dc9-8a3e-bef93ff6f60d',
    description: 'Daily living aids, mobility equipment, and home health supplies.',
    vendorSlug: 'vive-health',
  },
]

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
        <ManufacturersGrid manufacturers={MANUFACTURERS} />
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
