import type { Metadata } from 'next'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { notFound } from 'next/navigation'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import type { CollectionProduct } from '@/lib/shopify/types'
import { normalizeProduct, type RawProduct } from '@/lib/shopify/normalize'
import { publicBrand } from '@/lib/brand'
import { ProductView } from '@/components/product/ProductView'
import { PARTNERS } from '@/lib/partners'
import { ProductSchema } from '@/components/schema/ProductSchema'
import { normalizeGtin } from '@/lib/gtin'
import { OFFER_SHIPPING_DETAILS, MERCHANT_RETURN_POLICY } from '@/lib/merchant-policy'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import { getProductCategoryPath, buildL2Tree, parseProductTags, humanizeTag,
  getCategorySlug,
} from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { ROUTES } from '@/lib/routes'
import { resolveVariantsForProduct } from '@/lib/shipping-resolver/resolve'
import { isShippingResolverEnabled } from '@/lib/shipping-resolver/flag'
import { getDefaultVariant } from '@/lib/purchasability'

// Fully dynamic (root layout reads headers() for the CSP nonce, M10, so this
// route can't be static/ISR'd — see the trade-off note in app/layout.tsx).
// Freshness comes from the fetch-level data cache (productFetchOptions
// below), invalidated by the Shopify webhook via cache tags
// (app/api/revalidate), not route-level revalidate/generateStaticParams.

interface Props {
  params: Promise<{ slug: string }>
}

// Data cache: 5-minute background revalidate, plus on-demand invalidation from
// the Shopify products/* webhook via the per-handle tag (app/api/revalidate).
function productFetchOptions(slug: string) {
  return { next: { revalidate: 300, tags: ['shopify', 'products', `product:${slug}`] } }
}

// Offer freshness hint (M6): +30 days, date-only per Google's examples. The
// page regenerates via ISR, so the window rolls forward on every
// revalidation. Server-only helper — runs per-request, not in client render.
function buildPriceValidUntil(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// Metafield flattening moved to lib/shopify/normalize.ts so the category
// product route normalizes identically (it previously passed raw objects).

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await storefrontFetch<{ product: RawProduct | null }>(
      GET_PRODUCT,
      { handle: slug },
      productFetchOptions(slug),
    )
    if (!data.product) return buildMetadata({ pageType: 'product', title: 'Product' })
    const product = normalizeProduct(data.product)
    // Public brand only — never the fulfilling vendor (lib/brand.ts).
    const brand = publicBrand(product)
    return buildMetadata({
      pageType: 'product',
      title: product.seo?.title || product.title,
      description:
        product.seo?.description ||
        trimDescription(brand ? `${brand} — ${product.description}` : product.description, 155),
      slug,
      image: product.images.nodes[0]?.url,
      imageWidth: product.images.nodes[0]?.width,
      imageHeight: product.images.nodes[0]?.height,
    })
  } catch {
    return buildMetadata({ pageType: 'product', title: 'Product' })
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  const rawData = await storefrontFetch<{ product: RawProduct | null }>(
    GET_PRODUCT,
    { handle: slug },
    productFetchOptions(slug),
  )
  if (!rawData.product) notFound()

  const product = normalizeProduct(rawData.product)

  const partner = PARTNERS.find(
    (p) => p.isActive && p.vendorName === product.vendor,
  ) ?? null

  const recsData = await storefrontFetch<{ related: CollectionProduct[]; complementary: CollectionProduct[] }>(
    GET_PRODUCT_RECS,
    { handle: slug },
    productFetchOptions(slug),
  ).catch(() => ({ related: [] as CollectionProduct[], complementary: [] as CollectionProduct[] }))

  const variantShippingDisplays = isShippingResolverEnabled()
    ? resolveVariantsForProduct(product.id)
    : {}

  const relatedProducts = recsData.related
  const complementaryProducts = recsData.complementary

  // Same default-variant selection ProductView renders (lib/purchasability.ts)
  // so the Product schema can never disagree with the visibly-selected price/
  // SKU/availability, or drop the Offer for a product that has a purchasable
  // variant just because variants.nodes[0] happened to be a $0/quote-only one.
  const defaultVariant = getDefaultVariant(product.variants.nodes)
  const isAvailable = defaultVariant?.availableForSale ?? product.availableForSale
  const productUrl = `${SITE_URL}/product/${slug}`

  const schemaProps = {
    name: product.title,
    description: product.description,
    image: product.images.nodes[0]?.url ?? '',
    sku: defaultVariant?.sku || slug,
    // gtin only when the Shopify barcode is a checksum-valid GTIN — most
    // barcodes in this catalog are SKU copies and must not be emitted (M5).
    gtin: normalizeGtin(defaultVariant?.barcode),
    // Product structured data: omit brand entirely rather than emit the
    // fulfilling vendor as a consumer brand (lib/brand.ts).
    brand: publicBrand(product) ?? undefined,
    price: parseFloat(defaultVariant?.price?.amount ?? '0'),
    priceCurrency: defaultVariant?.price?.currencyCode ?? 'USD',
    availability: (isAvailable ? 'InStock' : 'OutOfStock') as 'InStock' | 'OutOfStock' | 'PreOrder',
    url: productUrl,
    seller: 'MDSupplies',
    priceValidUntil: buildPriceValidUntil(),
    ...(OFFER_SHIPPING_DETAILS ? { shippingDetails: OFFER_SHIPPING_DETAILS } : {}),
    ...(MERCHANT_RETURN_POLICY ? { returnPolicy: MERCHANT_RETURN_POLICY } : {}),
  }

  // Contextual middle crumb(s) (audit L12, superseded by the tag-derived
  // registry): the product's own resolveCanonicalCategory result, plus the
  // matching L2 subcategory when its tags carry one — always the canonical
  // parent, never a boundary subcategory's cross-link parent, regardless of
  // which URL the visitor arrived from. Falls back to the generic Shop crumb
  // when the product resolves no category at all.
  const summaries = await fetchProductTagSummaries()
  const l2Nodes = buildL2Tree(summaries)
  const { categories, subcategories } = parseProductTags(product.tags)
  const categoryPath = getProductCategoryPath({ handle: product.handle, categories, subcategories }, l2Nodes)
  const categoryCrumbs = categoryPath
    ? [
        { label: categoryPath.category.displayName, href: ROUTES.category(getCategorySlug(categoryPath.category)) },
        ...(categoryPath.subcategory
          ? [{
              label: humanizeTag(categoryPath.subcategory.tag),
              href: ROUTES.subcategory(categoryPath.category.collectionHandle, categoryPath.subcategory.tag),
            }]
          : []),
      ]
    : [{ label: 'Shop', href: '/categories' }]

  return (
    <main id="main-content" className="bg-[#f9fafc]">
      {/* og:type `product` is outside Next's Metadata union — rendered here
          and hoisted into <head> by React 19 (audit L10). */}
      <meta property="og:type" content="product" />
      <ProductSchema {...schemaProps} />
      <BreadcrumbSchema
        items={[...categoryCrumbs, { label: product.title }]}
        currentUrl={productUrl}
      />
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        breadcrumbs={categoryCrumbs}
        partnerSlug={partner?.slug ?? null}
        variantShippingDisplays={variantShippingDisplays}
      />
    </main>
  )
}
