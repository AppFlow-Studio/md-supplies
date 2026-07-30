import Link from 'next/link'
import type { OCCHub } from '@/types/occ'
import { AnimatedOCCHeroSection } from './AnimatedOCCHeroSection'
import { AnimatedOCCProducts } from './AnimatedOCCProducts'
import { FAQSection } from './FAQSection'
import { WholesalePricing } from '@/components/home/WholesalePricing'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  hub: OCCHub
  /**
   * DEV-OCC-01: the complete canonical OCC catalog (grid + filters + search +
   * sort + pagination), rendered below the clearly-labeled featured block so
   * featured items never masquerade as the full assortment.
   */
  catalog?: React.ReactNode
}

export function OCCHubPage({ hub, catalog }: Props) {
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
          { label: 'Solutions', href: '/solutions' },
          { label: 'OCC' },
        ]}
        currentUrl={pageUrl}
      />

      {/* ── Hero ── */}
      <section className="w-full bg-[#f9fafc] overflow-x-hidden">
        {/* Server-rendered text: always present in initial HTML for crawlers and screen readers */}
        <div className="sr-only">
          <p>{hub.title}</p>
          <p>{hub.intro}</p>
          <h2>About the OCC Collection</h2>
          <p>{hub.programExplanation}</p>
          <p>{hub.freeShippingMessage}</p>
        </div>
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 my-16 md:my-20 lg:my-24">
          <AnimatedOCCHeroSection
            title={hub.title}
            description={hub.intro}
            programExplanation={hub.programExplanation}
            freeShippingMessage={hub.freeShippingMessage}
          />
        </div>
      </section>

      {/* ── Below-hero sections ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">

        {/* Eligible categories */}
        {hub.eligibleCategories.length > 0 && (
          <section className="py-12">
            <h2 className="text-xl font-bold text-navy-900 mb-5">Shop by Category</h2>
            {/* Server-rendered crawlable category navigation (plan §3.1) —
                real anchors in semantic nav/list markup, distinct from the
                attribute filters in the catalog below. */}
            <nav aria-label="OCC categories">
              <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                {hub.eligibleCategories.map((cat) => (
                  <li key={cat.handle}>
                    <Link
                      href={`/category/${cat.handle}`}
                      className="inline-flex items-center min-h-[44px] px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                    >
                      {cat.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>
        )}

        {/* Eligible products — clearly labeled featured block; the complete
            catalog renders below it. */}
        {hub.eligibleProducts.length > 0 && (
          <section className="py-12 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Featured OCC Shoebox Supplies</h2>
            <AnimatedOCCProducts products={hub.eligibleProducts} />
          </section>
        )}

        {/* Complete canonical OCC catalog */}
        {catalog && (
          <section className="py-12 border-t border-gray-200" id="all-occ-products">
            <h2 className="text-xl font-bold text-navy-900 mb-6">All OCC Products</h2>
            <div className="flex gap-0 items-start">{catalog}</div>
          </section>
        )}

        {/* FAQ */}
        <FAQSection faq={hub.faq} />

      </div>

      {/* Buyer CTA */}
      <WholesalePricing />
    </main>
  )
}
