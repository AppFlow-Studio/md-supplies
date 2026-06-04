// NOTE: 301 redirect from old URL(s) needed before launch — coordinate with data team
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getBlogArticleBySlug } from '@/lib/mock/blog-articles'
import { ArticlePage } from '@/components/blog/ArticlePage'

const article = getBlogArticleBySlug('types-of-sutures')

export const metadata: Metadata = article
  ? buildMetadata({
      pageType: 'blog-article',
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      slug: article.slug,
      image: article.ogImage || article.featuredImage.url,
    })
  : {}

export default function TypesOfSuturesPage() {
  if (!article) notFound()
  return <ArticlePage article={article} />
}
