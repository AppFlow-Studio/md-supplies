import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS, GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
import { slugifyVendor, unslugifyVendor } from '@/lib/brands'
import { WholesalePricing } from '@/components/home/WholesalePricing'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { CategorySort } from '@/components/category/CategorySort'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string }>
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

async function getVendorName(slug: string): Promise<string | undefined> {
  const data = await storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(
    GET_PRODUCTS,
    { first: 250 },
  )
  const vendors = [...new Set(data.products.nodes.map((p) => p.vendor).filter(Boolean))]
  return unslugifyVendor(slug, vendors)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const vendor = await getVendorName(slug)
  if (!vendor) return { title: 'Brand | MD Supplies' }
  return {
    title: `${vendor} Products | MD Supplies`,
    description: `Shop all ${vendor} medical supplies at wholesale prices.`,
  }
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

  const vendor = await getVendorName(slug)
  if (!vendor) notFound()

  const { sortKey, reverse } = parseSortKey(sp.sort)

  const data = await storefrontFetch<{
    products: { nodes: CollectionProduct[]; pageInfo: PageInfo }
  }>(GET_PRODUCTS_BY_VENDOR, {
    query: `vendor:"${vendor}"`,
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
    return qs ? `/brands/${slug}?${qs}` : `/brands/${slug}`
  }

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <Link href="/brands" className="text-gray-500 hover:text-navy-900 transition-colors">Brands</Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">{vendor}</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="bg-navy-900 h-[180px] sm:h-[220px] flex items-center">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 w-full">
          <h1 className="text-white text-[28px] sm:text-[36px] font-bold leading-tight">{vendor}</h1>
          <p className="text-white/70 text-[15px] mt-2">
            {products.length === 24 ? '24+' : products.length} products
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
