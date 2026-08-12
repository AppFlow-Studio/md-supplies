import Link from 'next/link'
import { CatalogHero } from '@/components/category/CatalogHero'
import { DEFAULT_HERO_FOCAL } from '@/lib/category-images'
import { CategoryResults } from '@/components/category/CategoryResults'
import { FAQSection } from '@/components/b2b/FAQSection'
import { ROUTES } from '@/lib/routes'
import type { Industry } from '@/lib/industries'
import { SUPPORTED_INDUSTRIES } from '@/lib/industries'
import type { CategorySearchParams } from '@/components/category/CategoryPageView'
import type { PageSize } from '@/lib/catalog/page-size'

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
  /** Validated ?per_page= value. */
  pageSize: PageSize
  /** Answer-first SEO copy from the industry SEO database. */
  seoAnswer?: string
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
  pageSize,
  seoAnswer,
}: IndustryLandingProps) {
  const industryUrl = `/industries/${industry.slug}`
  const related = SUPPORTED_INDUSTRIES.filter((i) => i.slug !== industry.slug).slice(0, 4)

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      {/* Same hero as the 25 category pages. The industry hero previously had
          NO image at all, even though every industry card already ships one
          (lib/industries.ts `image`), and no breadcrumb/description/artwork
          consistency with the category routes. CTAs stay — they are the point
          of a paid-traffic landing page. */}
      <CatalogHero
        breadcrumb={[{ label: 'Industries', href: '/industries' }, { label: industry.name }]}
        title={industry.h1}
        description={industry.description}
        // Answer-first SEO copy in the hero itself. This is where the
        // "Shop {industry} Supplies" button used to sit — an anchor to
        // #industry-products, i.e. a jump to the grid further down the SAME
        // page, which gave a visitor nothing they could not get by scrolling
        // and gave a crawler a self-referential link. Real copy earns the space.
        answer={seoAnswer}
        // Industry heroes lead with photography of the setting, so the artwork
        // gets a wider column than the product-shot category heroes.
        image={{ path: industry.image, alt: `${industry.name} supplies`, focalPosition: DEFAULT_HERO_FOCAL }}
        imageEmphasis
        actions={
          <Link
            href="/contact"
            className="inline-flex items-center min-h-[48px] px-6 bg-navy-900 text-white text-[16px] font-semibold hover:bg-navy-950 transition-colors"
          >
            Request a Quote
          </Link>
        }
      />

      {/* Full scoped catalogue — the same engine as category and OCC pages. */}
      <div id="industry-products" className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4 scroll-mt-[88px] lg:scroll-mt-[168px]">
        <CategoryResults
          source={{ kind: 'tag', query: `tag:"${tag}"`, title: industry.name, slug: industry.slug }}
          baseUrl={industryUrl}
          // Industry SLUG against the INDUSTRY registry. This used to pass
          // `industry.collectionHandle` into the category registry, where four
          // of the five slugs have no entry at all (urgent-care, hrt-clinics,
          // home-health, clinics-doctors-offices, pharmacies are not collection
          // handles) — so those pages silently fell through to the bare default
          // set and showed almost no filters.
          facetKey={industry.slug}
          facetKind="industry"
          pageSize={pageSize}
          cacheTags={['shopify', 'products', 'category-tree', tag]}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
          searchQuery={searchQuery}
          searchScopeTitle={`${industry.name} Supplies`}
          tabsAllLabel={`All ${industry.name}`}
        />
      </div>

      {/* Curated category links — crawlable anchors to the category hubs this
          industry draws from. The in-page subcategory control is now the
          Category-facet tab row above the grid, which filters this industry's
          product set in place; these links go to the category pages themselves,
          which is a different job, so both are kept. */}
      {categoryLinks.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Categories for {industry.name}
          </h2>
          <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
            {categoryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center min-h-[44px] border border-gray-200 bg-white text-navy-900 text-[14px] px-4 hover:border-navy-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
