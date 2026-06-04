import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { SEARCH_PRODUCTS } from '@/lib/shopify/queries/search'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import type { CollectionProduct } from '@/lib/shopify/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ q?: string }>
}

interface SearchData {
  search: {
    totalCount: number
    nodes: CollectionProduct[]
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  return buildMetadata({
    pageType: 'utility',
    title: sp.q ? `"${sp.q}" — Search` : 'Search',
    slug: 'search',
  })
}

const SUGGESTED = [
  { label: 'Exam Gloves', href: '/category/exam-gloves' },
  { label: 'Face Masks', href: '/category/face-masks' },
  { label: 'Wound Care', href: '/category/wound-care' },
  { label: 'Syringes', href: '/category/syringes' },
]

export default async function SearchPage({ searchParams }: Props) {
  const { q = '' } = await searchParams

  let products: CollectionProduct[] = []
  let totalCount = 0

  if (q.trim()) {
    try {
      const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
        query: q,
        first: 12,
      })
      products = data.search.nodes
      totalCount = data.search.totalCount
    } catch {
      // network error — show empty state
    }
  }

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Search bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
          <form method="GET" action="/search">
            <div className="flex gap-3 max-w-[600px]">
              <div className="flex-1 flex items-center border border-gray-200 focus-within:border-navy-900 transition-colors px-4 gap-3 bg-white">
                <Search size={18} className="text-gray-500 shrink-0" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search medical supplies…"
                  className="flex-1 h-[48px] text-[15px] text-navy-900 placeholder:text-gray-500 outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-navy-900 text-white h-[48px] px-6 text-[14px] font-semibold tracking-[0.28px] uppercase hover:bg-navy-950 transition-colors shrink-0"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10">
        {/* Results count */}
        {q.trim() && (
          <p className="text-gray-500 text-[15px] tracking-[0.3px] mb-8">
            {totalCount > 0
              ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${q}"`
              : `No results for "${q}"`}
          </p>
        )}

        {/* Results grid */}
        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[23px]">
            {products.map((product) => (
              <ShopifyProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {q.trim() && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <Search size={48} className="text-gray-300" />
            <div className="text-center">
              <p className="text-navy-900 text-[20px] font-semibold mb-2">
                No results for &ldquo;{q}&rdquo;
              </p>
              <p className="text-gray-500 text-[15px]">
                Try a different search term or browse our categories below.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {SUGGESTED.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[40px] flex items-center hover:bg-neutral-50 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No query state */}
        {!q.trim() && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <p className="text-navy-900 text-[20px] font-semibold">
              What are you looking for?
            </p>
            <p className="text-gray-500 text-[15px]">Browse popular categories:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {SUGGESTED.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[40px] flex items-center hover:bg-neutral-50 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
