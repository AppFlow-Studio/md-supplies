import Link from 'next/link'
import type { BlogArticle } from '@/types/blog'
import { ArticleBody } from './ArticleBody'
import { ArticleCard } from './ArticleCard'
import { TableOfContents } from './TableOfContents'
import { FeaturedProductCard } from '@/components/b2b/FeaturedProductCard'
import { BlogPostingSchema } from '@/components/schema/BlogPostingSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  article: BlogArticle
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ArticlePage({ article }: Props) {
  const pageUrl = `${SITE_URL}/blog/${article.slug}`
  const publisherLogo = `${SITE_URL}/images/og-default.jpg`
  const hasTOC = article.tableOfContents && article.tableOfContents.length > 0

  return (
    <main id="main-content" className="bg-[#f9fafc]">
      <BlogPostingSchema
        title={article.seoTitle || article.title}
        description={article.seoDescription || article.excerpt}
        url={pageUrl}
        featuredImage={article.ogImage || article.featuredImage.url}
        publishedAt={article.publishedAt}
        modifiedAt={article.modifiedAt}
        authorName={article.author.name}
        publisherName={article.publisher}
        publisherLogo={publisherLogo}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Blog', item: `${SITE_URL}/blog` },
          { name: article.title, item: pageUrl },
        ]}
      />

      {/* Hero image — fetchPriority high (above fold) */}
      <div className="bg-navy-900 overflow-hidden h-[280px] sm:h-[380px] relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.featuredImage?.url || '/images/pills_on_hands.png'}
          alt={article.featuredImage?.altText || article.title}
          width={article.featuredImage?.width}
          height={article.featuredImage?.height}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-end pb-10">
          {article.topic && (
            <span className="text-teal-300 text-[13px] font-semibold uppercase tracking-[0.5px] mb-3">
              {article.topic}
            </span>
          )}
          <h1 className="text-white text-[26px] sm:text-[36px] font-bold leading-tight max-w-[720px]">
            {article.title}
          </h1>
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb nav */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li><Link href="/blog" className="text-gray-500 hover:text-navy-900 transition-colors">Blog</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold line-clamp-1">{article.title}</li>
          </ol>
        </nav>

        {/* Meta row */}
        <div className="flex items-center gap-5 mb-8 flex-wrap text-sm text-gray-500">
          <span>{formatDate(article.publishedAt)}</span>
          {article.modifiedAt && article.modifiedAt !== article.publishedAt && (
            <span>Updated {formatDate(article.modifiedAt)}</span>
          )}
          <span className="flex items-center gap-2">
            {article.author.avatar && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={article.author.avatar}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            {article.author.name}
          </span>
        </div>

        {/* Body + TOC layout */}
        <div className={hasTOC ? 'lg:grid lg:grid-cols-[240px_1fr] lg:gap-12 lg:items-start' : ''}>
          {hasTOC && (
            <aside className="lg:sticky lg:top-8 mb-8 lg:mb-0">
              <TableOfContents entries={article.tableOfContents!} />
            </aside>
          )}
          <div className="min-w-0 max-w-[760px]">
            <ArticleBody html={article.body} />
          </div>
        </div>

        {/* Related categories */}
        {article.relatedCategories && article.relatedCategories.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Related Categories</h2>
            <div className="flex flex-wrap gap-2">
              {article.relatedCategories.map((cat) => (
                <a
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Related products */}
        {article.relatedProducts && article.relatedProducts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {article.relatedProducts.map((p) => (
                <FeaturedProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Related articles */}
        {article.relatedArticles.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {article.relatedArticles.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
