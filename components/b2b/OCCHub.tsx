import Link from 'next/link'
import type { OCCHub } from '@/types/occ'
import { AnimatedOCCHeroSection } from './AnimatedOCCHeroSection'
import { AnimatedOCCProducts } from './AnimatedOCCProducts'
import { FAQSection } from './FAQSection'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  hub: OCCHub
}

export function OCCHubPage({ hub }: Props) {
  const pageUrl = `${SITE_URL}/solutions/occ`
  const pageDescription = hub.seoDescription || hub.intro

  return (
    <main id="main-content">
      <WebPageSchema
        name={hub.seoTitle || hub.title}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home',      item: SITE_URL                },
          { name: 'Solutions', item: `${SITE_URL}/solutions` },
          { name: 'OCC',       item: pageUrl                 },
        ]}
      />

      {/* ── Hero ── */}
      <section className="w-full bg-[#f9fafc] overflow-x-hidden">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24">
          <AnimatedOCCHeroSection
            title={hub.title}
            intro={hub.intro}
            programExplanation={hub.programExplanation}
            freeShippingMessage={hub.freeShippingMessage}
          />
        </div>
      </section>

      {/* ── Below-hero sections ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">

        {/* Eligible categories */}
        {hub.eligibleCategories.length > 0 && (
          <section className="py-12 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-5">OCC-Eligible Categories</h2>
            <div className="flex flex-wrap gap-2">
              {hub.eligibleCategories.map((cat) => (
                <Link
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Eligible products */}
        {hub.eligibleProducts.length > 0 && (
          <section className="py-12 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-6">OCC-Eligible Products</h2>
            <AnimatedOCCProducts products={hub.eligibleProducts} />
          </section>
        )}

        {/* FAQ */}
        <FAQSection faq={hub.faq} />

      </div>
    </main>
  )
}
