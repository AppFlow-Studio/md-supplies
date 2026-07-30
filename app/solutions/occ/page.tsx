import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { getSolutionSeo } from '@/lib/seo/solutionSeo'
import { OCC_HUB } from '@/lib/occ'
import { getOccCollectionHandle } from '@/lib/occ-collection'
import { OCCHubPage } from '@/components/b2b/OCCHub'
import { CategoryResults } from '@/components/category/CategoryResults'
import {
  parseSortKey,
  parseFilterParam,
  parseSearchParam,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import type { OCCProduct } from '@/types/occ'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { notFound } from 'next/navigation'

// DEV-OCC-01: OCC is a complete collection experience — one canonical
// collection (lib/occ-collection.ts), the shared CategoryResults engine
// (filters from the `occ` registry entry, scoped search, sort, pagination),
// plus the hub's hero/categories/featured/FAQ around it. No guessed handles,
// no tag:occ scanning, no featured-only assortment.

interface Props {
  searchParams: Promise<CategorySearchParams>
}

const _occSeo = getSolutionSeo('occ')

function baseMetadata(): Metadata {
  const base = buildMetadata({
    pageType: 'occ',
    title: OCC_HUB.seoTitle,
    description: OCC_HUB.seoDescription || OCC_HUB.intro,
  })
  if (!_occSeo) return base
  const og = (base.openGraph ?? {}) as Record<string, unknown>
  return {
    ...base,
    title: _occSeo.title,
    description: _occSeo.metaDescription,
    openGraph: { ...og, title: _occSeo.title, description: _occSeo.metaDescription },
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const isQueryVariant =
    parseFilterParam(sp.filter).length > 0 || Boolean(sp.sort) || Boolean(parseSearchParam(sp.q)) || Boolean(sp.page)

  const base = baseMetadata()
  if (!isQueryVariant) return base
  // Filter/search/sort/page states are noindex and canonicalize to the clean
  // route (plan §3.5) — they never enter the sitemap.
  return {
    ...base,
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}/solutions/occ` },
  }
}

interface ProductNode {
  handle: string
  title: string
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } }
  images: { nodes: { url: string; altText: string | null }[] }
}

function toOCCProduct(p: ProductNode): OCCProduct {
  return {
    handle: p.handle,
    title: p.title,
    image: p.images.nodes[0]?.url ?? '',
    price: Math.round(parseFloat(p.priceRange.minVariantPrice.amount) * 100),
  }
}

/**
 * Featured block: best sellers from the SAME canonical collection. Also the
 * fail-safe probe — `available: false` means the canonical collection could
 * not be resolved, and the page renders the hub without the catalog (a
 * neutral unavailable state, never a tag fallback and never a 404 of the
 * whole OCC destination).
 */
async function fetchFeaturedOCCProducts(
  handle: string,
): Promise<{ available: boolean; featured: OCCProduct[] }> {
  try {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      { handle, first: 6, after: null, sortKey: 'BEST_SELLING', reverse: false, filters: [] },
      { next: { revalidate: 300, tags: ['shopify', 'collections', `collection:${handle}`] } },
    )
    if (!data.collection) return { available: false, featured: [] }
    return {
      available: true,
      featured: data.collection.products.nodes.map((p) => toOCCProduct(p as unknown as ProductNode)),
    }
  } catch {
    // Transient API failure: keep the catalog section (its own error handling
    // covers the grid) but skip featured rather than blank the page.
    return { available: true, featured: [] }
  }
}

export default async function OCCPage({ searchParams }: Props) {
  const sp = await searchParams
  const occHandle = getOccCollectionHandle()

  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const searchQuery = parseSearchParam(sp.q)
  const currentPage = parseInt(sp.page ?? '1', 10)
  if (isNaN(currentPage) || currentPage < 1) notFound()

  const { available, featured } = await fetchFeaturedOCCProducts(occHandle)

  return (
    <>
      <WebPageSchema
        name={_occSeo?.title ?? OCC_HUB.seoTitle ?? OCC_HUB.title}
        description={_occSeo?.metaDescription ?? OCC_HUB.seoDescription ?? OCC_HUB.intro}
        url={`${SITE_URL}/solutions/occ`}
      />
      <BreadcrumbSchema items={[{ label: 'OCC', href: '/solutions/occ' }]} />
      <OCCHubPage
        hub={{ ...OCC_HUB, eligibleProducts: featured }}
        catalog={
          available ? (
            <CategoryResults
              source={{ kind: 'collection', handle: occHandle }}
              baseUrl={ROUTES.solutions.occ}
              facetKey="occ"
              sortKey={sortKey}
              reverse={reverse}
              sortParam={sp.sort}
              activeFilterStrings={activeFilterStrings}
              currentPage={currentPage}
              trackingParamsSource={sp}
              searchQuery={searchQuery}
              searchScopeTitle="OCC Shoebox Supplies"
            />
          ) : (
            // Canonical collection unresolved (see lib/occ-collection.ts):
            // neutral state, no tag fallback, no invented assortment.
            <p className="text-gray-500 text-[15px]">
              The full OCC catalog is temporarily unavailable. Browse the
              categories above or contact our team for help with an OCC order.
            </p>
          )
        }
      />
    </>
  )
}
