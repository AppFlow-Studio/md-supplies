import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { ROUTES } from '@/lib/routes'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { ShopByIndustry } from '@/components/home/ShopByIndustry'
import { getAllowedHandles, buildCategoryNav } from '@/lib/category-nav'
import { getNonce } from '@/lib/csp-nonce'
import { fetchProductTagSummaries, buildL1Tiles, type L1Tile } from '@/lib/category-tree'

export const revalidate = 60

export const metadata = buildMetadata({
  pageType: 'categories-hub',
  description: 'Browse all medical supply categories — gloves, wound care, needles, IV therapy, and more. Serving clinics, urgent care, and B2B buyers.',
})

type CollectionNode = {
  id: string
  handle: string
  title: string
  description: string
  image: { url: string; altText: string | null } | null
}

export default async function CategoriesPage() {
  const nonce = await getNonce()

  let allCollections: CollectionNode[] = []
  let l1Tiles: L1Tile[] = []
  try {
    // Two independent reads: `allCollections` supplies both the Popular
    // Categories strip (nav-registry-sourced, out of this ticket's scope)
    // and tile artwork for the grid below; `l1Tiles` is the tag-derived
    // registry that decides WHICH tiles the grid renders. Verified
    // 2026-07-16: this page has never read from the stale custom
    // "Categories"/"Home page" collections — the trocar-size top-level
    // tiles came from getAllowedHandles() flattening synthesized sub-handles
    // (e.g. the 4 trocar-size collections) into one flat allowlist set.
    const [summaries, data] = await Promise.all([
      fetchProductTagSummaries(),
      storefrontFetch<{ collections: { nodes: CollectionNode[] } }>(GET_COLLECTIONS, { first: 250 }),
    ])
    l1Tiles = buildL1Tiles(summaries)
    allCollections = data.collections.nodes
  } catch {
    // degrade gracefully — render empty state
  }

  const allCollectionsByHandle = new Map(allCollections.map((c) => [c.handle, c]))
  const allowed = getAllowedHandles()
  const navCollections = allCollections.filter((c) => allowed.has(c.handle))
  const popularCollections = buildCategoryNav(navCollections)
    .primary
    .map((entry) => {
      const handle = entry.href.split('/').pop() ?? ''
      return allCollectionsByHandle.get(handle)
    })
    .filter((c): c is CollectionNode => c != null)
    .slice(0, 8)

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <Breadcrumb items={[{ label: 'All Categories' }]} />
      </div>

      {/* Hero */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-10">
        <h1 className="text-navy-900 text-[32px] sm:text-[40px] font-bold leading-tight mb-3">
          All Medical Supply Categories
        </h1>
        <p className="text-gray-500 text-[16px] max-w-2xl leading-relaxed">
          Browse our complete catalog of medical supplies — from gloves to IV therapy,
          organized for fast ordering. Trusted by clinics, urgent care centers, and B2B buyers nationwide.
        </p>
      </div>

      {/* Popular Categories strip */}
      {popularCollections.length > 0 && (
        <section className="bg-white border-t border-b border-gray-100 py-10">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
            <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Popular Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
              {popularCollections.map((col) => (
                <Link
                  key={col.id}
                  href={ROUTES.category(col.handle)}
                  className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-8 px-4 h-full"
                >
                  <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center overflow-hidden group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                    {col.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={col.image.url}
                        alt={col.image.altText ?? col.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-teal-500 text-[20px] font-bold">
                        {col.title.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-[14px] font-semibold text-navy-900 text-center leading-snug">
                    {col.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Categories grid */}
      <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12">
        <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Browse All Categories</h2>

        {l1Tiles.length === 0 ? (
          <p className="text-gray-500 text-[15px]">No categories found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {l1Tiles.map((tile) => {
              const col = allCollectionsByHandle.get(tile.collectionHandle)
              return (
                <Link
                  key={tile.tag}
                  href={ROUTES.category(tile.collectionHandle)}
                  className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden"
                >
                  {col?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={col.image.url}
                      alt={col.image.altText ?? tile.displayName}
                      className="w-full aspect-[4/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-navy-900/5 flex items-center justify-center">
                      <span className="text-navy-900/20 text-[36px] font-bold">{tile.displayName.charAt(0)}</span>
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                      {tile.displayName}
                    </p>
                    {col?.description && (
                      <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                        {col.description}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Shop by Industry */}
      <ShopByIndustry />

      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe(
            buildBreadcrumbListSchema(
              [{ label: 'All Categories' }],
              `${SITE_URL}/categories`,
            ),
          ),
        }}
      />
    </main>
  )
}
