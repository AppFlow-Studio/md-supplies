import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getMockProduct, getMockProductOrDefault } from '@/lib/mock/products'
import { ProductPage } from '@/components/product/ProductPage'

interface Props {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const product = getMockProduct(handle) ?? getMockProductOrDefault()

  return buildMetadata({
    pageType: 'product',
    title: product.seoTitle || product.title,
    description: product.seoDescription,
    slug: product.handle,
    image: product.images[0]?.url,
  })
}

export default async function ProductDetailPage({ params }: Props) {
  const { handle } = await params
  const product = getMockProduct(handle)

  if (!product) notFound()

  return <ProductPage product={product} />
}
