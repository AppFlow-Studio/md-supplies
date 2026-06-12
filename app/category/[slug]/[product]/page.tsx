import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import { GET_COLLECTION_META } from '@/lib/shopify/queries/collections'
import type { Product, CollectionProduct } from '@/lib/shopify/types'
import { buildMetadata } from '@/lib/seo'
import { ProductView } from '@/components/product/ProductView'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string; product: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product: handle } = await params
  try {
    const data = await storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle })
    if (!data.product) return buildMetadata({ pageType: 'product', slug: handle })
    const p = data.product
    return buildMetadata({
      pageType: 'product',
      title: p.title,
      description: p.description.slice(0, 155) || `Buy ${p.title} at wholesale prices from MDSupplies`,
      slug: handle,
      image: p.images.nodes[0]?.url,
    })
  } catch {
    return buildMetadata({ pageType: 'product', slug: handle })
  }
}

export default async function CategoryProductPage({ params }: Props) {
  const { slug, product: handle } = await params

  const [productData, collectionData] = await Promise.all([
    storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle }),
    storefrontFetch<{ collection: { title: string; handle: string } | null }>(
      GET_COLLECTION_META,
      { handle: slug },
    ),
  ])

  if (!productData.product) notFound()
  if (productData.product.variants.nodes.length === 0) notFound()

  const recsData = await storefrontFetch<{ related: CollectionProduct[]; complementary: CollectionProduct[] }>(
    GET_PRODUCT_RECS,
    { handle },
  ).catch(() => ({ related: [] as CollectionProduct[], complementary: [] as CollectionProduct[] }))

  const breadcrumbs = collectionData.collection
    ? [{ label: collectionData.collection.title, href: `/category/${slug}` }]
    : [{ label: 'Categories', href: '/shop' }]

  return (
    <main className="bg-[#f9fafc]">
      <ProductView
        product={productData.product}
        relatedProducts={recsData.related}
        complementaryProducts={recsData.complementary}
        breadcrumbs={breadcrumbs}
      />
    </main>
  )
}
