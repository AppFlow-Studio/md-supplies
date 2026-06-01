import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Partners | MD Supplies',
  description: 'Our network of trusted medical supply manufacturers and partners.',
}

const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/47a5d306-8846-4a5e-8cbe-637497fa0d5f'

const MANUFACTURERS = [
  {
    name: 'AD Surgical',
    logo: 'https://www.figma.com/api/mcp/asset/4d211a7e-3e2d-482b-b268-049c0dc35f1d',
    description: 'Leading provider of surgical sutures, wound closure, and procedure kits.',
    vendorSlug: 'ad-surgical',
  },
  {
    name: 'CorDx',
    logo: 'https://www.figma.com/api/mcp/asset/f2e636c8-b927-4958-affc-8295113e46eb',
    description: 'Advanced rapid diagnostic testing solutions for clinical and point-of-care settings.',
    vendorSlug: 'cordx',
  },
  {
    name: 'Dukal',
    logo: 'https://www.figma.com/api/mcp/asset/4bbc2824-c03f-4140-a711-dcd68a0ae83c',
    description: 'High-quality disposable medical products for wound care, exam, and procedure use.',
    vendorSlug: 'dukal',
  },
  {
    name: 'Dynarex',
    logo: 'https://www.figma.com/api/mcp/asset/9be75c1a-8c01-4f7a-b8be-3e2dd9e7394b',
    description: 'Dependable general medical products trusted by healthcare providers nationwide.',
    vendorSlug: 'dynarex',
  },
  {
    name: 'Kadara',
    logo: 'https://www.figma.com/api/mcp/asset/3fb72131-7f56-4a4f-a957-b4514328a056',
    description: 'Innovative medical supply solutions focused on quality and clinical performance.',
    vendorSlug: 'kadara',
  },
  {
    name: 'Kemp USA',
    logo: 'https://www.figma.com/api/mcp/asset/b6a933b7-25a0-42d1-9d5f-7b57645aa7cb',
    description: 'Professional-grade medical equipment and emergency response supplies.',
    vendorSlug: 'kemp-usa',
  },
  {
    name: 'Graham Field',
    logo: 'https://www.figma.com/api/mcp/asset/53849f7d-ddfa-4ced-a73a-50852f5ba079',
    description: 'Comprehensive durable medical equipment and rehabilitation solutions.',
    vendorSlug: 'graham-field',
  },
  {
    name: 'Medline',
    logo: 'https://www.figma.com/api/mcp/asset/08caea44-525a-465d-a54e-e106f6187252',
    description: 'One of the largest manufacturers and distributors of healthcare supplies in the US.',
    vendorSlug: 'medline',
  },
  {
    name: 'Systems',
    logo: 'https://www.figma.com/api/mcp/asset/3c94a7b1-9ea8-428e-98c5-0435281fc221',
    description: 'Integrated medical supply systems for streamlined clinical procurement.',
    vendorSlug: 'systems',
  },
  {
    name: 'Philip Scalice',
    logo: 'https://www.figma.com/api/mcp/asset/bb9317f3-5696-44df-937a-d4332c3dc27d',
    description: 'Specialty medical supplies and instruments for clinical and surgical use.',
    vendorSlug: 'philip-scalice',
  },
  {
    name: 'TrueCare',
    logo: 'https://www.figma.com/api/mcp/asset/4890765a-143f-4e74-a4c3-63b72f7552ab',
    description: 'Patient-centered wound care and disposable medical supply solutions.',
    vendorSlug: 'truecare',
  },
  {
    name: 'Vive Health',
    logo: 'https://www.figma.com/api/mcp/asset/b3a36538-5ff0-4d25-a6da-75ebb915429a',
    description: 'Daily living aids, mobility equipment, and home health supplies.',
    vendorSlug: 'vive-health',
  },
]

export default function PartnersPage() {
  return (
    <main className="bg-neutral-100">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-neutral-100 min-h-[580px] lg:min-h-[660px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[59px] py-14 lg:py-0 lg:h-[810px] flex flex-col lg:flex-row items-start">

          {/* Right hero image (full bleed) */}
          <div className="hidden lg:block absolute right-0 top-0 w-[1170px] h-[716px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt="Medical facility warehouse"
              className="w-full h-full object-cover"
            />
          </div>

          {/* White overlay card */}
          <div className="hidden lg:block absolute left-[240px] top-[312px] w-[662px] h-[498px] bg-white z-10" />

          {/* Left text — sits on top of white card */}
          <div className="relative z-20 flex flex-col gap-6 lg:pt-[360px]">
            <div className="inline-flex items-center self-start">
              <div className="bg-[rgba(0,193,255,0.2)] rounded-[20px] px-4 py-2">
                <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px]">
                  PARTNERS
                </span>
              </div>
            </div>

            <h1 className="text-navy-900 text-[40px] lg:text-[50px] font-semibold leading-[1.2] tracking-tight max-w-[600px]">
              Trusted Partner<br />Network
            </h1>

            <p className="text-gray-500 text-[18px] leading-[30px] max-w-[516px]">
              MDSupplies &amp; Partners, Inc. partners with top manufacturers and vendors to provide a comprehensive selection of medical supplies. We specialize in serving healthcare practices, hospitals, urgent care centers, schools, charities, and individual consumers with high-quality, reliable products.
            </p>
          </div>
        </div>
      </section>

      {/* ── Our Manufacturers ── */}
      <section className="bg-neutral-100 py-14 lg:py-[104px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[61px]">
          <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] mb-10">
            Our Manufacturers
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MANUFACTURERS.map(({ name, logo, description, vendorSlug }) => (
              <div key={name} className="bg-white flex flex-col p-6 gap-4">
                {/* Logo */}
                <div className="h-[57px] flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt={name}
                    className="max-h-full max-w-[210px] object-contain"
                  />
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200" />

                {/* Description */}
                <p className="text-gray-500 text-[15px] leading-[22px] tracking-[0.3px] flex-1">
                  {description}
                </p>

                <Link
                  href={`/brands/${vendorSlug}`}
                  className="text-teal-500 text-[13px] font-medium tracking-[0.26px] hover:underline"
                >
                  View Products →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Become a Partner CTA ── */}
      <section className="bg-navy-900 py-16 lg:py-[112px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[59px] flex flex-col items-center text-center gap-6">
          <h2 className="text-white text-[35px] font-semibold tracking-tight">
            Become a partner
          </h2>
          <p className="text-white text-[15px] leading-[30px] tracking-[0.3px] max-w-[585px]">
            Join our curated ecosystem of global manufacturers and healthcare institutions. We provide the infrastructure for growth and the network for clinical impact.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link
              href="/contact?type=manufacturer"
              className="bg-white text-navy-900 text-[18px] font-semibold px-8 h-[59px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
            >
              Manufacturer Inquiry
            </Link>
            <Link
              href="/contact?type=provider"
              className="border border-white text-white text-[18px] font-semibold px-8 h-[59px] flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              Provider Enrollment
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
