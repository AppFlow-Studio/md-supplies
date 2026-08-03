import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { CategoryResults } from '@/components/category/CategoryResults'
import { SubcategoryNavigator } from '@/components/category/SubcategoryNavigator'
import { FAQSection } from '@/components/b2b/FAQSection'
import { ROUTES } from '@/lib/routes'
import type { Industry } from '@/lib/industries'
import { SUPPORTED_INDUSTRIES } from '@/lib/industries'
import type { CategorySearchParams } from '@/components/category/CategoryPageView'

/**
 * Industry landing page — an ecommerce/Google-Ads destination, not a brochure.
 *
 * The previous page was hero → description → one category chip → six "Popular
 * Products" → FAQ. Six manually-picked products is not a shoppable page for an
 * industry with thousands of SKUs, and it gave paid traffic nowhere to go.
 *
 * This renders the SAME product-discovery system as category and OCC pages
 * (scoped search, approved filters, result count, sort, grid, pagination,
 * chips, mobile drawer), so industry pages cannot drift into a separate,
 * lower-quality experience.
 *
 * Ordering is deliberate for CRO: intent-matched copy is short and above the
 * grid; the long buying guide sits BELOW the merchandise. Paid visitors reach
 * products without scrolling through SEO copy, and organic visitors still get
 * the depth.
 */

export type IndustryLandingProps = {
  industry: Industry
  /** Resolved industry-scoped tag, e.g. `industry:urgent-care`. */
  tag: string
  sp: CategorySearchParams
  sortKey: string
  reverse: boolean
  searchQuery?: string
  activeFilterStrings: string[]
  currentPage: number
  /** Curated, verified category links — only categories with real products. */
  categoryLinks: { label: string; href: string }[]
  /** Longer-form guide rendered below the grid. */
  buyingGuide?: { heading: string; body: string }[]
}

export function IndustryLandingPage({
  industry,
  tag,
  sp,
  sortKey,
  reverse,
  searchQuery,
  activeFilterStrings,
  currentPage,
  categoryLinks,
  buyingGuide = [],
}: IndustryLandingProps) {
  const industryUrl = `/industries/${industry.slug}`
  const related = SUPPORTED_INDUSTRIES.filter((i) => i.slug !== industry.slug).slice(0, 4)

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb
          items={[{ label: 'Industries', href: '/industries' }, { label: industry.name }]}
        />
      </div>

      {/* Compact, intent-matched hero. No oversized image panel, no unsupported
          numbers — the H1 mirrors the ad-group intent and the CTAs are the
          first thing a paid visitor sees. */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
        <h1 className="text-navy-900 text-[28px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.15] tracking-[-0.01em] mb-2">
          {industry.name} Supplies
        </h1>
        <p className="text-gray-600 text-[16px] leading-[1.6] max-w-[720px]">
          {industry.description}
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <a
            href="#industry-products"
            className="inline-flex items-center min-h-[48px] px-6 bg-navy-900 text-white text-[16px] font-semibold hover:bg-navy-950 transition-colors"
          >
            Shop {industry.name} Supplies
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center min-h-[48px] px-6 border border-navy-900 text-navy-900 text-[16px] font-semibold hover:bg-white transition-colors"
          >
            Request a Quote
          </Link>
        </div>
      </div>

      {/* Procurement points. Verified capabilities only — no shipping-speed,
          inventory or facility-count claims (lib/claims.ts governs those). */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 list-none m-0 p-0 text-[14px] text-gray-600">
          <li>Account support for {industry.buyerType.toLowerCase()}</li>
          <li>Bulk and repeat ordering</li>
          <li>Secure online checkout</li>
        </ul>
      </div>

      {/* Curated category links — crawlable anchors, only categories that
          actually carry products for this industry. */}
      {categoryLinks.length > 0 && (
        <SubcategoryNavigator
          items={categoryLinks}
          allHref={industryUrl}
          allLabel={`All ${industry.name}`}
          allActive
          ariaLabel={`${industry.name} product categories`}
        />
      )}

      {/* Full scoped catalogue — the same engine as category and OCC pages. */}
      <div id="industry-products" className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4 flex gap-0 items-start scroll-mt-[140px]">
        <CategoryResults
          source={{ kind: 'tag', query: `tag:"${tag}"`, title: industry.name, slug: industry.slug }}
          baseUrl={industryUrl}
          facetKey={industry.collectionHandle}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
          searchQuery={searchQuery}
          searchScopeTitle={`${industry.name} Supplies`}
        />
      </div>

      {/* Buying guide BELOW the products (CRO): depth for organic without
          pushing merchandise down for paid. */}
      {buyingGuide.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[20px] font-semibold mb-4">
            Choosing {industry.name} supplies
          </h2>
          <div className="flex flex-col gap-5 max-w-[880px]">
            {buyingGuide.map((section) => (
              <div key={section.heading}>
                <h3 className="text-navy-900 text-[16px] font-semibold mb-1">{section.heading}</h3>
                <p className="text-gray-600 text-[15px] leading-[1.7]">{section.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {industry.faq && industry.faq.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <FAQSection faq={industry.faq} />
        </div>
      )}

      {/* Related industries — only genuinely supported ones, so this cannot
          become a doorway network. */}
      {related.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">Other industries we serve</h2>
          <div className="flex flex-wrap gap-3">
            {related.map((i) => (
              <Link
                key={i.slug}
                href={`/industries/${i.slug}`}
                className="inline-flex items-center min-h-[44px] px-4 border border-gray-200 bg-white text-navy-900 text-[14px] hover:border-navy-900 transition-colors"
              >
                {i.name}
              </Link>
            ))}
            <Link
              href={ROUTES.categories}
              className="inline-flex items-center min-h-[44px] px-4 border border-gray-200 bg-white text-navy-900 text-[14px] hover:border-navy-900 transition-colors"
            >
              Browse all categories
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}
