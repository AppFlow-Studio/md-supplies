import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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

export const revalidate = 30

interface Props {
  params: Promise<{ 'partner-slug': string }>
  searchParams: Promise<{ sort?: string; after?: string }>
}

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'RELEVANCE', reverse: false }
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
  const sp = await searchParams

  const partner = getPartnerBySlug(slug)
  if (!partner) notFound()

  const { sortKey, reverse } = parseSortKey(sp.sort)

  const data = await storefrontFetch<{
    products: { nodes: CollectionProduct[]; pageInfo: PageInfo }
  }>(GET_PRODUCTS_BY_VENDOR, {
    query: `vendor:"${partner.vendorName}"`,
    first: 24,
    after: sp.after ?? null,
    sortKey,
    reverse,
  })

  const products = data.products.nodes
  const { pageInfo } = data.products

  const buildPageUrl = (cursor: string | null | undefined) => {
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    if (cursor) p.set('after', cursor)
    const qs = p.toString()
    return qs ? `/partners/${slug}/products?${qs}` : `/partners/${slug}/products`
  }

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
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

      {/* Hero */}
      <div className="bg-navy-900 h-[180px] sm:h-[220px] flex items-center">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 w-full">
          <h1 className="text-white text-[28px] sm:text-[36px] font-bold leading-tight">{partner.name}</h1>
          <p className="text-white/70 text-[15px] mt-2">
            {pageInfo.hasNextPage ? '24+' : products.length} products
          </p>
        </div>
      </div>

      {/* Product area */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        <div className="flex justify-end mb-6">
          <CategorySort currentSort={sp.sort} activeFilters={[]} />
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

      <WholesalePricing />
    </main>
  )
}
