import type { Metadata } from 'next'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { notFound } from 'next/navigation'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS, GET_ALL_PRODUCT_HANDLES } from '@/lib/shopify/queries/products'
import type { CollectionProduct } from '@/lib/shopify/types'
import { normalizeProduct, type RawProduct } from '@/lib/shopify/normalize'
import { publicBrand } from '@/lib/brand'
import { ProductView } from '@/components/product/ProductView'
import { PARTNERS } from '@/lib/partners'
import { ProductSchema } from '@/components/schema/ProductSchema'
import { normalizeGtin } from '@/lib/gtin'
import { OFFER_SHIPPING_DETAILS, MERCHANT_RETURN_POLICY } from '@/lib/merchant-policy'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { getProductCategoryPath, buildL2Tree, parseProductTags, humanizeTag,
  getCategorySlug,
} from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { ROUTES } from '@/lib/routes'
import { resolveVariantsForProduct } from '@/lib/shipping-resolver/resolve'
import { isShippingResolverEnabled } from '@/lib/shipping-resolver/flag'
import { gateFreeShippingClaims } from '@/lib/shipping-resolver/free-shipping-gate'
import { attachCardShippingDisplay } from '@/lib/shipping-resolver/attach'
import { resolveInitialVariant } from '@/lib/product/resolve-variant'
import { buildCanonical } from '@/lib/seo/canonical'
import { getPriceValidUntil } from '@/lib/product/price-valid-until'

// Cache Components: prerender a small live sample of real product pages at build
// so the build validates the real render path; every other handle renders
// on-demand on first request and is then cached (the long tail is intentionally
// not enumerated — that would make builds slow, and on-demand ISR is the point).
// The product data reads are cached via storefrontFetch's data-cache tags
// (productFetchOptions) + the Shopify products/* webhook (app/api/revalidate);
// getPriceValidUntil is a `use cache` scope. The route-segment configs
// (revalidate / dynamicParams) are gone — both are incompatible with
// cacheComponents. generateStaticParams must return >=1 (empty arrays hard-error:
// empty-generate-static-params). The server renders the DEFAULT variant; the
// client reconciles `?variant=` after hydration (components/product/useSelectedVariant.ts).
const PRERENDER_SAMPLE_SIZE = 20

export async function generateStaticParams() {
  try {
    const data = await storefrontFetch<{ products: { nodes: { handle: string }[] } }>(
      GET_ALL_PRODUCT_HANDLES,
      { first: PRERENDER_SAMPLE_SIZE, after: null },
      { next: { revalidate: 3600, tags: ['shopify', 'products'] } },
    )
    const handles = data.products.nodes.map((n) => ({ slug: n.handle }))
    return handles.length > 0 ? handles : [{ slug: '__prerender_probe__' }]
  } catch {
    // Storefront hiccup at build → probe keeps the build valid; real handles
    // render on-demand.
    return [{ slug: '__prerender_probe__' }]
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

// Data cache: 5-minute background revalidate, plus on-demand invalidation from
// the Shopify products/* webhook via the per-handle tag (app/api/revalidate).
function productFetchOptions(slug: string) {
  return { next: { revalidate: 300, tags: ['shopify', 'products', `product:${slug}`] } }
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

  // DEV-SHIP-02: custom.free_shipping ANDs with the resolver's per-variant
  // confirmation — see lib/shipping-resolver/free-shipping-gate.ts. The
  // metafield is product-level (like custom.backorder), so the same raw
  // value gates every variant's entry in this map.
  const variantShippingDisplays = isShippingResolverEnabled()
    ? gateFreeShippingClaims(resolveVariantsForProduct(product.id), product.freeShipping)
    : {}

  // Recommendations previously got no shippingDisplay at all (RelatedProductCard
  // rendered no badges), so "Similar Products"/"Frequently Bought With" could
  // never show a Free Shipping claim even when the product itself qualifies.
  const relatedProducts = attachCardShippingDisplay(recsData.related)
  const complementaryProducts = attachCardShippingDisplay(recsData.complementary)

  // LG-03: the server always renders the DEFAULT variant now (passing
  // `undefined` — the route no longer reads `?variant` server-side, so it stays
  // ISR-cacheable). The Product schema is built from this same default variant
  // ProductView seeds from (lib/purchasability.ts via resolveInitialVariant), so
  // it can never disagree with the visibly-selected price/SKU/availability. The
  // `?variant=` deep-link is reconciled client-side after hydration
  // (components/product/useSelectedVariant.ts); the canonical stays neutral.
  const resolvedVariant = resolveInitialVariant(product.variants.nodes, undefined)
  const isAvailable = resolvedVariant?.availableForSale ?? product.availableForSale
  // Structured data and BreadcrumbSchema always point at the neutral,
  // query-free product URL — a selected variant is never canonicalized to a
  // variant-specific URL (LG-03 acceptance: "canonical remains neutral").
  const productUrl = buildCanonical({ path: `/product/${slug}`, strategy: 'base-product', basePath: `/product/${slug}` })
  const priceValidUntil = await getPriceValidUntil()

  const schemaProps = {
    name: product.title,
    description: product.description,
    // AeroWalk fix: prefer the resolved variant's own image so structured
    // data can't disagree with what's on the page (Red must never emit
    // Blue's image) — falls back to the product's default gallery image
    // only when the variant carries none.
    image: resolvedVariant?.image?.url ?? product.images.nodes[0]?.url ?? '',
    sku: resolvedVariant?.sku || slug,
    // gtin only when the Shopify barcode is a checksum-valid GTIN — most
    // barcodes in this catalog are SKU copies and must not be emitted (M5).
    gtin: normalizeGtin(resolvedVariant?.barcode),
    // Manufacturer Item Number (AeroWalk pilot field contract) — omitted
    // entirely rather than emitting an empty string when not yet populated.
    mpn: resolvedVariant?.manufacturerNumber ?? undefined,
    // Product structured data: omit brand entirely rather than emit the
    // fulfilling vendor as a consumer brand (lib/brand.ts).
    brand: publicBrand(product) ?? undefined,
    price: parseFloat(resolvedVariant?.price?.amount ?? '0'),
    priceCurrency: resolvedVariant?.price?.currencyCode ?? 'USD',
    availability: (isAvailable ? 'InStock' : 'OutOfStock') as 'InStock' | 'OutOfStock' | 'PreOrder',
    url: productUrl,
    seller: 'MDSupplies',
    priceValidUntil,
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
        initialVariant={resolvedVariant}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        breadcrumbs={categoryCrumbs}
        partnerSlug={partner?.slug ?? null}
        variantShippingDisplays={variantShippingDisplays}
      />
    </main>
  )
}
