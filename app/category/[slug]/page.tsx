import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronRight } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    sort?: string
    after?: string
    filter?: string | string[]
  }>
}

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':  return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC': return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':    return { sortKey: 'CREATED', reverse: true }
    default:           return { sortKey: 'COLLECTION_DEFAULT', reverse: false }
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      { handle: slug, first: 1 },
    )
    if (!data.collection) return { title: 'Category | MD Supplies' }
    return {
      title: `${data.collection.title} | MD Supplies`,
      description: data.collection.description || `Shop ${data.collection.title} at wholesale prices`,
    }
  } catch {
    return { title: 'Category | MD Supplies' }
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)

  const data = await storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
    handle: slug,
    first: 24,
    after: sp.after ?? null,
    sortKey,
    reverse,
    filters: parseFilters(activeFilterStrings),
  })

  if (!data.collection) notFound()

  const { collection } = data
  const products = collection.products.nodes
  const { pageInfo } = collection.products
  const filters = collection.products.filters ?? []

  const buildPageUrl = (cursor: string | null | undefined, direction: 'after') => {
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    if (cursor) p.set(direction, cursor)
    return `/category/${slug}?${p.toString()}`
  }

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    next.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">
            Home
          </Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">{collection.title}</span>
        </nav>
      </div>

      {/* Hero */}
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
            <p className="text-white/70 text-[15px] mt-2">
              {products.length === 24 ? '24+' : products.length} products
            </p>
          </div>
        </div>
      )}

      {!collection.image && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
          <h1 className="text-navy-900 text-[26px] font-bold">{collection.title}</h1>
          <p className="text-gray-500 text-[15px] mt-1">{products.length} products</p>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex gap-0 items-start">
        {/* Desktop sidebar */}
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
            <CategorySort
              currentSort={sp.sort}
              activeFilters={activeFilterStrings}
            />
          </div>

          {/* Active filter chips */}
          {activeFilterStrings.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilterStrings.map((f) => {
                let label = f
                try {
                  const parsed = JSON.parse(f)
                  label = Object.values(parsed).join(', ')
                } catch {}
                return (
                  <Link
                    key={f}
                    href={removeFilterUrl(f)}
                    className="flex items-center gap-1 bg-navy-900 text-white text-[12px] font-medium px-3 h-[28px] hover:bg-navy-950 transition-colors"
                  >
                    {String(label)}
                    <X size={11} />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Product grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
              {products.map((product) => (
                <ShopifyProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-navy-900 text-[20px] font-semibold">No products found</p>
              <p className="text-gray-500 text-[15px]">
                Try adjusting or clearing your filters.
              </p>
              <Link
                href={`/category/${slug}`}
                className="mt-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] flex items-center hover:bg-neutral-50 transition-colors"
              >
                Clear all filters
              </Link>
            </div>
          )}

          {/* Pagination */}
          {pageInfo.hasNextPage && (
            <div className="flex items-center justify-center pt-12">
              <Link
                href={buildPageUrl(pageInfo.endCursor, 'after')}
                className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
              >
                Load More
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* About section */}
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
    </main>
  )
}
