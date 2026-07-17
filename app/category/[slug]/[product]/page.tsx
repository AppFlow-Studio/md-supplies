import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import { GET_COLLECTION, GET_COLLECTION_META } from '@/lib/shopify/queries/collections'
import type { Product, CollectionProduct, Collection } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'
import { ProductGrid } from '@/components/category/ProductGrid'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { getSiblingSubcategories, getRelatedCategories } from '@/lib/category-utils'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { PARTNERS } from '@/lib/partners'
import { CategoryImage } from '@/components/shared/CategoryImage'
import { getSubcategoryBannerPath } from '@/lib/bunnycdn'
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
function collectionFetchOptions(handle: string) {
  return { next: { revalidate: 300, tags: ['shopify', 'collections', `collection:${handle}`] } }
}

interface Props {
  params: Promise<{ slug: string; product: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, product: handle } = await params
  const subHandle = `${slug}-${handle}`

  const subData = await storefrontFetch<{ collection: Collection | null }>(
    GET_COLLECTION,
    { handle: subHandle, first: 1, after: null, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    collectionFetchOptions(subHandle),
  ).catch(() => ({ collection: null }))

  if (subData.collection) {
    const { title, description, seo } = subData.collection
    return buildMetadata({
      pageType: 'subcategory',
      title: seo?.title || title,
      description: seo?.description || (description ? trimDescription(description, 155) : undefined),
      canonical: `${SITE_URL}/category/${slug}/${handle}`,
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

export default async function CategoryProductPage({ params }: Props) {
  const nonce = await getNonce()
  const { slug, product: handle } = await params
  const subHandle = `${slug}-${handle}`

  const [subData, parentMeta] = await Promise.all([
    storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      {
        handle: subHandle,
        first: 12,
        after: null,
        sortKey: 'COLLECTION_DEFAULT',
        reverse: false,
        filters: [],
      },
      collectionFetchOptions(subHandle),
    ).catch(() => ({ collection: null })),
    storefrontFetch<{ collection: { title: string; handle: string } | null }>(
      GET_COLLECTION_META,
      { handle: slug },
      collectionFetchOptions(slug),
    ).catch(() => ({ collection: null })),
  ])

  if (subData.collection) {
    const collection = subData.collection
    const [siblings, relatedCategories] = await Promise.all([
      getSiblingSubcategories(slug, handle),
      getRelatedCategories(subHandle),
    ])

    return (
      <main id="main-content" className="bg-[#f9fafc] min-h-screen">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
          <Breadcrumb
            items={[
              { label: parentMeta.collection?.title ?? 'Category', href: ROUTES.category(slug) },
              { label: collection.title },
            ]}
          />
        </div>

        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-8">
          <div className="relative bg-white overflow-hidden flex min-h-[260px] sm:min-h-[300px]">
            <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 py-10 max-w-[560px]">
              <h1 className="text-navy-900 text-[36px] sm:text-[44px] font-semibold leading-[1.2] tracking-[-0.01em] mb-4">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-gray-500 text-[15px] leading-[1.75] max-w-[500px]">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[55%]">
              <CategoryImage
                bannerPath={getSubcategoryBannerPath(subHandle)}
                fallbackUrl={collection.image?.url}
                alt={collection.image?.altText ?? collection.title}
              />
            </div>
          </div>
        </div>

        {siblings.length > 0 && (
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 mb-6">
            <div className="flex flex-wrap gap-2 items-center">
              <Link
                href={ROUTES.category(slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
              >
                All {parentMeta.collection?.title ?? 'Products'}
              </Link>
              {siblings.map((sib) => (
                <Link
                  key={sib.subSlug}
                  href={ROUTES.subcategory(sib.catSlug, sib.subSlug)}
                  className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
                >
                  {sib.label}
                </Link>
              ))}
              <span className="bg-navy-900 text-white text-[13px] font-semibold px-4 h-[44px] flex items-center whitespace-nowrap">
                {collection.title}
              </span>
            </div>
          </div>
        )}

        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6">
          <ProductGrid
            products={collection.products.nodes}
            emptyStateHref={ROUTES.category(slug)}
            categorySlug={subHandle}
            itemListId={subHandle}
            itemListName={collection.title}
          />
        </div>

        {relatedCategories.length > 0 && (
          <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
            <h2 className="text-navy-900 text-[18px] font-semibold mb-4">Related Categories</h2>
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

        {collection.descriptionHtml && (
          <section className="bg-navy-900 py-16 sm:py-20">
            <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 text-center">
              <h2 className="text-white text-[36px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-8">
                About {collection.title}
              </h2>
              <div
                className="prose prose-invert max-w-[880px] mx-auto text-[15px] leading-[1.85] text-white/75
                  prose-headings:text-white prose-a:text-[#0086b1] prose-strong:text-white"
                dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
              />
            </div>
          </section>
        )}

        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: jsonLdSafe(
              buildBreadcrumbListSchema(
                [
                  { label: parentMeta.collection?.title ?? 'Category', href: ROUTES.category(slug) },
                  { label: collection.title },
                ],
                `${SITE_URL}/category/${slug}/${handle}`,
              ),
            ),
          }}
        />
      </main>
    )
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

  const breadcrumbs = parentMeta.collection
    ? [{ label: parentMeta.collection.title, href: `/category/${slug}` }]
    : [{ label: 'Categories', href: '/shop' }]

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
