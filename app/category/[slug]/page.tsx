import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronRight } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { buildMetadata } from '@/lib/seo'
import { buildCollectionPageSchema, buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { getClusterLinks } from '@/lib/cluster-links'
import { getSubcategories, getRelatedCategories } from '@/lib/category-utils'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    sort?: string
    after?: string
    filter?: string | string[]
    page?: string
  }>
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

function parseFilters(filterStrings: string[]): Record<string, unknown>[] {
  return filterStrings.flatMap((f) => {
    try {
      const parsed = JSON.parse(f)
      return parsed ? [parsed] : []
    } catch {
      return []
    }
  })
}


export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'

  const activeFilterStrings = parseFilterParam(sp.filter)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)

  try {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      { handle: slug, first: 1 },
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
        canonical: sp.after
          ? `${base}/category/${slug}?page=${currentPage}&after=${sp.after}`
          : `${base}/category/${slug}`,
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

  const [data, subcategories, relatedCategories] = await Promise.all([
    storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
      handle: slug,
      first: 9,
      after: sp.after ?? null,
      sortKey,
      reverse,
      filters: parseFilters(activeFilterStrings),
    }),
    getSubcategories(slug),
    getRelatedCategories(slug),
  ])

  if (!data.collection) notFound()

  const clusterLinks = getClusterLinks(slug)

  const { collection } = data
  const products = collection.products.nodes
  const { pageInfo } = collection.products
  const filters = collection.products.filters ?? []

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    next.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  const loadMoreUrl = (() => {
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    if (pageInfo.endCursor) p.set('after', pageInfo.endCursor)
    return `/category/${slug}?${p.toString()}`
  })()

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb items={[{ label: collection.title }]} />
      </div>

      {/* ── Hero — split when image present, full-width fallback otherwise ── */}
      {(() => {
        const hasImage = Boolean(collection.image)
        return (
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-8">
            <div className={`relative bg-white overflow-hidden flex ${hasImage ? 'min-h-[320px] sm:min-h-[380px]' : ''}`}>
              {/* Text content */}
              <div className={`relative z-10 flex flex-col justify-center px-8 sm:px-12 py-10 ${hasImage ? 'max-w-[560px]' : 'w-full'}`}>
                <div className="inline-flex self-start items-center bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-1.5 mb-5">
                  <span className="text-[#0086b1] text-[13px] font-semibold tracking-[0.3px]">
                    CERTIFIED MEDICAL SUPPLIER
                  </span>
                </div>

                <h1 className="text-navy-900 text-[40px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-4">
                  {collection.title}
                </h1>

                {collection.description && (
                  <p className={`text-gray-500 text-[15px] leading-[1.75] mb-8 ${hasImage ? 'max-w-[500px]' : 'max-w-[800px]'}`}>
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

              {/* Right: collection image — only when available */}
              {hasImage && collection.image && (
                <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[55%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={collection.image.url}
                    alt={collection.image.altText ?? collection.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        )
      })()}

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
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px]">
          <CategoryFilters
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sp.sort}
          />
        </aside>

        {/* Product area */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-[15px]">
              Showing {products.length} of {collection.products.filters?.[0] ? '' : ''} products
            </p>
            <CategorySort currentSort={sp.sort} activeFilters={activeFilterStrings} />
          </div>

          {/* Active filter chips */}
          {activeFilterStrings.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilterStrings.map((f) => {
                let label = f
                try {
                  const parsed = JSON.parse(f)
                  if (parsed?.price) {
                    const { min, max } = parsed.price
                    label = max >= 200000
                      ? `Price: $${Number(min).toLocaleString()}+`
                      : `Price: $${Number(min).toLocaleString()} – $${Number(max).toLocaleString()}`
                  } else {
                    label = String(Object.values(parsed).join(', '))
                  }
                } catch { /* keep raw */ }
                return (
                  <Link
                    key={f}
                    href={removeFilterUrl(f)}
                    className="flex items-center gap-1 bg-navy-900 text-white text-[12px] font-medium px-3 h-[28px] hover:bg-navy-950 transition-colors"
                  >
                    {label}
                    <X size={11} />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Mobile filter drawer */}
          <FilterDrawer
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sp.sort}
          />

          {/* Product grid */}
          <ProductGrid
            products={products}
            emptyStateHref={ROUTES.category(slug)}
            categorySlug={data.collection.handle}
          />

          {/* Clean-page pagination */}
          {!isFiltered && (
            <CategoryPagination
              currentPage={currentPage}
              hasNext={pageInfo.hasNextPage}
              nextCursor={pageInfo.endCursor ?? null}
              baseUrl={ROUTES.category(slug)}
            />
          )}

          {/* Filtered/sorted pages: Load More */}
          {isFiltered && pageInfo.hasNextPage && (
            <div className="flex items-center justify-center pt-12">
              <Link
                href={loadMoreUrl}
                className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
              >
                Load More
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
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
    </main>
  )
}
