import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION_HERO } from '@/lib/shopify/queries/collections'
import type { CollectionHero } from '@/lib/shopify/types'
import { CategoryResults } from '@/components/category/CategoryResults'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { buildCollectionPageSchema, buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { getClusterLinks } from '@/lib/cluster-links'
import { MAX_CATEGORY_PAGE } from '@/lib/category-utils'
import { parsePageSize, DEFAULT_PAGE_SIZE } from '@/lib/catalog/page-size'
import type { ProductSource } from '@/lib/category-results-source'
import {
  buildL2Tree,
  getSubcategoriesForParent,
  getL1ByCollectionHandle,
  humanizeTag,
  CATEGORY_TREE_L1,
  getCategorySlug,
  getShopifyHandle,
  getFeaturedSubcategoryBySlug,
  getFeaturedSubcategoriesForParent,
} from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { CatalogHero } from '@/components/category/CatalogHero'
import { getCategoryBannerConfig } from '@/lib/bunnycdn'
import { isAllowedFilterInput } from '@/lib/filter-registry'
import { withTrackingParams } from '@/lib/analytics/tracking-params'
import { getNonce } from '@/lib/csp-nonce'
import { getCategorySeo } from '@/lib/seo/categorySeo'
import { FAQSection } from '@/components/b2b/FAQSection'
import { logServerError, logCategoryEvent } from '@/lib/log-error'
import type { ProductTagSummary } from '@/lib/category-tree'

// Server-rendered category view for the single canonical route
// app/category/[slug], which reads searchParams directly. The former
// /category-browse twin and its proxy rewrite were removed in Phase 5: having
// the clean and filtered views on different route segments forced a remount on
// every filter/sort/search interaction.

export type CategorySearchParams = {
  sort?: string
  filter?: string | string[]
  page?: string
  /** DEV-SEARCH-01: collection-scoped search text. */
  q?: string | string[]
  /** "Show [N] per page" — validated by lib/catalog/page-size. */
  per_page?: string | string[]
}

/** ?q= must be a single sane string; arrays and junk collapse to undefined. */
export function parseSearchParam(q?: string | string[]): string | undefined {
  if (typeof q !== 'string') return undefined
  const trimmed = q.trim()
  return trimmed ? trimmed.slice(0, 80) : undefined
}

// Data cache: 5-minute background revalidate, plus on-demand invalidation from
// the Shopify collections/* webhook via the per-handle tag (app/api/revalidate).
function collectionFetchOptions(slug: string) {
  return { next: { revalidate: 300, tags: ['shopify', 'collections', `collection:${slug}`] } }
}

export function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'COLLECTION_DEFAULT', reverse: false }
  }
}

export function parseFilterParam(filter?: string | string[]): string[] {
  if (!filter) return []
  const raw = Array.isArray(filter) ? filter : [filter]
  // Default-deny URL-supplied inputs (rejects tag filters and unknown keys)
  // before they reach the Storefront API, chips, or pagination links.
  return raw.filter(isAllowedFilterInput)
}

// Beyond MAX_CATEGORY_PAGE (the product index's own cap) a request is a
// crawler or a hand-edited URL — bounce to page 1 instead of erroring,
// mirroring the fetch-failure fallback in CategoryResults.
function page1RedirectUrl(slug: string, sp: CategorySearchParams, activeFilterStrings: string[]): string {
  const p = new URLSearchParams()
  if (sp.sort) p.set('sort', sp.sort)
  activeFilterStrings.forEach((f) => p.append('filter', f))
  const q = parseSearchParam(sp.q)
  if (q) p.set('q', q)
  const perPage = parsePageSize(sp.per_page)
  if (perPage !== DEFAULT_PAGE_SIZE) p.set('per_page', String(perPage))
  withTrackingParams(p, sp)
  const qs = p.toString()
  return qs ? `${ROUTES.category(slug)}?${qs}` : ROUTES.category(slug)
}

export async function buildCategoryMetadata(slug: string, sp: CategorySearchParams): Promise<Metadata> {
  const base = SITE_URL

  const activeFilterStrings = parseFilterParam(sp.filter)
  // Search and page-size states are noindex like filtered states (plan §3.5).
  // ?per_page= renders the same products in a different quantity, so leaving it
  // indexable would mint five addresses per category for one set of content.
  const isFiltered =
    activeFilterStrings.length > 0 ||
    Boolean(sp.sort) ||
    Boolean(parseSearchParam(sp.q)) ||
    parsePageSize(sp.per_page) !== DEFAULT_PAGE_SIZE
  const requestedPage = parseInt(sp.page ?? '1', 10)
  const currentPage = requestedPage > MAX_CATEGORY_PAGE ? 1 : requestedPage

  // `slug` is the public canonical URL segment; a handful of categories
  // (e.g. face-masks) alias it to a differently-named live Shopify
  // collection (face-coverings) — see lib/category-tree.ts's
  // getCategorySlug/CANONICAL_SLUG_BY_HANDLE.
  // Every Shopify-facing lookup below must use the real handle, not slug.
  const shopifyHandle = getShopifyHandle(slug)

  try {
    const data = await storefrontFetch<{ collection: CollectionHero | null }>(
      GET_COLLECTION_HERO,
      { handle: shopifyHandle },
      collectionFetchOptions(shopifyHandle),
    )
    if (!data.collection) return buildMetadata({ pageType: 'category', title: 'Category' })
    const { description, seo } = data.collection
    // Approved public display name, not the Shopify collection title: the
    // collection behind Face Masks is titled "Face Coverings" and the one
    // behind Room Furniture is "Stools & Seating". Nav, breadcrumbs, tiles and
    // schema all use the display name, so metadata must too or the page's
    // title disagrees with every link pointing at it.
    const l1 = getL1ByCollectionHandle(shopifyHandle)
    const featured = l1 ? undefined : getFeaturedSubcategoryBySlug(shopifyHandle)
    const displayName = l1?.displayName ?? featured?.displayName ?? data.collection.title

    // A tag-sourced category must NOT inherit its proxy collection's SEO
    // fields. /category/trocars-trocar-kits now serves all 319 Surgery &
    // Procedure products, but the collection's own seo.title is
    // "Trocars & Trocar Kits - 3.2mm, 3.5mm, 4.5mm - FDA Registered" — a title
    // describing 41 of them, and an FDA claim that does not hold for the wider
    // set. Same for Room Furniture ("Stools & Seating") and Apparel. Those
    // routes take the registry's name and approved description instead.
    const isProxyCollection = l1?.productSet === 'tag'
    // Featured subcategories are held to the same rule as proxy collections,
    // for the second half of the reason above rather than the first. The scope
    // problem is gone (this route now serves exactly the 41 products the
    // Trocar collection's seo.title describes) but the CLAIM is not: that
    // title asserts "FDA Registered", an uncontrolled regulatory statement
    // from the merchandising team that this codebase cannot verify. The
    // registry name and approved description are used instead.
    const useRegistryCopy = isProxyCollection || Boolean(featured)
    const metaTitle = (useRegistryCopy ? undefined : seo?.title) || displayName
    // Shopify-sourced descriptions are UNCONTROLLED copy from the merchandising
    // team, so both the SEO field and the body description get clamped. Exam
    // Room's Shopify seo.description is 314 characters — over twice what a SERP
    // shows — and it was being emitted whole because only the body-description
    // fallback was trimmed.
    const metaDescription = useRegistryCopy
      ? (l1?.shortDescription ?? featured!.shortDescription)
      : trimDescription(seo?.description || description || '', 155) || undefined

    if (isFiltered) {
      return buildMetadata({
        pageType: 'category',
        title: metaTitle,
        description: metaDescription,
        canonical: `${base}/category/${slug}`,
        noIndex: true,
        image: data.collection.image?.url,
        imageWidth: data.collection.image?.width,
        imageHeight: data.collection.image?.height,
      })
    }

    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'category',
        title: metaTitle,
        description: metaDescription,
        canonical: `${base}/category/${slug}?page=${currentPage}`,
        image: data.collection.image?.url,
        imageWidth: data.collection.image?.width,
        imageHeight: data.collection.image?.height,
      })
    }

    // Unfiltered page 1: use SEO database values when available.
    const seoDB = getCategorySeo(slug)
    if (seoDB) {
      const base = buildMetadata({
        pageType: 'category',
        slug,
        description: seoDB.metaDescription,
        image: data.collection.image?.url,
        imageWidth: data.collection.image?.width,
        imageHeight: data.collection.image?.height,
      })
      const og = (base.openGraph ?? {}) as Record<string, unknown>
      return {
        ...base,
        title: seoDB.title,
        description: seoDB.metaDescription,
        openGraph: { ...og, title: seoDB.title, description: seoDB.metaDescription },
      }
    }

    return buildMetadata({
      pageType: 'category',
      title: metaTitle,
      slug,
      description: metaDescription,
      image: data.collection.image?.url,
      imageWidth: data.collection.image?.width,
      imageHeight: data.collection.image?.height,
    })
  } catch {
    return buildMetadata({ pageType: 'category', title: 'Category' })
  }
}

export async function CategoryPageView({ slug, sp }: { slug: string; sp: CategorySearchParams }) {
  const nonce = await getNonce()
  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const searchQuery = parseSearchParam(sp.q)
  const currentPage = parseInt(sp.page ?? '1', 10)
  const pageSize = parsePageSize(sp.per_page)
  const isFiltered =
    activeFilterStrings.length > 0 ||
    Boolean(sp.sort) ||
    Boolean(searchQuery) ||
    pageSize !== DEFAULT_PAGE_SIZE

  if (isNaN(currentPage) || currentPage < 1) notFound()
  if (currentPage > MAX_CATEGORY_PAGE) redirect(page1RedirectUrl(slug, sp, activeFilterStrings))

  // `slug` is the public canonical URL segment; a handful of categories
  // (e.g. face-masks) alias it to a differently-named live Shopify
  // collection (face-coverings) — see lib/category-tree.ts's
  // getCategorySlug/CANONICAL_SLUG_BY_HANDLE.
  // Every Shopify-facing lookup below must use the real handle, not slug.
  const shopifyHandle = getShopifyHandle(slug)

  const l1 = getL1ByCollectionHandle(shopifyHandle)
  // A featured subcategory (e.g. Trocars & Trocar Kits) is a real collection
  // page with an L1 parent — it has no CATEGORY_TREE_L1 row, so without this
  // it would fall back to the raw Shopify collection title and a one-level
  // breadcrumb. Resolved only when `l1` missed, so an L1 can never be
  // shadowed by a subcategory entry.
  const featured = l1 ? undefined : getFeaturedSubcategoryBySlug(shopifyHandle)
  const featuredParent = featured
    ? CATEGORY_TREE_L1.find((c) => c.tag === featured.parentTag)
    : undefined

  // The hero/product fetch stays on the critical path (a real failure there
  // SHOULD show the error boundary — the page has no products to show). The
  // tag scan only feeds the subcategory footer list, and Related Categories
  // sourcing is independent of it (CATEGORY_TREE_L1 is static), so its
  // failure degrades to "no subcategory footer" rather than no page at all.
  const [data, summaries] = await Promise.all([
    storefrontFetch<{ collection: CollectionHero | null }>(
      GET_COLLECTION_HERO,
      { handle: shopifyHandle },
      collectionFetchOptions(shopifyHandle),
    ),
    fetchProductTagSummaries().catch((err) => {
      logServerError('category-subcategory-scan', err)
      logCategoryEvent({ route: `/category/${slug}`, handle: shopifyHandle, outcome: 'subcategory_scan_failed' })
      return [] as ProductTagSummary[]
    }),
  ])

  if (!data.collection) {
    logCategoryEvent({ route: `/category/${slug}`, handle: shopifyHandle, outcome: 'collection_missing' })
    notFound()
  }

  // productCount is intentionally omitted here: GET_COLLECTION_HERO does not
  // fetch products (CollectionHero has no `products` field), so no count is
  // available at this point in the render. CategoryResults below performs
  // its own separate product fetch.
  logCategoryEvent({
    route: `/category/${slug}`,
    handle: shopifyHandle,
    outcome: 'ok',
  })

  const { collection } = data

  const l2Nodes = buildL2Tree(summaries)
  const subcategories = l1
    ? getSubcategoriesForParent(l1.tag, l2Nodes).map((n) => ({ label: humanizeTag(n.tag), slug: n.tag }))
    : []
  const relatedCategories = CATEGORY_TREE_L1
    .filter((c) => c.tag !== l1?.tag)
    .slice(0, 6)
    .map((c) => ({ label: c.displayName, slug: getCategorySlug(c) }))

  const banner = getCategoryBannerConfig(shopifyHandle)
  const clusterLinks = getClusterLinks(shopifyHandle)

  // Public display name comes from the registry, not the Shopify collection
  // title: the collection behind Face Masks is titled "Face Coverings" and the
  // one behind Room Furniture is "Stools & Seating", neither of which is the
  // approved public name used in nav, breadcrumbs, tiles and metadata.
  const displayName = l1?.displayName ?? featured?.displayName ?? collection.title

  // Breadcrumb: a featured subcategory sits under its L1 parent
  // (Home › Surgery & Procedure › Trocars & Trocar Kits); everything else is a
  // single level below Home, which the Breadcrumb component supplies.
  const breadcrumb: { label: string; href?: string }[] =
    featured && featuredParent
      ? [
          { label: featuredParent.displayName, href: ROUTES.category(getCategorySlug(featuredParent)) },
          { label: displayName },
        ]
      : [{ label: displayName }]

  // Route-level subcategory links pinned ahead of the Category facet pills.
  // These NAVIGATE (they are their own collection pages) rather than filter, so
  // they are passed separately from the facet the tab row is a view over.
  const featuredChildren = l1
    ? getFeaturedSubcategoriesForParent(l1.tag).map((s) => ({
        label: s.displayName,
        href: ROUTES.category(s.slug),
      }))
    : []

  // Four categories' collections are narrow artwork proxies rather than the
  // category itself (see L1CategoryDef.productSet). Those browse the
  // `category:` tag so the page shows what its own tile promises; the rest keep
  // the collection source and its richer sort keys.
  const isProxyCollection = l1?.productSet === 'tag'

  // What CollectionPage schema may say about this route. Featured
  // subcategories and tag-sourced proxies both take the approved registry copy
  // rather than the uncontrolled Shopify collection description.
  const schemaDescription = featured
    ? featured.shortDescription
    : isProxyCollection
      ? l1!.shortDescription
      : collection.description

  const productSource: ProductSource =
    l1?.productSet === 'tag'
      ? { kind: 'tag', query: `tag:"category:${l1.tag}"`, title: displayName, slug }
      : {
          kind: 'collection',
          handle: shopifyHandle,
          // Registry-backed L1s scope text search by their category tag
          // (the same membership source the L2 pages are built on).
          //
          // A featured subcategory deliberately gets NO tag scope. Its products
          // carry the PARENT's tag (every Trocar product is
          // `category:surgery-procedure`), so a tag scope would widen search on
          // this page from 41 products to 323 — searching "trocar" inside
          // Trocars would surface scalpels. Falling through to the collection
          // ID-intersection path makes membership the collection itself, which
          // is the page's actual identity.
          searchScope: l1 ? `tag:"category:${l1.tag}"` : undefined,
        }

  const cacheTags =
    productSource.kind === 'tag'
      ? ['shopify', 'products', 'category-tree', `category:${l1!.tag}`]
      : ['shopify', 'products', 'collections', `collection:${shopifyHandle}`]

  // SEO database — H1 override, answer block, and FAQ on unfiltered page 1.
  const seoData = (!isFiltered && currentPage === 1) ? getCategorySeo(slug) : undefined

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <CatalogHero
        breadcrumb={breadcrumb}
        title={seoData ? seoData.h1 : displayName}
        // The COMPLETE approved description from the route registry, shown in
        // full on every breakpoint. `shortDescription` is the client-approved
        // copy table; the Shopify collection description is the fallback for
        // anything not in the registry (e.g. OCC sub-collections).
        description={
          l1?.shortDescription ??
          featured?.shortDescription ??
          (isProxyCollection ? undefined : collection.description ?? undefined)
        }
        eyebrow="CERTIFIED MEDICAL SUPPLIER"
        image={{ path: banner.path, alt: banner.alt, focalPosition: banner.focalPosition }}
      />

      {/* Answer-first block (AEO). The hero carries the approved category
          description; this is the longer, question-resolving paragraph from the
          SEO database, and it renders only on the canonical unfiltered page 1
          where it is accurate. It used to be squeezed into the hero under a
          two-line clamp, which truncated it mid-sentence and displaced the
          approved description. */}
      {seoData?.answerBlock && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pt-5">
          <p className="text-gray-600 text-[15px] leading-[1.7] max-w-[72ch]">
            {seoData.answerBlock}
          </p>
        </div>
      )}

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6">
        <CategoryResults
          source={productSource}
          baseUrl={ROUTES.category(slug)}
          facetKey={slug}
          facetKind="category"
          pageSize={pageSize}
          cacheTags={cacheTags}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
          searchQuery={searchQuery}
          searchScopeTitle={displayName}
          tabsAllLabel={`All ${displayName}`}
          tabsLeadingLinks={featuredChildren}
        />
      </div>

      {/* FAQ section — below product grid (SEO database) */}
      {seoData && seoData.faqs.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <FAQSection faq={seoData.faqs} />
        </div>
      )}

      {/* ── Subcategory links ──
          The interactive subcategory control is now the Category-facet tab row
          above the grid (CategoryTabs), which filters in place instead of
          navigating away. These L2 routes still exist and are still in the
          sitemap, so they keep a crawlable, server-rendered link list here —
          removing the old navigator without this would have orphaned every
          /category/<slug>/<sub> page. */}
      {subcategories.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Browse {displayName} subcategories
          </h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 list-none m-0 p-0">
            {subcategories.map((sub) => (
              <li key={sub.slug}>
                <Link
                  href={ROUTES.subcategory(slug, sub.slug)}
                  className="text-ink-link text-[14px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
                >
                  {sub.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related categories */}
      {relatedCategories.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Related Categories
          </h2>
          <div className="flex flex-wrap gap-3">
            {relatedCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={ROUTES.category(cat.slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Cluster: Industries & Partners ── */}
      {clusterLinks && (clusterLinks.industryLinks.length > 0 || clusterLinks.partnerLinks.length > 0 || clusterLinks.occEligible) && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-6">Shop by Need</h2>
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
            {clusterLinks.industryLinks.length > 0 && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Industries
                </p>
                <div className="flex flex-wrap gap-2">
                  {clusterLinks.industryLinks.map((ind) => (
                    <Link
                      key={ind.slug}
                      href={ROUTES.industry(ind.slug)}
                      className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
                    >
                      {ind.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {clusterLinks.partnerLinks.length > 0 && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Brands
                </p>
                <div className="flex flex-wrap gap-2">
                  {clusterLinks.partnerLinks.map((p) => (
                    <Link
                      key={p.slug}
                      href={ROUTES.partner(p.slug)}
                      className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {clusterLinks.occEligible && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Programs
                </p>
                <Link
                  href={ROUTES.solutions.occ}
                  className="border border-teal-500 bg-teal-50 text-ink-link text-[14px] px-4 py-2 hover:bg-teal-100 transition-colors inline-block"
                >
                  OCC Program — Bulk Orders
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── About section — dark navy background ──
          Suppressed on tag-sourced routes for the same reason their metadata
          ignores the collection's SEO fields: this prose describes the narrow
          proxy collection (trocars, stools, capes & gowns), not the category
          the page now serves, and on the trocars collection it carries an
          FDA-registration claim that does not hold for all 319 Surgery &
          Procedure products. Better no About block than a wrong one.
          Featured subcategories are suppressed on the claim grounds alone —
          their scope is exact, but the regulatory assertion in the Shopify
          copy is still unverifiable here (see the metadata comment above). */}
      {!isProxyCollection && !featured && collection.descriptionHtml && (
        <section className="bg-navy-900 py-16 sm:py-20">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 text-center">
            <h2 className="text-white text-[36px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-8">
              About {displayName}
            </h2>
            <div
              className="prose prose-invert max-w-[880px] mx-auto text-[15px] leading-[1.85] text-white/75
                prose-headings:text-white prose-a:text-teal-300 prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          </div>
        </section>
      )}

      {!isFiltered && (
        <>
          <script
            type="application/ld+json"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: jsonLdSafe(
                buildCollectionPageSchema({
                  name: displayName,
                  url: `${SITE_URL}/category/${slug}`,
                  // Structured data is customer-facing (it feeds rich results),
                  // so it follows the SAME copy rule as the title, meta
                  // description and About block — a featured subcategory does
                  // not emit the Shopify collection description, whose Trocar
                  // text asserts "FDA-registered". Suppressing that claim in
                  // three places and then shipping it in the fourth would have
                  // published it anyway.
                  ...(schemaDescription ? { description: schemaDescription } : {}),
                  ...(collection.image?.url ? { image: collection.image.url } : {}),
                }),
              ),
            }}
          />
          <script
            type="application/ld+json"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: jsonLdSafe(
                buildBreadcrumbListSchema(
                  // Same array the visible trail renders, so the structured
                  // data can never claim a different hierarchy than the page.
                  breadcrumb,
                  `${SITE_URL}/category/${slug}`,
                ),
              ),
            }}
          />
        </>
      )}
    </main>
  )
}
