import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import type { Product, CollectionProduct } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { CategoryResults } from '@/components/category/CategoryResults'
import { SubcategoryNavigator } from '@/components/category/SubcategoryNavigator'
import { parseSortKey, parseFilterParam, parseSearchParam, type CategorySearchParams } from '@/components/category/CategoryPageView'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { buildBreadcrumbListSchema, buildCollectionPageSchema, jsonLdSafe } from '@/lib/schema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { ProductSchema } from '@/components/schema/ProductSchema'
import { normalizeGtin } from '@/lib/gtin'
import { OFFER_SHIPPING_DETAILS, MERCHANT_RETURN_POLICY } from '@/lib/merchant-policy'
import { publicBrand } from '@/lib/brand'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { PARTNERS } from '@/lib/partners'
import {
  getL1ByCollectionHandle,
  buildL2Tree,
  getSubcategoriesForParent,
  humanizeTag,
  CATEGORY_TREE_L1,
  buildSubcategoryTagQuery,
  getProductCategoryPath,
  parseProductTags,
  type L2Node,
  getCategorySlug,
  getShopifyHandle,
} from '@/lib/category-tree'
import { fetchProductTagSummaries, hasFlatCategoryCollection } from '@/lib/category-tree-data.server'
import { getNonce } from '@/lib/csp-nonce'
import { getSubcategorySeo } from '@/lib/seo/categorySeo'
import { FAQSection } from '@/components/b2b/FAQSection'
import { resolveVariantsForProduct } from '@/lib/shipping-resolver/resolve'
import { isShippingResolverEnabled } from '@/lib/shipping-resolver/flag'
import { gateFreeShippingClaims } from '@/lib/shipping-resolver/free-shipping-gate'
import { attachCardShippingDisplay } from '@/lib/shipping-resolver/attach'
import { normalizeProduct, type RawProduct } from '@/lib/shopify/normalize'
import { resolveInitialVariant } from '@/lib/product/resolve-variant'
import { buildCanonical } from '@/lib/seo/canonical'
import { compareFacetValues } from '@/lib/catalog/facet-order'
import { getNumericShopifyProductId } from '@/lib/trustshop/product-id'
import { getProductReviewSummary, listProductReviews, getProductReviewMedia } from '@/lib/trustshop/product'
import type { ProductReviewFilter, ProductReviewSort } from '@/lib/trustshop/types'

// Fully dynamic (root layout reads headers() for the CSP nonce, M10, so this
// route can't be static/ISR'd — see the trade-off note in app/layout.tsx).
// Freshness comes from the fetch-level data cache below, not route-level
// revalidate/generateStaticParams.

// Offer freshness hint (M6): +30 days, date-only per Google's examples,
// mirroring /product/[slug]/page.tsx's identical helper. A top-level
// function rather than an inline `new Date(Date.now()...)` in the component
// body — react-hooks/purity flags a direct impure call at render time.
function buildPriceValidUntil(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// Data cache: 5-minute background revalidate, plus on-demand invalidation from
// the Shopify webhooks via per-handle tags (app/api/revalidate).
function productFetchOptions(handle: string) {
  return { next: { revalidate: 300, tags: ['shopify', 'products', `product:${handle}`] } }
}

interface Props {
  params: Promise<{ slug: string; product: string }>
  // LG-03: `variant` is only meaningful on the product-detail fallback below,
  // not the L2 category-grid render — kept as an intersection rather than
  // widening the shared CategorySearchParams type category pages also use.
  // reviewFilter/reviewSort/reviewPage: same reasoning, mirroring
  // /product/[slug]/page.tsx's dedicated searchParams shape.
  searchParams: Promise<CategorySearchParams & { variant?: string; reviewFilter?: string; reviewSort?: string; reviewPage?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, product: handle } = await params
  const sp = await searchParams
  // `slug` is the PUBLIC URL slug, which diverges from the real Shopify
  // collection handle for Face Masks (slug "face-masks", handle
  // "face-coverings") — getL1ByCollectionHandle matches on collectionHandle,
  // so it must be resolved through getShopifyHandle first (same pattern
  // components/category/CategoryPageView.tsx already uses).
  const l1 = getL1ByCollectionHandle(getShopifyHandle(slug))

  if (l1) {
    // Self-titled duplicate (/category/hygiene/hygiene) — same rule as the
    // CategoryProductPage redirect below. Handled here too so metadata never
    // computes for a URL about to redirect.
    if (handle === l1.tag) {
      return buildMetadata({
        pageType: 'category',
        title: l1.displayName,
        canonical: `${SITE_URL}${ROUTES.category(slug)}`,
        noIndex: true,
      })
    }
  }

  // Resolved regardless of whether `slug` itself matched a known L1 —
  // FIX-duplicate-category-urls Defect 2: a stale/renamed parent slug (e.g.
  // `skin-preparation`, no longer a registered L1) must never let this route
  // fall through to the raw product-handle lookup below, which can
  // coincidentally collide with an unrelated live product and render it in a
  // category's place (see the blood-collection-tubes / alcohol-prep-pads
  // brief notes — both hit exactly this).
  const summaries = await fetchProductTagSummaries()
  const l2Nodes = buildL2Tree(summaries)
  const node = l2Nodes.find((n) => n.tag === handle)

  if (node) {
    const title = humanizeTag(node.tag)
    const isDominantMatch = Boolean(l1 && node.parentTag === l1.tag)

    // Defect 1: this subcategory tag may ALSO be a standalone flat Shopify
    // collection at /category/<tag>, holding richer, curated copy — the
    // nested route only ever gets the neutral stub below. Flat is the chosen
    // canonical (2026-09-05 Izzy brief: it holds the real content and
    // existing rankings sit on it). Checked live rather than off a hardcoded
    // pair list, so this covers the full tree, not just the 8 sampled pairs.
    const flatExists = await hasFlatCategoryCollection(node.tag)
    if (flatExists) {
      return buildMetadata({
        pageType: 'subcategory',
        title,
        canonical: `${SITE_URL}${ROUTES.category(node.tag)}`,
        noIndex: true,
      })
    }

    if (!isDominantMatch) {
      // Node exists somewhere in the tree, just not under THIS slug (a stale
      // parent, or a boundary-override cross-link) — point to its real home.
      const canonicalL1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)!
      return buildMetadata({
        pageType: 'subcategory',
        title,
        canonical: `${SITE_URL}${ROUTES.subcategory(getCategorySlug(canonicalL1), node.tag)}`,
        noIndex: true,
      })
    }

    const canonical = `${SITE_URL}${ROUTES.subcategory(slug, node.tag)}`
    // Filtered / sorted / searched L2 views are noindex and canonicalize to
    // the clean route (plan §3.5).
    const isQueryVariant =
      parseFilterParam(sp.filter).length > 0 || Boolean(sp.sort) || Boolean(parseSearchParam(sp.q))

    if (isQueryVariant) {
      return buildMetadata({ pageType: 'subcategory', title, canonical, noIndex: true })
    }

    // Check SEO database for optimized title/description.
    const seoDB = getSubcategorySeo(slug, handle)
    if (seoDB) {
      const base = buildMetadata({
        pageType: 'subcategory',
        slug: handle,
        parentSlug: slug,
        description: seoDB.metaDescription,
        canonical,
      })
      const og = (base.openGraph ?? {}) as Record<string, unknown>
      return {
        ...base,
        title: seoDB.title,
        description: seoDB.metaDescription,
        openGraph: { ...og, title: seoDB.title, description: seoDB.metaDescription },
      }
    }

    // Neutral copy only — no shipping-speed or pricing promises in metadata
    // (client-liability stop rule).
    return buildMetadata({
      pageType: 'subcategory',
      title,
      description: `Shop ${title} within ${l1!.displayName} at MDSupplies.`,
      canonical,
    })
  }

  try {
    const data = await storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle }, productFetchOptions(handle))
    if (!data.product) return buildMetadata({ pageType: 'product', slug: handle })
    const p = data.product
    return buildMetadata({
      pageType: 'product',
      title: p.seo?.title || p.title,
      description: p.seo?.description || (p.description ? trimDescription(p.description, 155) : `Buy ${p.title} from MDSupplies`),
      slug: handle,
      image: p.images.nodes[0]?.url,
    })
  } catch {
    return buildMetadata({ pageType: 'product', slug: handle })
  }
}

async function renderSubcategoryPage(
  nonce: string | undefined,
  l1: { tag: string; displayName: string; collectionHandle: string },
  node: L2Node,
  l2Nodes: L2Node[],
  sp: CategorySearchParams,
  slug: string,
  handle: string,
) {
  const title = humanizeTag(node.tag)
  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const searchQuery = parseSearchParam(sp.q)
  const currentPage = parseInt(sp.page ?? '1', 10)
  if (isNaN(currentPage) || currentPage < 1) notFound()

  const siblings = getSubcategoriesForParent(l1.tag, l2Nodes).filter((n) => n.tag !== node.tag)
  const crossLinkL1 = node.crossLinkParentTag
    ? CATEGORY_TREE_L1.find((c) => c.tag === node.crossLinkParentTag)
    : undefined

  const canonicalUrl = `${SITE_URL}${ROUTES.subcategory(slug, handle)}`
  const seoData = getSubcategorySeo(slug, handle)

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb
          items={[
            { label: l1.displayName, href: ROUTES.category(slug) },
            { label: title },
          ]}
        />
      </div>

      {/* Compact L2 header (Phase 9): breadcrumb + H1 + parent context. No
          full-width banner — an L2 page should reach its products fast, and
          the wide thumbnail was mostly empty space once the CDN failed. */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
        <h1 className="text-navy-900 text-[26px] sm:text-[32px] font-semibold leading-[1.15] tracking-[-0.01em] mb-1">
          {seoData ? seoData.h1 : title}
        </h1>
        <p className="text-gray-500 text-[15px]">Part of {l1.displayName}</p>
        {seoData && (
          <p className="text-gray-500 text-[15px] leading-[1.6] mt-2 max-w-[640px] line-clamp-2">
            {seoData.answerBlock}
          </p>
        )}
        {crossLinkL1 && (
          <p className="text-gray-500 text-[14px] mt-2">
            Also relevant to{' '}
            <Link href={ROUTES.category(getCategorySlug(crossLinkL1))} className="text-teal-500 hover:underline">
              {crossLinkL1.displayName}
            </Link>
          </p>
        )}
      </div>

      {/* Sibling subcategories (Phase 7): the current one is marked active
          inside the navigator rather than appended as a dead chip. H-03:
          shares the filter rail's natural numeric-then-alphabetic comparator
          — plain localeCompare put numeric-prefixed medical subcategories
          (e.g. suture sizes) out of order the same way facet values were. */}
      <SubcategoryNavigator
        items={[
          ...siblings.map((sib) => ({
            label: humanizeTag(sib.tag),
            href: ROUTES.subcategory(slug, sib.tag),
          })),
          { label: title, href: ROUTES.subcategory(slug, handle), active: true },
        ].sort(compareFacetValues)}
        allHref={ROUTES.category(slug)}
        allLabel={`All ${l1.displayName}`}
        ariaLabel={`${l1.displayName} subcategories`}
      />

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6">
        <CategoryResults
          source={{ kind: 'tag', query: buildSubcategoryTagQuery(l1.tag, node.tag), title, slug: node.tag }}
          baseUrl={ROUTES.subcategory(slug, handle)}
          facetKey={getCategorySlug(l1)}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
          searchQuery={searchQuery}
          searchScopeTitle={title}
        />
      </div>

      {/* FAQ section — below product grid (SEO database) */}
      {seoData && seoData.faqs.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <FAQSection faq={seoData.faqs} />
        </div>
      )}

      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe(buildCollectionPageSchema({ name: title, url: canonicalUrl })),
        }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe(
            buildBreadcrumbListSchema(
              [{ label: l1.displayName, href: ROUTES.category(slug) }, { label: title }],
              canonicalUrl,
            ),
          ),
        }}
      />
    </main>
  )
}

export default async function CategoryProductPage({ params, searchParams }: Props) {
  const nonce = await getNonce()
  const { slug, product: handle } = await params
  const sp = await searchParams
  // See generateMetadata above for why this must resolve through
  // getShopifyHandle first, not the raw public slug.
  const l1 = getL1ByCollectionHandle(getShopifyHandle(slug))

  // Self-titled duplicate (/category/hygiene/hygiene) — collapse onto the
  // parent category page instead of falling through to the product lookup
  // below and 404ing. buildL2Tree() already excludes this tag as an L2 node
  // (lib/category-tree.ts), so without this explicit redirect the URL would
  // silently start returning 404 instead of resolving cleanly.
  if (l1 && handle === l1.tag) {
    redirect(ROUTES.category(slug))
  }

  // Resolved regardless of whether `slug` matched a known L1 — see the
  // matching comment in generateMetadata above (FIX-duplicate-category-urls
  // Defect 2).
  const summaries = await fetchProductTagSummaries()
  const l2Nodes: L2Node[] = buildL2Tree(summaries)
  const node = l2Nodes.find((n) => n.tag === handle)

  if (node) {
    const isDominantMatch = Boolean(l1 && node.parentTag === l1.tag)

    // Defect 1: flat form is the chosen canonical when this tag also has its
    // own standalone Shopify collection — see hasFlatCategoryCollection's
    // doc comment.
    if (await hasFlatCategoryCollection(node.tag)) {
      redirect(ROUTES.category(node.tag))
    }

    if (isDominantMatch) {
      return renderSubcategoryPage(nonce, l1!, node, l2Nodes, sp, slug, handle)
    }

    // Node exists somewhere in the tree, just not under THIS slug (a stale
    // parent, or a boundary-override cross-link) — send it to its real home
    // instead of falling through to the product lookup below.
    const canonicalL1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)!
    redirect(ROUTES.subcategory(getCategorySlug(canonicalL1), node.tag))
  }

  // Fall back to product
  const rawProductData = await storefrontFetch<{ product: RawProduct | null }>(
    GET_PRODUCT,
    { handle },
    productFetchOptions(handle),
  )

  if (!rawProductData.product) notFound()
  // Same metafield flattening as /product/[slug] — without it ProductView
  // receives raw `{ value }` objects (broken spec rows / backorder date).
  const productData = { product: normalizeProduct(rawProductData.product) }
  if (productData.product.variants.nodes.length === 0) notFound()

  const partner = PARTNERS.find(
    (p) => p.isActive && p.vendorName === productData.product!.vendor,
  ) ?? null

  // TrustShop reviews (parity with /product/[slug]/page.tsx): never allowed
  // to fail the PDP — see that route's identical comment for why the outer
  // try/catch is belt-and-suspenders alongside each call's own .catch(null).
  let numericProductId: number | null = null
  try {
    numericProductId = getNumericShopifyProductId(productData.product.id)
  } catch {
    numericProductId = null
  }

  const reviewFilter = sp.reviewFilter as ProductReviewFilter | undefined
  const reviewSort = sp.reviewSort as ProductReviewSort | undefined
  const reviewPage = Number(sp.reviewPage) > 0 ? Number(sp.reviewPage) : 1

  const [reviewSummary, reviewsPage, reviewMediaPage] = numericProductId
    ? await Promise.all([
        getProductReviewSummary(numericProductId).catch(() => null),
        listProductReviews(numericProductId, { filter: reviewFilter, sort: reviewSort, currentPage: reviewPage }).catch(() => null),
        getProductReviewMedia(numericProductId, { perPage: 20 }).catch(() => null),
      ])
    : [null, null, null]

  const recsData = await storefrontFetch<{
    related: CollectionProduct[]
    complementary: CollectionProduct[]
  }>(GET_PRODUCT_RECS, { handle }, productFetchOptions(handle)).catch(() => ({
    related: [] as CollectionProduct[],
    complementary: [] as CollectionProduct[],
  }))

  // DEV-SHIP-02: same AND-gate as /product/[slug] — see
  // lib/shipping-resolver/free-shipping-gate.ts.
  const variantShippingDisplays = isShippingResolverEnabled()
    ? gateFreeShippingClaims(resolveVariantsForProduct(productData.product.id), productData.product.freeShipping)
    : {}

  // LG-03: same `?variant=` resolution as /product/[slug] — see
  // lib/product/resolve-variant.ts — so this route can't drift from it.
  const resolvedVariant = resolveInitialVariant(productData.product.variants.nodes, sp.variant)
  // Neutral, query-free URL regardless of the selected variant.
  const productUrl = buildCanonical({
    path: `/category/${slug}/${handle}`,
    strategy: 'base-product',
    basePath: `/category/${slug}/${handle}`,
  })

  // Parity fix (2026-08-14): this route previously rendered no ProductSchema
  // at all — /product/[slug] is the only route that had it. Mirrors that
  // route's schemaProps exactly, including preferring the resolved variant's
  // own image/mpn so structured data can't disagree with what's rendered
  // (AeroWalk: White/Grey must never emit Blue's image/mpn here either).
  const isAvailable = resolvedVariant?.availableForSale ?? productData.product.availableForSale
  const schemaProps = {
    name: productData.product.title,
    description: productData.product.description,
    image: resolvedVariant?.image?.url ?? productData.product.images.nodes[0]?.url ?? '',
    sku: resolvedVariant?.sku || handle,
    gtin: normalizeGtin(resolvedVariant?.barcode),
    mpn: resolvedVariant?.manufacturerNumber ?? undefined,
    brand: publicBrand(productData.product) ?? undefined,
    price: parseFloat(resolvedVariant?.price?.amount ?? '0'),
    priceCurrency: resolvedVariant?.price?.currencyCode ?? 'USD',
    availability: (isAvailable ? 'InStock' : 'OutOfStock') as 'InStock' | 'OutOfStock' | 'PreOrder',
    url: productUrl,
    seller: 'MDSupplies',
    priceValidUntil: buildPriceValidUntil(),
    ...(OFFER_SHIPPING_DETAILS ? { shippingDetails: OFFER_SHIPPING_DETAILS } : {}),
    ...(MERCHANT_RETURN_POLICY ? { returnPolicy: MERCHANT_RETURN_POLICY } : {}),
    // Identical normalized TrustShop summary the visible UI uses — omitted
    // entirely (not a fabricated 0/empty rating) for a zero-review product.
    // Mirrors /product/[slug]/page.tsx's identical block.
    ...(reviewSummary && reviewSummary.totalReviews > 0
      ? {
          aggregateRating: {
            ratingValue: reviewSummary.averageRating,
            reviewCount: reviewSummary.totalReviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }

  const { categories, subcategories } = parseProductTags(productData.product.tags)
  const categoryPath = getProductCategoryPath(
    { handle: productData.product.handle, categories, subcategories },
    l2Nodes,
  )

  const breadcrumbs = categoryPath
    ? [
        { label: categoryPath.category.displayName, href: ROUTES.category(getCategorySlug(categoryPath.category)) },
        ...(categoryPath.subcategory
          ? [{
              label: humanizeTag(categoryPath.subcategory.tag),
              href: ROUTES.subcategory(getCategorySlug(categoryPath.category), categoryPath.subcategory.tag),
            }]
          : []),
      ]
    : [{ label: 'Categories', href: '/categories' }]

  return (
    <main id="main-content" className="bg-[#f9fafc]">
      {/* og:type `product` is outside Next's Metadata union — rendered here
          and hoisted into <head> by React 19 (audit L10). */}
      <meta property="og:type" content="product" />
      <ProductSchema {...schemaProps} />
      <BreadcrumbSchema
        items={[...breadcrumbs, { label: productData.product.title }]}
        currentUrl={productUrl}
      />
      <ProductView
        product={productData.product}
        initialVariant={resolvedVariant}
        relatedProducts={attachCardShippingDisplay(recsData.related)}
        complementaryProducts={attachCardShippingDisplay(recsData.complementary)}
        breadcrumbs={breadcrumbs}
        partnerSlug={partner?.slug ?? null}
        variantShippingDisplays={variantShippingDisplays}
        reviewSummary={reviewSummary}
        reviewsSection={{
          basePath: `/category/${slug}/${handle}`,
          productGid: productData.product.id,
          summary: reviewSummary,
          reviews: reviewsPage?.reviews ?? null,
          media: reviewMediaPage?.media ?? [],
          currentFilter: reviewFilter ?? 'all',
          currentSort: reviewSort ?? 'most_helpful',
          currentPage: reviewsPage?.currentPage ?? reviewPage,
          hasNextPage: reviewsPage?.hasNextPage ?? false,
        }}
      />
    </main>
  )
}
