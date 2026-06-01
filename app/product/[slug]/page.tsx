import type { Metadata } from 'next'
import { getProductBySlug } from '@/lib/products'
import { ProductDetail } from '@/components/shop/ProductDetail'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_BLOGS_WITH_ARTICLES } from '@/lib/shopify/queries/blog'
import { RelatedArticles } from '@/components/blog/RelatedArticles'
import type { ShopifyBlog, BlogArticleSummary } from '@/lib/shopify/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  return {
    title: `${product.name} | MD Supplies`,
    description: `${product.brand} — ${product.description.slice(0, 140)}...`,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  let relatedArticles: BlogArticleSummary[] = []
  try {
    const blogsData = await storefrontFetch<{ blogs: { nodes: ShopifyBlog[] } }>(
      GET_BLOGS_WITH_ARTICLES,
      { first: 6 },
    )
    relatedArticles = blogsData.blogs.nodes
      .flatMap((b) => b.articles.nodes)
      .slice(0, 3)
  } catch {
    // blog unavailable — page still renders without it
  }

  return (
    <main className="bg-[#f9fafc]">
      <ProductDetail product={product} />
      <RelatedArticles articles={relatedArticles} heading="From Our Blog" />
    </main>
  )
}
