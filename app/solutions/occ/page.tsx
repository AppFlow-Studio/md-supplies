import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { CatalogGridSkeleton } from '@/components/category/CatalogGridSkeleton'
import { buildMetadata } from '@/lib/seo'
import { getSolutionSeo } from '@/lib/seo/solutionSeo'
import { OCC_HUB } from '@/lib/occ'
import { getOccCollectionHandle } from '@/lib/occ-collection'
import { CategoryResults } from '@/components/category/CategoryResults'
import { SubcategoryNavigator } from '@/components/category/SubcategoryNavigator'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { FAQSection } from '@/components/b2b/FAQSection'
import {
  parseSortKey,
  parseFilterParam,
  parseSearchParam,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION_HERO } from '@/lib/shopify/queries/collections'
import type { CollectionHero } from '@/lib/shopify/types'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'

// OCC is a CATEGORY, not a marketing hub — it is one canonical Shopify
// collection browsed like any other. This route therefore mirrors
// CategoryPageView's structure exactly: breadcrumb → compact hero →
// subcategory navigator → discovery toolbar + filters + grid + pagination →
// FAQ. The old featured-products block is gone; a curated dozen products
// standing in front of the real assortment was the original DEV-OCC-01 defect.
//
// /solutions/occ is the ONLY OCC route. /category/occ (the raw collection
// handle) 301s here from proxy.ts so the two cannot compete.

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

// Static metadata (Cache Components): searchParams is no longer read here, so the
// route prerenders. Filter/sort/search/page variants are consolidated to this
// clean URL by the self-referencing canonical below rather than a per-URL
// noindex — the grid for those variants streams from the <Suspense> boundary in
// the page. (SEO posture change vs the old per-URL noindex.)
export const metadata: Metadata = {
  ...baseMetadata(),
  alternates: { canonical: `${SITE_URL}${ROUTES.solutions.occ}` },
}

export default async function OCCPage({ searchParams }: Props) {
  const occHandle = getOccCollectionHandle()

  // Hero copy comes from the canonical collection when Shopify has it, falling
  // back to the curated OCC copy. `available: false` means the canonical
  // collection could not be resolved at all.
  const hero = await storefrontFetch<{ collection: CollectionHero | null }>(
    GET_COLLECTION_HERO,
    { handle: occHandle },
    { next: { revalidate: 300, tags: ['shopify', 'collections', `collection:${occHandle}`] } },
  ).catch(() => null)
  const available = Boolean(hero?.collection)

  const title = OCC_HUB.title
  const description = OCC_HUB.intro

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <WebPageSchema
        name={_occSeo?.title ?? OCC_HUB.seoTitle ?? title}
        description={_occSeo?.metaDescription ?? OCC_HUB.seoDescription ?? description}
        url={`${SITE_URL}${ROUTES.solutions.occ}`}
      />
      <BreadcrumbSchema items={[{ label: 'OCC', href: ROUTES.solutions.occ }]} />

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb items={[{ label: title }]} />
      </div>

      {/* Compact hero, matching category pages (Phase 9 density). */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
        <h1 className="text-navy-900 text-[28px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.15] tracking-[-0.01em] mb-2">
          {title}
        </h1>
        <p className="text-gray-500 text-[15px] leading-[1.6] max-w-[640px] line-clamp-2">
          {description}
        </p>
      </div>

      {/* OCC categories as crawlable subcategory navigation, same component
          and behaviour as an L1 category page. */}
      <SubcategoryNavigator
        items={OCC_HUB.eligibleCategories.map((cat) => ({
          label: cat.title,
          href: ROUTES.category(cat.handle),
        }))}
        allHref={ROUTES.solutions.occ}
        allLabel={`All ${title}`}
        allActive
        ariaLabel="OCC categories"
      />

      {/* Toolbar + filters + grid + pagination — the shared catalog engine. */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        {available ? (
          <Suspense fallback={<CatalogGridSkeleton />}>
            <OCCResults searchParams={searchParams} occHandle={occHandle} title={title} />
          </Suspense>
        ) : (
          // Canonical collection unresolved (see lib/occ-collection.ts):
          // neutral state, never a tag-scanned fallback assortment.
          <p className="text-gray-500 text-[15px]">
            The OCC catalog is temporarily unavailable. Browse the categories
            above or contact our team for help with an OCC order.
          </p>
        )}
      </div>

      {/* Program context + FAQ below the products, as on category pages. */}
      <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
        <h2 className="text-navy-900 text-[18px] font-semibold mb-3">About the OCC Collection</h2>
        <p className="text-gray-500 text-[15px] leading-[1.75] max-w-[880px]">
          {OCC_HUB.programExplanation}
        </p>
      </section>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
        <FAQSection faq={OCC_HUB.faq} />
      </div>
    </main>
  )
}

// Reads searchParams → the request-time dynamic hole (Cache Components). The rest
// of the page (hero, breadcrumb, subcategory nav, About, FAQ) is the prerendered
// static shell around the <Suspense> boundary in OCCPage.
async function OCCResults({ searchParams, occHandle, title }: {
  searchParams: Props['searchParams']
  occHandle: string
  title: string
}) {
  const sp = await searchParams
  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const searchQuery = parseSearchParam(sp.q)
  const currentPage = parseInt(sp.page ?? '1', 10)
  if (isNaN(currentPage) || currentPage < 1) notFound()

  return (
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
      searchScopeTitle={title}
    />
  )
}
