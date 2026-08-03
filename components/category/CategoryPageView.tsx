import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION_HERO } from '@/lib/shopify/queries/collections'
import type { CollectionHero } from '@/lib/shopify/types'
import { CategoryResults } from '@/components/category/CategoryResults'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { buildCollectionPageSchema, buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { getClusterLinks } from '@/lib/cluster-links'
import { MAX_CATEGORY_PAGE } from '@/lib/category-utils'
import {
  buildL2Tree,
  getSubcategoriesForParent,
  getL1ByCollectionHandle,
  humanizeTag,
  CATEGORY_TREE_L1,
} from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { CategoryHeroImage } from '@/components/shared/CategoryHeroImage'
import { getCategoryBannerConfig } from '@/lib/bunnycdn'
import { isAllowedFilterInput } from '@/lib/filter-registry'
import { withTrackingParams } from '@/lib/analytics/tracking-params'
import { getNonce } from '@/lib/csp-nonce'
import { getCategorySeo } from '@/lib/seo/categorySeo'
import { FAQSection } from '@/components/b2b/FAQSection'
import { SubcategoryNavigator } from '@/components/category/SubcategoryNavigator'

// Server-rendered category view for the single canonical route
// app/category/[slug], which reads searchParams directly. The former
// /category-browse twin and its proxy rewrite were removed in Phase 5: having
// the clean and filtered views on different route segments forced a remount on
// every filter/sort/search interaction.

export type CategorySearchParams = {
  sort?: string
  filter?: string | string[]
  page?: string
  /** DEV-SEARCH-01: collection-scoped search text. */
  q?: string | string[]
}

/** ?q= must be a single sane string; arrays and junk collapse to undefined. */
export function parseSearchParam(q?: string | string[]): string | undefined {
  if (typeof q !== 'string') return undefined
  const trimmed = q.trim()
  return trimmed ? trimmed.slice(0, 80) : undefined
}

// Data cache: 5-minute background revalidate, plus on-demand invalidation from
// the Shopify collections/* webhook via the per-handle tag (app/api/revalidate).
function collectionFetchOptions(slug: string) {
  return { next: { revalidate: 300, tags: ['shopify', 'collections', `collection:${slug}`] } }
}

export function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'COLLECTION_DEFAULT', reverse: false }
  }
}

export function parseFilterParam(filter?: string | string[]): string[] {
  if (!filter) return []
  const raw = Array.isArray(filter) ? filter : [filter]
  // Default-deny URL-supplied inputs (rejects tag filters and unknown keys)
  // before they reach the Storefront API, chips, or pagination links.
  return raw.filter(isAllowedFilterInput)
}

// Beyond MAX_CATEGORY_PAGE the deterministic per-page fetch in CategoryResults
// would need a Storefront `first` larger than the API allows — bounce to
// page 1 instead of erroring, mirroring the fetch-failure fallback there.
function page1RedirectUrl(slug: string, sp: CategorySearchParams, activeFilterStrings: string[]): string {
  const p = new URLSearchParams()
  if (sp.sort) p.set('sort', sp.sort)
  activeFilterStrings.forEach((f) => p.append('filter', f))
  const q = parseSearchParam(sp.q)
  if (q) p.set('q', q)
  withTrackingParams(p, sp)
  const qs = p.toString()
  return qs ? `${ROUTES.category(slug)}?${qs}` : ROUTES.category(slug)
}

export async function buildCategoryMetadata(slug: string, sp: CategorySearchParams): Promise<Metadata> {
  const base = SITE_URL

  const activeFilterStrings = parseFilterParam(sp.filter)
  // Search states are noindex like filtered states (plan §3.5).
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort) || Boolean(parseSearchParam(sp.q))
  const requestedPage = parseInt(sp.page ?? '1', 10)
  const currentPage = requestedPage > MAX_CATEGORY_PAGE ? 1 : requestedPage

  try {
    const data = await storefrontFetch<{ collection: CollectionHero | null }>(
      GET_COLLECTION_HERO,
      { handle: slug },
      collectionFetchOptions(slug),
    )
    if (!data.collection) return buildMetadata({ pageType: 'category', title: 'Category' })
    const { title, description, seo } = data.collection
    const metaTitle = seo?.title || title
    const metaDescription = seo?.description || (description ? trimDescription(description, 155) : undefined)

    if (isFiltered) {
      return buildMetadata({
        pageType: 'category',
        title: metaTitle,
        description: metaDescription,
        canonical: `${base}/category/${slug}`,
        noIndex: true,
        image: data.collection.image?.url,
        imageWidth: data.collection.image?.width,
        imageHeight: data.collection.image?.height,
      })
    }

    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'category',
        title: metaTitle,
        description: metaDescription,
        canonical: `${base}/category/${slug}?page=${currentPage}`,
        image: data.collection.image?.url,
        imageWidth: data.collection.image?.width,
        imageHeight: data.collection.image?.height,
      })
    }

    // Unfiltered page 1: use SEO database values when available.
    const seoDB = getCategorySeo(slug)
    if (seoDB) {
      const base = buildMetadata({
        pageType: 'category',
        slug,
        description: seoDB.metaDescription,
        image: data.collection.image?.url,
        imageWidth: data.collection.image?.width,
        imageHeight: data.collection.image?.height,
      })
      const og = (base.openGraph ?? {}) as Record<string, unknown>
      return {
        ...base,
        title: seoDB.title,
        description: seoDB.metaDescription,
        openGraph: { ...og, title: seoDB.title, description: seoDB.metaDescription },
      }
    }

    return buildMetadata({
      pageType: 'category',
      title: metaTitle,
      slug,
      description: metaDescription,
      image: data.collection.image?.url,
      imageWidth: data.collection.image?.width,
      imageHeight: data.collection.image?.height,
    })
  } catch {
    return buildMetadata({ pageType: 'category', title: 'Category' })
  }
}

export async function CategoryPageView({ slug, sp }: { slug: string; sp: CategorySearchParams }) {
  const nonce = await getNonce()
  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const searchQuery = parseSearchParam(sp.q)
  const currentPage = parseInt(sp.page ?? '1', 10)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort) || Boolean(searchQuery)

  if (isNaN(currentPage) || currentPage < 1) notFound()
  if (currentPage > MAX_CATEGORY_PAGE) redirect(page1RedirectUrl(slug, sp, activeFilterStrings))

  const l1 = getL1ByCollectionHandle(slug)

  const [data, summaries] = await Promise.all([
    storefrontFetch<{ collection: CollectionHero | null }>(
      GET_COLLECTION_HERO,
      { handle: slug },
      collectionFetchOptions(slug),
    ),
    fetchProductTagSummaries(),
  ])

  if (!data.collection) notFound()

  const l2Nodes = buildL2Tree(summaries)
  const subcategories = l1
    ? getSubcategoriesForParent(l1.tag, l2Nodes).map((n) => ({ label: humanizeTag(n.tag), slug: n.tag }))
    : []
  const relatedCategories = CATEGORY_TREE_L1
    .filter((c) => c.tag !== l1?.tag)
    .slice(0, 6)
    .map((c) => ({ label: c.displayName, slug: c.collectionHandle }))

  const banner = getCategoryBannerConfig(slug)
  const clusterLinks = getClusterLinks(slug)

  // SEO database — H1 override, answer block, and FAQ on unfiltered page 1.
  const seoData = (!isFiltered && currentPage === 1) ? getCategorySeo(slug) : undefined

  const { collection } = data

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb items={[{ label: collection.title }]} />
      </div>

      {/* ── Hero ──
          Density (Phase 9): was min-h 320/380px, which pushed the toolbar and
          products below the fold. Now ~180-220px mobile / ~220-280px desktop.
          The artwork collapses entirely when no image can load, instead of
          reserving a large blank panel. */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-6">
        <div className="relative bg-white overflow-hidden flex min-h-[180px] sm:min-h-[220px] lg:min-h-[240px]">
          {/* Text content */}
          <div className="relative z-10 flex flex-col justify-center px-6 sm:px-10 py-6 sm:py-8 max-w-[560px]">
            <div className="inline-flex self-start items-center bg-[rgba(0,193,255,0.2)] rounded-full px-3 py-1 mb-3">
              <span className="text-teal-500 text-[12px] font-semibold tracking-[0.3px]">
                CERTIFIED MEDICAL SUPPLIER
              </span>
            </div>

            <h1 className="text-navy-900 text-[28px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.15] tracking-[-0.01em] mb-2">
              {seoData ? seoData.h1 : collection.title}
            </h1>

            {/* Two lines max: the full description still renders in the About
                section below, so the hero stays compact. */}
            {seoData ? (
              <p className="text-gray-500 text-[15px] leading-[1.6] max-w-[500px] line-clamp-2">
                {seoData.answerBlock}
              </p>
            ) : collection.description ? (
              <p className="text-gray-500 text-[15px] leading-[1.6] max-w-[500px] line-clamp-2">
                {collection.description}
              </p>
            ) : null}
          </div>

          {/* Right: banner artwork — collapses entirely when unavailable so a
              CDN failure never leaves a blank panel (Phase 4). */}
          <CategoryHeroImage bannerPath={banner.path} alt={banner.alt} />
        </div>
      </div>

      {/* ── Subcategory navigation (Phase 7) ──
          Was a flex-wrap wall of 52px buttons; with 47-97 subcategories on the
          big categories that pushed products well below the fold. */}
      <SubcategoryNavigator
        items={subcategories.map((sub) => ({
          label: sub.label,
          href: ROUTES.subcategory(slug, sub.slug),
        }))}
        allHref={ROUTES.category(slug)}
        allLabel={`All ${collection.title}`}
        allActive
        ariaLabel={`${collection.title} subcategories`}
      />

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        <CategoryResults
          source={{
            kind: 'collection',
            handle: slug,
            // Registry-backed L1s scope text search by their category tag
            // (the same membership source the L2 pages are built on).
            searchScope: l1 ? `tag:"category:${l1.tag}"` : undefined,
          }}
          baseUrl={ROUTES.category(slug)}
          facetKey={slug}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
          searchQuery={searchQuery}
          searchScopeTitle={collection.title}
        />
      </div>

      {/* FAQ section — below product grid (SEO database) */}
      {seoData && seoData.faqs.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <FAQSection faq={seoData.faqs} />
        </div>
      )}

      {/* Related categories */}
      {relatedCategories.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Related Categories
          </h2>
          <div className="flex flex-wrap gap-3">
            {relatedCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={ROUTES.category(cat.slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Cluster: Industries & Partners ── */}
      {clusterLinks && (clusterLinks.industryLinks.length > 0 || clusterLinks.partnerLinks.length > 0 || clusterLinks.occEligible) && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-6">Shop by Need</h2>
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
            {clusterLinks.industryLinks.length > 0 && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Industries
                </p>
                <div className="flex flex-wrap gap-2">
                  {clusterLinks.industryLinks.map((ind) => (
                    <Link
                      key={ind.slug}
                      href={ROUTES.industry(ind.slug)}
                      className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
                    >
                      {ind.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {clusterLinks.partnerLinks.length > 0 && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Brands
                </p>
                <div className="flex flex-wrap gap-2">
                  {clusterLinks.partnerLinks.map((p) => (
                    <Link
                      key={p.slug}
                      href={ROUTES.partner(p.slug)}
                      className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {clusterLinks.occEligible && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Programs
                </p>
                <Link
                  href={ROUTES.solutions.occ}
                  className="border border-teal-500 bg-teal-50 text-ink-link text-[14px] px-4 py-2 hover:bg-teal-100 transition-colors inline-block"
                >
                  OCC Program — Bulk Orders
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── About section — dark navy background ── */}
      {collection.descriptionHtml && (
        <section className="bg-navy-900 py-16 sm:py-20">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 text-center">
            <h2 className="text-white text-[36px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-8">
              About {collection.title}
            </h2>
            <div
              className="prose prose-invert max-w-[880px] mx-auto text-[15px] leading-[1.85] text-white/75
                prose-headings:text-white prose-a:text-teal-300 prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          </div>
        </section>
      )}

      {!isFiltered && (
        <>
          <script
            type="application/ld+json"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: jsonLdSafe(
                buildCollectionPageSchema({
                  name: collection.title,
                  url: `${SITE_URL}/category/${slug}`,
                  ...(collection.description ? { description: collection.description } : {}),
                  ...(collection.image?.url ? { image: collection.image.url } : {}),
                }),
              ),
            }}
          />
          <script
            type="application/ld+json"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: jsonLdSafe(
                buildBreadcrumbListSchema(
                  [{ label: collection.title }],
                  `${SITE_URL}/category/${slug}`,
                ),
              ),
            }}
          />
        </>
      )}
    </main>
  )
}
