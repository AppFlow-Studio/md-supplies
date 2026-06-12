import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { notFound } from 'next/navigation'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import type { Product, CollectionProduct, ProductMetafields } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'
import { PARTNERS } from '@/lib/partners'
import { ProductSchema } from '@/components/schema/ProductSchema'
import { SITE_URL } from '@/lib/seo/constants'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string }>
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
    const data = await storefrontFetch<{ product: RawProduct | null }>(GET_PRODUCT, { handle: slug })
    if (!data.product) return { title: 'Product | MDSupplies' }
    const product = normalizeProduct(data.product)
    const brand = product.brandName ?? product.vendor
    return buildMetadata({
      pageType: 'product',
      title: product.title,
      description: `${brand} — ${product.description.slice(0, 155)}`,
      slug,
      image: product.images.nodes[0]?.url,
    })
  } catch {
    return { title: 'Product | MDSupplies' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  const rawData = await storefrontFetch<{ product: RawProduct | null }>(GET_PRODUCT, { handle: slug })
  if (!rawData.product) notFound()

  const product = normalizeProduct(rawData.product)

  const partner = PARTNERS.find(
    (p) => p.isActive && p.vendorName === product.vendor,
  ) ?? null

  const recsData = await storefrontFetch<{ related: CollectionProduct[]; complementary: CollectionProduct[] }>(
    GET_PRODUCT_RECS,
    { handle: slug },
  ).catch(() => ({ related: [] as CollectionProduct[], complementary: [] as CollectionProduct[] }))

  const relatedProducts = recsData.related
  const complementaryProducts = recsData.complementary

  return (
    <main className="bg-[#f9fafc]">
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        partnerSlug={partner?.slug ?? null}
      />
      <ProductSchema
        name={product.title}
        description={product.description || product.title}
        image={product.images.nodes[0]?.url ?? ''}
        sku={product.variants.nodes[0]?.id.split('/').pop() ?? ''}
        brand={product.brandName ?? product.vendor}
        price={parseFloat(product.variants.nodes[0]?.price.amount ?? '0')}
        priceCurrency="USD"
        availability={
          product.variants.nodes[0]?.availableForSale
            ? 'InStock'
            : product.estimatedRestockDate
              ? 'PreOrder'
              : 'OutOfStock'
        }
        url={`${SITE_URL}/product/${slug}`}
        seller="MDSupplies"
        shippingDetails="Orders placed before 3 PM EST ship same day. Standard delivery is 2–3 business days."
        returnPolicy="Returns accepted within 30 days of delivery for unopened, undamaged items."
      />
    </main>
  )
}
