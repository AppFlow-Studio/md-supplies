import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { ROUTES } from '@/lib/routes'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { ShopByIndustry } from '@/components/home/ShopByIndustry'
import { getL1Categories } from '@/lib/category-tree'
import { getNonce } from '@/lib/csp-nonce'

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

  // Tiles come from the tag-backbone registry (lib/category-tree) — never
  // the collection list, never the junk "Categories" collection, no
  // trocar-size/attribute tiles. The live collection fetch below only
  // decorates tiles with images/descriptions, matched on handle.
  let liveCollections: CollectionNode[] = []
  try {
    const data = await storefrontFetch<{ collections: { nodes: CollectionNode[] } }>(
      GET_COLLECTIONS,
      { first: 250 },
    )
    liveCollections = data.collections.nodes
  } catch {
    // degrade gracefully — tiles render from the registry with letter fallbacks
  }
  const liveByHandle = new Map(liveCollections.map((c) => [c.handle, c]))

  const categories = getL1Categories().map((c) => {
    const live = liveByHandle.get(c.handle)
    return {
      key: c.tag,
      title: c.displayName, // registry name — never matched on collection title
      href: ROUTES.category(c.handle),
      navGroup: c.navGroup,
      image: live?.image ?? null,
      description: live?.description ?? '',
    }
  })
  const popularCategories = categories.filter((c) => c.navGroup === 'primary').slice(0, 8)

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
      {popularCategories.length > 0 && (
        <section className="bg-white border-t border-b border-gray-100 py-10">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
            <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Popular Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
              {popularCategories.map((cat) => (
                <Link
                  key={cat.key}
                  href={cat.href}
                  className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-8 px-4 h-full"
                >
                  <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center overflow-hidden group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.image.url}
                        alt={cat.image.altText ?? cat.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-teal-500 text-[20px] font-bold">
                        {cat.title.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-[14px] font-semibold text-navy-900 text-center leading-snug">
                    {cat.title}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.key}
              href={cat.href}
              className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden"
            >
              {cat.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.image.url}
                  alt={cat.image.altText ?? cat.title}
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-navy-900/5 flex items-center justify-center">
                  <span className="text-navy-900/20 text-[36px] font-bold">{cat.title.charAt(0)}</span>
                </div>
              )}
              <div className="px-4 py-3">
                <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                  {cat.title}
                </p>
                {cat.description && (
                  <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
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
