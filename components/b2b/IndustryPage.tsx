import Link from 'next/link'
import type { Industry } from '@/types/industry'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { ViewItemListTracker } from '@/components/category/ViewItemListTracker'
import { FAQSection } from './FAQSection'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  industry: Industry
}

export function IndustryPage({ industry }: Props) {
  const pageUrl = `${SITE_URL}/industries/${industry.slug}`
  const pageTitle = `${industry.name} Supplies`
  const pageDescription = industry.seoDescription || industry.intro

  return (
    <main id="main-content" className="bg-[#f9fafc]">
      <WebPageSchema
        name={industry.seoTitle || pageTitle}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { label: 'Industries', href: '/industries' },
          { label: industry.name },
        ]}
        currentUrl={pageUrl}
      />

      {/* Hero image */}
      {industry.heroImage && (
        <div className="bg-navy-900 overflow-hidden h-[200px] sm:h-[280px] relative">
          <img
            src={industry.heroImage.url}
            alt={industry.heroImage.altText}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-end pb-8">
            <p className="text-white/60 text-sm mb-2">Industries</p>
            <h1 className="text-white text-[26px] sm:text-[36px] font-bold leading-tight">
              {pageTitle}
            </h1>
          </div>
        </div>
      )}

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li className="text-gray-500">Industries</li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold">{industry.name}</li>
          </ol>
        </nav>

        {/* H1 only when no hero image (hero already shows H1) */}
        {!industry.heroImage && (
          <h1 className="text-3xl font-bold text-navy-900 mb-6">{pageTitle}</h1>
        )}

        {/* Intro */}
        <div className="mb-12">
          <p className="text-base text-gray-500 leading-relaxed max-w-[720px]">{industry.intro}</p>
          {industry.buyerType && (
            <p className="text-sm text-gray-400 leading-relaxed max-w-[720px] mt-2 italic">
              Typical buyers: {industry.buyerType}
            </p>
          )}
        </div>

        {/* Categories + subcategories */}
        {industry.relevantCategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Product Categories</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {industry.relevantCategories.map((cat) => (
                <a
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </a>
              ))}
            </div>
            {industry.relevantSubcategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {industry.relevantSubcategories.map((sub) => (
                  <a
                    key={sub.handle}
                    href={`/category/${sub.handle}`}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-500 hover:border-teal-500 hover:text-teal-500 transition-colors"
                  >
                    {sub.title}
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Products */}
        {industry.relevantProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Popular Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
              <ViewItemListTracker
                products={industry.relevantProducts}
                itemListId={`industry-${industry.slug}-featured`}
                itemListName={`${industry.name} Featured Products`}
              />
              {industry.relevantProducts.map((product, index) => (
                <ShopifyProductCard
                  key={product.id}
                  product={product}
                  itemListId={`industry-${industry.slug}-featured`}
                  itemListName={`${industry.name} Featured Products`}
                  index={index}
                  imagePriority={index < 3}
                />
              ))}
            </div>
          </section>
        )}

        {/* Related guides */}
        {industry.relatedGuides.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Related Guides</h2>
            <ul className="space-y-2">
              {industry.relatedGuides.map((guide) => (
                <li key={guide.slug}>
                  <a
                    href={`/blog/${guide.slug}`}
                    className="text-teal-500 hover:text-navy-900 text-sm font-medium transition-colors"
                  >
                    {guide.title} →
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <div className="mb-12">
          <a
            href={industry.ctaLink}
            className="inline-flex items-center px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-colors"
          >
            {industry.ctaText}
          </a>
        </div>

        {/* FAQ — renders nothing + no schema if no data */}
        <FAQSection faq={industry.faq} />
      </div>
    </main>
  )
}
