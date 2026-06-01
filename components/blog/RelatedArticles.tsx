import Link from 'next/link'
import type { BlogArticleSummary } from '@/lib/shopify/types'

interface Props {
  articles: BlogArticleSummary[]
  heading?: string
}

export function RelatedArticles({ articles, heading = 'More Articles' }: Props) {
  if (!articles.length) return null

  return (
    <section className="bg-white border-t border-gray-200">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px]">
            {heading}
          </h2>
          <Link
            href="/blog"
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px] gap-y-8">
          {articles.map((a) => (
            <Link key={a.id} href={`/blog/${a.handle}`} className="group flex flex-col gap-4">
              <div className="overflow-hidden bg-neutral-100 aspect-[16/9]">
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.image.url}
                    alt={a.image.altText ?? a.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="size-full bg-navy-900" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {a.tags[0] && (
                    <span className="bg-teal-50 text-teal-700 text-[11px] font-semibold px-2 py-0.5 border border-teal-200 uppercase tracking-[0.22px]">
                      {a.tags[0]}
                    </span>
                  )}
                  <span className="text-teal-500 text-[12px] font-semibold uppercase tracking-[0.24px]">
                    {new Date(a.publishedAt).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-navy-900 text-[16px] font-semibold leading-6 line-clamp-2 group-hover:text-teal-500 transition-colors">
                  {a.title}
                </p>
                {a.excerpt && (
                  <p className="text-gray-500 text-[14px] leading-6 line-clamp-2">{a.excerpt}</p>
                )}
                <p className="text-gray-400 text-[13px]">{a.author.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
