import type { Metadata } from 'next'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { notFound } from 'next/navigation'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import type { Product, CollectionProduct, ProductMetafields } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'
import { PARTNERS } from '@/lib/partners'
import { ProductSchema } from '@/components/schema/ProductSchema'
import { normalizeGtin } from '@/lib/gtin'
import { OFFER_SHIPPING_DETAILS, MERCHANT_RETURN_POLICY } from '@/lib/merchant-policy'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import { getPrimaryCollection } from '@/lib/category-utils'
import { getBreadcrumbFromTags } from '@/lib/category-tree'
import { ROUTES } from '@/lib/routes'

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

// Shopify returns metafields as `{ value: string } | null`, not bare strings.
// This type reflects the actual JSON shape before we normalize it.
type RawMetafield = { value: string } | null
type RawProduct = Omit<Product, keyof ProductMetafields> & {
  [K in keyof ProductMetafields]: RawMetafield
}

function normalizeProduct(raw: RawProduct): Product {
  const mv = (m: RawMetafield): string | null => m?.value ?? null
  return {
    ...raw,
    brandName:            mv(raw.brandName),
    unitsPerOrder:        mv(raw.unitsPerOrder),
    quantityOfUnits:      mv(raw.quantityOfUnits),
    orderSize:            mv(raw.orderSize),
    material:             mv(raw.material),
    use:                  mv(raw.use),
    features:             mv(raw.features),
    color:                mv(raw.color),
    sterility:            mv(raw.sterility),
    thickness:            mv(raw.thickness),
    gloveSize:            mv(raw.gloveSize),
    needleGauge:          mv(raw.needleGauge),
    needleLength:         mv(raw.needleLength),
    sizeLength:           mv(raw.sizeLength),
    estimatedRestockDate: mv(raw.estimatedRestockDate),
    testsFor:             mv(raw.testsFor),
    detectableDrugs:      mv(raw.detectableDrugs),
    adulterants:          mv(raw.adulterants),
    otherFeatures:        mv(raw.otherFeatures),
    typeList:             mv(raw.typeList),
    customBadge1:         mv(raw.customBadge1),
    customBadge2:         mv(raw.customBadge2),
    customBadge3:         mv(raw.customBadge3),
  }
}

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
    const brand = product.brandName ?? product.vendor
    return buildMetadata({
      pageType: 'product',
      title: product.seo?.title || product.title,
      description: product.seo?.description || trimDescription(`${brand} — ${product.description}`, 155),
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

  const relatedProducts = recsData.related
  const complementaryProducts = recsData.complementary

  const firstVariant = product.variants.nodes[0]
  const isAvailable = firstVariant?.availableForSale ?? product.availableForSale
  const productUrl = `${SITE_URL}/product/${slug}`

  const schemaProps = {
    name: product.title,
    description: product.description,
    image: product.images.nodes[0]?.url ?? '',
    sku: firstVariant?.sku || slug,
    // gtin only when the Shopify barcode is a checksum-valid GTIN — most
    // barcodes in this catalog are SKU copies and must not be emitted (M5).
    gtin: normalizeGtin(firstVariant?.barcode),
    brand: product.brandName ?? product.vendor,
    price: parseFloat(firstVariant?.price?.amount ?? '0'),
    priceCurrency: firstVariant?.price?.currencyCode ?? 'USD',
    availability: (isAvailable ? 'InStock' : 'OutOfStock') as 'InStock' | 'OutOfStock' | 'PreOrder',
    url: productUrl,
    seller: 'MDSupplies',
    priceValidUntil: buildPriceValidUntil(),
    ...(OFFER_SHIPPING_DETAILS ? { shippingDetails: OFFER_SHIPPING_DETAILS } : {}),
    ...(MERCHANT_RETURN_POLICY ? { returnPolicy: MERCHANT_RETURN_POLICY } : {}),
  }

  // Breadcrumb from the product's OWN category:/subcategory: tags — ticket:
  // BreadcrumbList follows the canonical tag path, never the cross-linked
  // branch. Collection-derived crumb only as fallback for out-of-tree
  // products (no category: tag), else the generic Shop crumb.
  const tagCrumb = getBreadcrumbFromTags(product.tags, product.handle)
  const primaryCollection = tagCrumb.l1 ? null : getPrimaryCollection(product.collections?.nodes ?? [])
  const crumbItems = tagCrumb.l1
    ? [tagCrumb.l1, ...(tagCrumb.l2 ? [tagCrumb.l2] : [])]
    : [primaryCollection
        ? { label: primaryCollection.title, href: ROUTES.category(primaryCollection.handle) }
        : { label: 'Shop', href: '/categories' }]

  return (
    <main id="main-content" className="bg-[#f9fafc]">
      {/* og:type `product` is outside Next's Metadata union — rendered here
          and hoisted into <head> by React 19 (audit L10). */}
      <meta property="og:type" content="product" />
      <ProductSchema {...schemaProps} />
      <BreadcrumbSchema
        items={[...crumbItems, { label: product.title }]}
        currentUrl={productUrl}
      />
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        breadcrumbs={crumbItems}
        partnerSlug={partner?.slug ?? null}
      />
    </main>
  )
}
