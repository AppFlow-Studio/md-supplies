import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCTS } from '@/lib/shopify/queries/products'
import { GET_COLLECTION_META } from '@/lib/shopify/queries/collections'
import type { Product, CollectionProduct } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string; product: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product: handle } = await params
  try {
    const data = await storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle })
    if (!data.product) return { title: 'Product | MD Supplies' }
    return {
      title: `${data.product.title} | MD Supplies`,
      description: data.product.description.slice(0, 155) || `Buy ${data.product.title} at wholesale prices`,
    }
  } catch {
    return { title: 'Product | MD Supplies' }
  }
}

export default async function CategoryProductPage({ params }: Props) {
  const { slug, product: handle } = await params

  const [productData, collectionData, relatedData] = await Promise.all([
    storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle }),
    storefrontFetch<{ collection: { title: string; handle: string } | null }>(
      GET_COLLECTION_META,
      { handle: slug },
    ),
    storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(GET_PRODUCTS, {
      first: 9,
      sortKey: 'BEST_SELLING',
      reverse: false,
    }),
  ])

  if (!productData.product) notFound()
  if (productData.product.variants.nodes.length === 0) notFound()

  const relatedProducts = relatedData.products.nodes
    .filter((p) => p.handle !== handle)
    .slice(0, 8)

  const breadcrumbs = collectionData.collection
    ? [{ label: collectionData.collection.title, href: `/category/${slug}` }]
    : [{ label: 'Categories', href: '/shop' }]

  return (
    <main className="bg-[#f9fafc]">
      <ProductView
        product={productData.product}
        relatedProducts={relatedProducts}
        breadcrumbs={breadcrumbs}
      />
    </main>
  )
}
