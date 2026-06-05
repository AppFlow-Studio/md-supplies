import Link from 'next/link'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { getActivePartners } from '@/lib/mock/partners'
import { PartnerDirectory } from '@/components/b2b/PartnerDirectory'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'

export const metadata = buildMetadata({
  pageType: 'partners',
  description: 'Our network of trusted medical supply manufacturers and partners.',
})

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
  const partners = getActivePartners()

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

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-3">Our Partners</h1>
        <p className="text-base text-gray-500 mb-10 max-w-[640px]">
          MDSupplies works with trusted brands and distributors to bring you high-quality medical supplies at wholesale prices.
        </p>
        <PartnerDirectory partners={partners} />
      </div>
    </main>
  )
}
