import type { Metadata } from 'next'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { ROUTES } from '@/lib/routes'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'All Categories | MD Supplies',
  description: 'Browse all medical supply categories at wholesale prices.',
}

type CollectionNode = {
  id: string
  handle: string
  title: string
  description: string
  image: { url: string; altText: string | null } | null
}

export default async function CategoriesPage() {
  let collections: CollectionNode[] = []
  try {
    const data = await storefrontFetch<{ collections: { nodes: CollectionNode[] } }>(
      GET_COLLECTIONS,
      { first: 250 },
    )
    collections = data.collections.nodes
  } catch {
    // Degrade gracefully — render empty state rather than error
  }

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
          <Link href={ROUTES.home} className="text-gray-500 hover:text-navy-900 transition-colors">
            Home
          </Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">All Categories</span>
        </nav>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-16">
        <h1 className="text-navy-900 text-[32px] font-bold mb-2">All Categories</h1>
        <p className="text-gray-500 text-[15px] mb-10">
          Browse our full range of medical supplies by category.
        </p>

        {collections.length === 0 ? (
          <p className="text-gray-500 text-[15px]">No categories found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={ROUTES.category(col.handle)}
                className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden"
              >
                {col.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={col.image.url}
                    alt={col.image.altText ?? col.title}
                    className="w-full aspect-[4/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-navy-900/5" />
                )}
                <div className="px-4 py-3">
                  <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                    {col.title}
                  </p>
                  {col.description && (
                    <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
