import Link from 'next/link'
import type { BlogArticleSummary } from '@/types/blog'

interface Props {
  article: BlogArticleSummary
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ArticleCard({ article }: Props) {
  return (
    <article className="group flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      <Link href={`/blog/${article.slug}`} className="flex flex-col flex-1">
        <div className="aspect-[16/9] overflow-hidden bg-navy-900">
          <img
            src={article.featuredImage.url}
            alt={article.featuredImage.altText}
            width={article.featuredImage.width}
            height={article.featuredImage.height}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div className="p-5 flex flex-col gap-3 flex-1">
          {article.topic && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-teal-500">
              {article.topic}
            </span>
          )}
          <h2 className="text-base font-bold text-navy-900 leading-snug line-clamp-2 group-hover:text-teal-500 transition-colors">
            {article.title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
            {article.excerpt}
          </p>
          <p className="text-xs text-gray-500">{formatDate(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  )
}
