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
import { ROUTES } from '@/lib/routes'
import { getSiblingSubcategories } from '@/lib/category-utils'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string; sub: string }>
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
  const { slug, sub } = await params
  const sp = await searchParams
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
  // Composite handle: /category/gloves/nitrile → Shopify collection "gloves-nitrile"
  const handle = `${slug}-${sub}`

  const activeFilterStrings = parseFilterParam(sp.filter)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)

  try {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      { handle, first: 1 },
    )
    if (!data.collection) return { title: 'Category | MD Supplies' }
    const { title, description } = data.collection

    // Rule 3: filtered or sorted → noindex, canonical to clean subcategory URL
    if (isFiltered) {
      return buildMetadata({
        pageType: 'subcategory',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}/${sub}`,
        noindex: true,
      })
    }

    // Rule 2: paginated → index, canonical to self (only when cursor present)
    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'subcategory',
        title,
        description: description || undefined,
        canonical: sp.after
          ? `${base}/category/${slug}/${sub}?page=${currentPage}&after=${sp.after}`
          : `${base}/category/${slug}/${sub}`,
      })
    }

    // Rule 1: clean page 1 → index, canonical to clean subcategory URL
    return buildMetadata({
      pageType: 'subcategory',
      title,
      description: description || undefined,
      canonical: `${base}/category/${slug}/${sub}`,
    })
  } catch {
    return { title: 'Category | MD Supplies' }
  }
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { slug, sub } = await params
  const sp = await searchParams
  // Composite handle: /category/gloves/nitrile → Shopify collection "gloves-nitrile"
  const handle = `${slug}-${sub}`

  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)

  const [data, siblings] = await Promise.all([
    storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
      handle,
      first: 9,
      after: sp.after ?? null,
      sortKey,
      reverse,
      filters: parseFilters(activeFilterStrings),
    }),
    getSiblingSubcategories(slug, sub),
  ])

  if (!data.collection) notFound()

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
    return qs ? `/category/${slug}/${sub}?${qs}` : `/category/${slug}/${sub}`
  }

  const loadMoreUrl = (() => {
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    if (pageInfo.endCursor) p.set('after', pageInfo.endCursor)
    return `/category/${slug}/${sub}?${p.toString()}`
  })()

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb — parent slug displayed as formatted text until data team provides parent title */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <Breadcrumb
          items={[
            { label: slug.replace(/-/g, ' '), href: ROUTES.category(slug) },
            { label: collection.title },
          ]}
        />
      </div>

      {/* Hero — with image */}
      {collection.image && (
        <div className="relative bg-navy-900 overflow-hidden h-[220px] sm:h-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collection.image.url}
            alt={collection.image.altText ?? collection.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-center">
            <h1 className="text-white text-[28px] sm:text-[36px] font-bold leading-tight">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-white/70 text-[15px] mt-2 max-w-2xl">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hero — no image fallback */}
      {!collection.image && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
          <h1 className="text-navy-900 text-[26px] font-bold">{collection.title}</h1>
          {collection.description && (
            <p className="text-gray-500 text-[15px] mt-1 max-w-2xl">
              {collection.description}
            </p>
          )}
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex gap-0 items-start">
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
          <div className="flex justify-end mb-6">
            <CategorySort currentSort={sp.sort} activeFilters={activeFilterStrings} />
          </div>

          {/* Active filter chips */}
          {activeFilterStrings.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilterStrings.map((f) => {
                let label = f
                try { label = String(Object.values(JSON.parse(f)).join(', ')) } catch { /* keep raw */ }
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
            emptyStateHref={ROUTES.subcategory(slug, sub)}
          />

          {/* Clean-page pagination */}
          {!isFiltered && (
            <CategoryPagination
              currentPage={currentPage}
              hasNext={pageInfo.hasNextPage}
              nextCursor={pageInfo.endCursor ?? null}
              baseUrl={ROUTES.subcategory(slug, sub)}
            />
          )}

          {/* Filtered/sorted: cursor-based Load More */}
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

      {/* Sibling subcategories — derived from Shopify collection handles (${slug}-* pattern) */}
      {siblings.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Related Subcategories
          </h2>
          <div className="flex flex-wrap gap-3">
            {siblings.map((r) => (
              <Link
                key={r.subSlug}
                href={ROUTES.subcategory(r.catSlug, r.subSlug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
              >
                {r.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom SEO copy */}
      {collection.descriptionHtml && (
        <section className="bg-white border-t border-gray-200 py-14">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
            <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-6">
              About {collection.title}
            </h2>
            <div
              className="prose prose-gray max-w-3xl text-[15px] leading-[28px] text-gray-500"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          </div>
        </section>
      )}

      {/* Schema slot — A5 fills this with CollectionPage + BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({}) }}
      />
    </main>
  )
}
