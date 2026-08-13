import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { ROUTES } from '@/lib/routes'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { ShopByIndustry } from '@/components/home/ShopByIndustry'
import { CategoryImage } from '@/components/shared/CategoryImage'
import { getCategoryBannerConfig } from '@/lib/bunnycdn'
import {
  buildL1Tiles,
  CATEGORY_TREE_L1,
  getCategorySlug,
  type ProductTagSummary,
} from '@/lib/category-tree'
import { getNonce } from '@/lib/csp-nonce'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'

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

  // Two independent reads, fetched (and failed) independently: `allCollections`
  // supplies both the Popular Categories strip (nav-registry-sourced, out of
  // this ticket's scope) and tile artwork for the grid below; `l1Tiles` is the
  // tag-derived registry that decides WHICH tiles the grid renders.
  // buildL1Tiles always returns all 25 static tiles regardless of its input
  // (an empty summaries array just yields productCount: 0 on each), so the
  // grid's identity/links never depend on fetchProductTagSummaries()
  // succeeding — these must not share a try/catch, or a GET_COLLECTIONS
  // artwork-fetch failure would blank the entire grid unnecessarily.
  // Verified 2026-07-16: this page has never read from the stale custom
  // "Categories"/"Home page" collections — the trocar-size top-level
  // tiles came from getAllowedHandles() flattening synthesized sub-handles
  // (e.g. the 4 trocar-size collections) into one flat allowlist set.
  let allCollections: CollectionNode[] = []
  try {
    const data = await storefrontFetch<{ collections: { nodes: CollectionNode[] } }>(GET_COLLECTIONS, { first: 250 })
    allCollections = data.collections.nodes
  } catch {
    // degrade gracefully — Popular strip and tile artwork render without images
  }

  let summaries: ProductTagSummary[] = []
  try {
    summaries = await fetchProductTagSummaries()
  } catch {
    // degrade gracefully — grid still renders all 25 tiles from the static
    // allowlist, just with productCount 0
  }
  const l1Tiles = buildL1Tiles(summaries)

  // Popular strip: the REGISTRY supplies name and URL; Shopify is consulted
  // only for whether the collection is live. It used to round-trip through
  // `allCollectionsByHandle` and render the raw Shopify `title`, so the same
  // hub page named the same category two different ways — the strip said
  // "Trocars & Trocar Kits", "Stools & Seating", "Face Coverings", "Capes &
  // Gowns" and "Testing & Screening" while the grid immediately below said
  // "Surgery & Procedure", "Room Furniture", "Face Masks", "Apparel" and
  // "Testing". It also linked by raw handle, which is the redirecting URL for
  // Face Masks.
  const liveHandles = new Set(allCollections.map((c) => c.handle))
  const popularCategories = CATEGORY_TREE_L1
    .filter((c) => c.navGroup === 'primary' && liveHandles.has(c.collectionHandle))
    .slice(0, 8)

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
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
      {popularCategories.length > 0 && (
        <section className="bg-white border-t border-b border-gray-100 py-10">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
            <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Popular Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
              {popularCategories.map((cat) => {
                const banner = getCategoryBannerConfig(cat.collectionHandle)
                return (
                  <Link
                    key={cat.tag}
                    href={ROUTES.category(getCategorySlug(cat))}
                    className="group bg-white transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-900 flex flex-col items-center justify-center gap-4 py-8 px-4 h-full"
                  >
                    <div className="relative w-[50px] h-[50px] rounded-xl overflow-hidden bg-[rgba(0,193,255,0.15)] group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                      {/* DEV-CAT-01: no initial-letter placeholder. Every
                          active category resolves to a curated BunnyCDN image
                          (lib/category-images.ts); a load failure degrades to
                          the neutral panel, never to a letter tile. */}
                      <CategoryImage
                        bannerPath={banner.path}
                        alt={banner.alt}
                        sizes="50px"
                      />
                    </div>
                    <span className="text-[14px] font-semibold text-navy-900 text-center leading-snug">
                      {cat.displayName}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* All Categories grid */}
      <section id="all-categories" className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12">
        <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Browse All Categories</h2>

        {l1Tiles.length === 0 ? (
          <p className="text-gray-500 text-[15px]">No categories found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {l1Tiles.map((tile) => {
              const banner = getCategoryBannerConfig(tile.collectionHandle)
              return (
                <Link
                  key={tile.tag}
                  href={ROUTES.category(getCategorySlug(tile))}
                  /* Same reason as the industry cards: without this the link's
                     accessible name is the image alt plus the display name plus
                     the whole description run together. */
                  aria-label={`${tile.displayName} — ${tile.shortDescription}`}
                  className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
                >
                  <div className="relative w-full aspect-[4/3]">
                    {/* Decorative: the tile's own label and description sit
                        directly below and say the same thing. */}
                    <CategoryImage
                      bannerPath={banner.path}
                      alt=""
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                      {tile.displayName}
                    </p>
                    <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                      {tile.shortDescription}
                    </p>
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
