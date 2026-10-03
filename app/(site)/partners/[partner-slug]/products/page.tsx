import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { CatalogGridSkeleton } from '@/components/category/CatalogGridSkeleton'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
import { getPartnerBySlug, PARTNERS } from '@/lib/partners'
import { WholesalePricing } from '@/components/home/WholesalePricing'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { CategorySort } from '@/components/category/CategorySort'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'
import { fetchPartnerCategories, partnerProductQuery } from '@/lib/partners-data.server'

interface Props {
  params: Promise<{ 'partner-slug': string }>
  searchParams: Promise<{ sort?: string; after?: string; category?: string }>
}

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    // Best sellers first by default (was RELEVANCE, which with no search
    // term is an arbitrary order).
    default:             return { sortKey: 'BEST_SELLING', reverse: false }
  }
}

export function generateStaticParams() {
  return PARTNERS.filter((p) => p.isActive).map((p) => ({ 'partner-slug': p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)
  if (!partner) return buildMetadata({ pageType: 'static', title: 'Partner Products' })
  return buildMetadata({
    pageType: 'static',
    title: `${partner.name} Products`,
    description: `Shop all ${partner.name} medical supplies.`,
    slug: `partners/${partner.slug}/products`,
  })
}

export default async function PartnerProductsPage({ params, searchParams }: Props) {
  const { 'partner-slug': slug } = await params

  const partner = getPartnerBySlug(slug)
  if (!partner) notFound()

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb (static shell) */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <Link href="/partners" className="text-gray-500 hover:text-navy-900 transition-colors">Partners</Link>
          <span className="text-gray-500">›</span>
          <Link href={`/partners/${slug}`} className="text-gray-500 hover:text-navy-900 transition-colors">{partner.name}</Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">All Products</span>
        </nav>
      </div>

      {/* Hero (static shell) */}
      <div className="bg-navy-900 h-[180px] sm:h-[220px] flex items-center">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 w-full">
          <h1 className="text-white text-[28px] sm:text-[36px] font-bold leading-tight">{partner.name}</h1>
        </div>
      </div>

      {/* Product area reads searchParams (sort/after) → streams (Cache Components) */}
      <Suspense
        fallback={
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
            <CatalogGridSkeleton />
          </div>
        }
      >
        <PartnerProducts searchParams={searchParams} partner={partner} slug={slug} />
      </Suspense>

      <WholesalePricing />
    </main>
  )
}

// Reads searchParams → the request-time dynamic hole (Cache Components). The
// breadcrumb + hero are the prerendered static shell around it.
async function PartnerProducts({ searchParams, partner, slug }: {
  searchParams: Props['searchParams']
  partner: NonNullable<ReturnType<typeof getPartnerBySlug>>
  slug: string
}) {
  const sp = await searchParams
  const { sortKey, reverse } = parseSortKey(sp.sort)

  // Category pills come from this partner's own product tags, so only a
  // category the partner really has products in can be selected; anything
  // else in the URL is ignored rather than producing an empty grid.
  const categories = await fetchPartnerCategories(partner.vendorName)
  const activeCategory = categories.find((c) => c.tag === sp.category)

  const data = await storefrontFetch<{
    products: { nodes: CollectionProduct[]; pageInfo: PageInfo }
  }>(GET_PRODUCTS_BY_VENDOR, {
    query: partnerProductQuery(partner.vendorName, activeCategory?.tag),
    first: 24,
    after: sp.after ?? null,
    sortKey,
    reverse,
  })

  const products = data.products.nodes
  const { pageInfo } = data.products

  const buildPageUrl = (cursor: string | null | undefined) => {
    const p = new URLSearchParams()
    if (activeCategory) p.set('category', activeCategory.tag)
    if (sp.sort) p.set('sort', sp.sort)
    if (cursor) p.set('after', cursor)
    const qs = p.toString()
    return qs ? `/partners/${slug}/products?${qs}` : `/partners/${slug}/products`
  }

  const categoryHref = (tag?: string) => {
    const p = new URLSearchParams()
    if (tag) p.set('category', tag)
    if (sp.sort) p.set('sort', sp.sort)
    const qs = p.toString()
    return qs ? `/partners/${slug}/products?${qs}` : `/partners/${slug}/products`
  }
  const totalCount = categories.reduce((n, c) => n + c.count, 0)

  return (
    <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
      {categories.length > 1 && (
        <nav aria-label={`${partner.name} categories`} className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
          <ul className="flex sm:flex-wrap gap-2 w-max sm:w-auto">
            {[{ tag: undefined, label: 'All', count: totalCount }, ...categories].map((c) => {
              const active = c.tag === activeCategory?.tag
              return (
                <li key={c.tag ?? 'all'}>
                  <Link
                    href={categoryHref(c.tag)}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-1.5 h-10 px-4 border text-[14px] font-medium whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-navy-900 border-navy-900 text-white'
                        : 'bg-white border-navy-900/20 text-navy-900 hover:border-navy-900'
                    }`}
                  >
                    {c.label}
                    {c.tag && <span className={active ? 'text-white/70' : 'text-gray-500'}>{c.count}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-[15px]">
          {pageInfo.hasNextPage ? '24+' : products.length} products
        </p>
        <CategorySort
          currentSort={sp.sort}
          activeFilters={[]}
          defaultSort="BEST_SELLING"
          preserveParams={activeCategory ? { category: activeCategory.tag } : undefined}
        />
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
          {products.map((product) => (
            <ShopifyProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-navy-900 text-[20px] font-semibold">No products found</p>
        </div>
      )}

      {pageInfo.hasNextPage && (
        <div className="flex items-center justify-center pt-12">
          <Link
            href={buildPageUrl(pageInfo.endCursor)}
            className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
          >
            Load More<ChevronRight size={16} />
          </Link>
        </div>
      )}
    </div>
  )
}
