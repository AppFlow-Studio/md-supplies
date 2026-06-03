import Link from 'next/link'
import type { OCCHub } from '@/types/occ'
import { FeaturedProductCard } from './FeaturedProductCard'
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
    <main id="main-content" className="bg-[#f9fafc]">
      <WebPageSchema
        name={hub.seoTitle || hub.title}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Solutions', item: `${SITE_URL}/solutions` },
          { name: 'OCC', item: pageUrl },
        ]}
      />

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li className="text-gray-500">Solutions</li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold">OCC</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">{hub.title}</h1>
          <p className="text-base text-gray-500 leading-relaxed max-w-[720px]">{hub.intro}</p>
        </div>

        {/* Program explanation */}
        <section className="mb-12 bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-navy-900 mb-4">What is the OCC Program?</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{hub.programExplanation}</p>
          {hub.freeShippingMessage && (
            <div className="mt-5 flex items-start gap-3 bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
              <span className="text-teal-500 font-bold text-base leading-none mt-0.5">✓</span>
              <p className="text-sm text-teal-500 font-medium">{hub.freeShippingMessage}</p>
            </div>
          )}
        </section>

        {/* Eligible categories */}
        {hub.eligibleCategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">OCC-Eligible Categories</h2>
            <div className="flex flex-wrap gap-2">
              {hub.eligibleCategories.map((cat) => (
                <a
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Eligible products */}
        {hub.eligibleProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-6">OCC-Eligible Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {hub.eligibleProducts.map((p) => (
                <FeaturedProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* FAQ — renders nothing + no schema if no data */}
        <FAQSection faq={hub.faq} />
      </div>
    </main>
  )
}
