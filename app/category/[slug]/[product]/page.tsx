import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import type { Product, CollectionProduct } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { CategoryResults } from '@/components/category/CategoryResults'
import { parseSortKey, parseFilterParam, type CategorySearchParams } from '@/components/category/CategoryPageView'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { buildBreadcrumbListSchema, buildCollectionPageSchema, jsonLdSafe } from '@/lib/schema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
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
} from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { getNonce } from '@/lib/csp-nonce'

// Fully dynamic (root layout reads headers() for the CSP nonce, M10, so this
// route can't be static/ISR'd — see the trade-off note in app/layout.tsx).
// Freshness comes from the fetch-level data cache below, not route-level
// revalidate/generateStaticParams.

// Data cache: 5-minute background revalidate, plus on-demand invalidation from
// the Shopify webhooks via per-handle tags (app/api/revalidate).
function productFetchOptions(handle: string) {
  return { next: { revalidate: 300, tags: ['shopify', 'products', `product:${handle}`] } }
}

interface Props {
  params: Promise<{ slug: string; product: string }>
  searchParams: Promise<CategorySearchParams>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, product: handle } = await params
  const l1 = getL1ByCollectionHandle(slug)

  if (l1) {
    const summaries = await fetchProductTagSummaries()
    const l2Nodes = buildL2Tree(summaries)
    const node = l2Nodes.find((n) => n.tag === handle)

    if (node && (node.parentTag === l1.tag || node.crossLinkParentTag === l1.tag)) {
      const canonicalL1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)!
      const title = humanizeTag(node.tag)
      return buildMetadata({
        pageType: 'subcategory',
        title,
        description: `Shop ${title} within ${canonicalL1.displayName} at MDSupplies — fast shipping, bulk pricing available.`,
        canonical: `${SITE_URL}${ROUTES.subcategory(canonicalL1.collectionHandle, node.tag)}`,
      })
    }
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
  const currentPage = parseInt(sp.page ?? '1', 10)
  if (isNaN(currentPage) || currentPage < 1) notFound()

  const siblings = getSubcategoriesForParent(l1.tag, l2Nodes).filter((n) => n.tag !== node.tag)
  const crossLinkL1 = node.crossLinkParentTag
    ? CATEGORY_TREE_L1.find((c) => c.tag === node.crossLinkParentTag)
    : undefined

  const canonicalUrl = `${SITE_URL}${ROUTES.subcategory(slug, handle)}`

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

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-6">
        <h1 className="text-navy-900 text-[36px] sm:text-[44px] font-semibold leading-[1.2] tracking-[-0.01em] mb-2">
          {title}
        </h1>
        <p className="text-gray-500 text-[15px]">Part of {l1.displayName}</p>
        {crossLinkL1 && (
          <p className="text-gray-500 text-[14px] mt-2">
            Also relevant to{' '}
            <Link href={ROUTES.category(crossLinkL1.collectionHandle)} className="text-teal-500 hover:underline">
              {crossLinkL1.displayName}
            </Link>
          </p>
        )}
      </div>

      {siblings.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <Link
              href={ROUTES.category(slug)}
              className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
            >
              All {l1.displayName}
            </Link>
            {siblings.map((sib) => (
              <Link
                key={sib.tag}
                href={ROUTES.subcategory(slug, sib.tag)}
                className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
              >
                {humanizeTag(sib.tag)}
              </Link>
            ))}
            <span className="bg-navy-900 text-white text-[13px] font-semibold px-4 h-[44px] flex items-center whitespace-nowrap">
              {title}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        <CategoryResults
          source={{ kind: 'tag', query: buildSubcategoryTagQuery(l1.tag, node.tag), title, slug: node.tag }}
          baseUrl={ROUTES.subcategory(slug, handle)}
          facetKey={l1.tag}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
        />
      </div>

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
  const l1 = getL1ByCollectionHandle(slug)

  let l2Nodes: L2Node[] | undefined

  if (l1) {
    const summaries = await fetchProductTagSummaries()
    l2Nodes = buildL2Tree(summaries)
    const node = l2Nodes.find((n) => n.tag === handle)

    if (node && node.crossLinkParentTag === l1.tag && node.parentTag !== l1.tag) {
      const canonicalL1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)!
      redirect(ROUTES.subcategory(canonicalL1.collectionHandle, node.tag))
    }

    if (node && node.parentTag === l1.tag) {
      return renderSubcategoryPage(nonce, l1, node, l2Nodes, sp, slug, handle)
    }
  }

  // Fall back to product
  const productData = await storefrontFetch<{ product: Product | null }>(
    GET_PRODUCT,
    { handle },
    productFetchOptions(handle),
  )

  if (!productData.product) notFound()
  if (productData.product.variants.nodes.length === 0) notFound()

  const partner = PARTNERS.find(
    (p) => p.isActive && p.vendorName === productData.product!.vendor,
  ) ?? null

  const recsData = await storefrontFetch<{
    related: CollectionProduct[]
    complementary: CollectionProduct[]
  }>(GET_PRODUCT_RECS, { handle }, productFetchOptions(handle)).catch(() => ({
    related: [] as CollectionProduct[],
    complementary: [] as CollectionProduct[],
  }))

  const resolvedL2Nodes = l2Nodes ?? buildL2Tree(await fetchProductTagSummaries())
  const { categories, subcategories } = parseProductTags(productData.product.tags)
  const categoryPath = getProductCategoryPath(
    { handle: productData.product.handle, categories, subcategories },
    resolvedL2Nodes,
  )

  const breadcrumbs = categoryPath
    ? [
        { label: categoryPath.category.displayName, href: ROUTES.category(categoryPath.category.collectionHandle) },
        ...(categoryPath.subcategory
          ? [{
              label: humanizeTag(categoryPath.subcategory.tag),
              href: ROUTES.subcategory(categoryPath.category.collectionHandle, categoryPath.subcategory.tag),
            }]
          : []),
      ]
    : [{ label: 'Categories', href: '/categories' }]

  return (
    <main id="main-content" className="bg-[#f9fafc]">
      {/* og:type `product` is outside Next's Metadata union — rendered here
          and hoisted into <head> by React 19 (audit L10). */}
      <meta property="og:type" content="product" />
      <BreadcrumbSchema
        items={[...breadcrumbs, { label: productData.product.title }]}
        currentUrl={`${SITE_URL}/category/${slug}/${handle}`}
      />
      <ProductView
        product={productData.product}
        relatedProducts={recsData.related}
        complementaryProducts={recsData.complementary}
        breadcrumbs={breadcrumbs}
        partnerSlug={partner?.slug ?? null}
      />
    </main>
  )
}
