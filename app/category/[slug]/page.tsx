import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION_HERO } from '@/lib/shopify/queries/collections'
import type { CollectionHero } from '@/lib/shopify/types'
import { CategoryResults } from '@/components/category/CategoryResults'
import { CategoryResultsSkeleton } from '@/components/category/CategoryResultsSkeleton'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { buildMetadata } from '@/lib/seo'
import { buildCollectionPageSchema, buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { getClusterLinks } from '@/lib/cluster-links'
import { getSubcategories, getRelatedCategories } from '@/lib/category-utils'
import { CategoryImage } from '@/components/shared/CategoryImage'
import { getCategoryBannerConfig } from '@/lib/bunnycdn'

export const revalidate = 30

export type CategorySearchParams = {
  sort?: string
  after?: string
  filter?: string | string[]
  page?: string
  cursors?: string
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<CategorySearchParams>
}

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'COLLECTION_DEFAULT', reverse: false }
  }
}

function parseFilterParam(filter?: string | string[]): string[] {
  if (!filter) return []
  return Array.isArray(filter) ? filter : [filter]
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const base = SITE_URL

  const activeFilterStrings = parseFilterParam(sp.filter)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)

  try {
    const data = await storefrontFetch<{ collection: CollectionHero | null }>(
      GET_COLLECTION_HERO,
      { handle: slug },
    )
    if (!data.collection) return { title: 'Category | MD Supplies' }
    const { title, description } = data.collection

    if (isFiltered) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}`,
        noIndex: true,
      })
    }

    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}?page=${currentPage}`,
      })
    }

    return buildMetadata({
      pageType: 'category',
      title,
      slug,
      description: description || undefined,
    })
  } catch {
    return { title: 'Category | MD Supplies' }
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const prevCursors = sp.cursors ? sp.cursors.split(',').filter(Boolean) : []

  if (isNaN(currentPage) || currentPage < 1) notFound()

  const [data, subcategories, relatedCategories] = await Promise.all([
    storefrontFetch<{ collection: CollectionHero | null }>(GET_COLLECTION_HERO, { handle: slug }),
    getSubcategories(slug),
    getRelatedCategories(slug),
  ])

  if (!data.collection) notFound()

  const banner = getCategoryBannerConfig(slug)
  const clusterLinks = getClusterLinks(slug)

  const { collection } = data

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb items={[{ label: collection.title }]} />
      </div>

      {/* ── Hero — banner image always present (BunnyCDN → Shopify → neutral panel) ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-8">
        <div className="relative bg-white overflow-hidden flex min-h-[320px] sm:min-h-[380px]">
          {/* Text content */}
          <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 py-10 max-w-[560px]">
            <div className="inline-flex self-start items-center bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[#0086b1] text-[13px] font-semibold tracking-[0.3px]">
                CERTIFIED MEDICAL SUPPLIER
              </span>
            </div>

            <h1 className="text-navy-900 text-[40px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-4">
              {collection.title}
            </h1>

            {collection.description && (
              <p className="text-gray-500 text-[15px] leading-[1.75] mb-8 max-w-[500px]">
                {collection.description}
              </p>
            )}

            <Link
              href={ROUTES.category(slug)}
              className="self-start border border-navy-900 text-navy-900 text-[14px] font-semibold px-6 h-[52px] flex items-center hover:bg-navy-900 hover:text-white transition-colors"
            >
              View All {collection.title}
            </Link>
          </div>

          {/* Right: banner image — only on larger screens, matching the existing layout */}
          <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[55%]">
            <CategoryImage
              bannerPath={banner.path}
              alt={banner.alt}
            />
          </div>
        </div>
      </div>

      {/* ── Subcategory tabs ── */}
      {subcategories.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {subcategories.map((sub) => (
              <Link
                key={sub.slug}
                href={ROUTES.subcategory(slug, sub.slug)}
                className="border border-[rgba(102,102,100,0.2)] bg-white text-navy-900 text-[13px] font-semibold px-4 h-[52px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
              >
                {sub.label}
              </Link>
            ))}
            <Link
              href={ROUTES.category(slug)}
              className="bg-navy-900 text-white text-[13px] font-semibold px-4 h-[52px] flex items-center hover:bg-navy-800 transition-colors whitespace-nowrap"
            >
              All
            </Link>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        <Suspense fallback={<CategoryResultsSkeleton />}>
          <CategoryResults
            slug={slug}
            sortKey={sortKey}
            reverse={reverse}
            sortParam={sp.sort}
            activeFilterStrings={activeFilterStrings}
            currentPage={currentPage}
            after={sp.after ?? null}
            prevCursors={prevCursors}
            trackingParamsSource={sp}
          />
        </Suspense>
      </div>

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
                  className="border border-teal-500 bg-teal-50 text-teal-700 text-[14px] px-4 py-2 hover:bg-teal-100 transition-colors inline-block"
                >
                  OCC Program — Volume Pricing
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
                prose-headings:text-white prose-a:text-[#0086b1] prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          </div>
        </section>
      )}

      {!isFiltered && (
        <>
          <script
            type="application/ld+json"
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
