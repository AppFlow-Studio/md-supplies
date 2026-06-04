import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { notFound } from 'next/navigation'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
import { GET_BLOGS_WITH_ARTICLES } from '@/lib/shopify/queries/blog'
import type { Product, CollectionProduct, ProductMetafields, ShopifyBlog, BlogArticleSummary } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'

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

  // Fetch related products (same vendor) and blog articles in parallel
  const [relatedData, blogsData] = await Promise.all([
    storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(GET_PRODUCTS_BY_VENDOR, {
      query: `vendor:"${product.vendor}"`,
      first: 8,
      after: null,
      sortKey: 'BEST_SELLING',
      reverse: false,
    }).catch(() => ({ products: { nodes: [] } })),
    storefrontFetch<{ blogs: { nodes: ShopifyBlog[] } }>(GET_BLOGS_WITH_ARTICLES, { first: 6 })
      .catch(() => ({ blogs: { nodes: [] } })),
  ])

  const relatedProducts = relatedData.products.nodes.filter((p) => p.handle !== slug)
  const relatedArticles: BlogArticleSummary[] = blogsData.blogs.nodes
    .flatMap((b) => b.articles.nodes)
    .slice(0, 3)

  return (
    <main className="bg-[#f9fafc]">
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        relatedArticles={relatedArticles}
      />
    </main>
  )
}
