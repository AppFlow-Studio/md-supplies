import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { getActivePartners } from '@/lib/mock/partners'
import { PartnerDirectory } from '@/components/b2b/PartnerDirectory'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'

export const metadata: Metadata = buildMetadata({ pageType: 'partners' })

export default function PartnersPage() {
  const partners = getActivePartners()

  return (
    <main className="bg-[#f9fafc]">
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
