import Link from "next/link";
import { FadeIn } from "@/components/ui/FadeIn";
import type { BlogArticleSummary } from "@/lib/shopify/types";

interface Props {
  articles: BlogArticleSummary[];
}

export function MoreArticles({ articles }: Props) {
  if (articles.length === 0) return null;

  return (
    <section className="bg-white border-t border-gray-200">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-8">
          More Articles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px] gap-y-6">
          {articles.map((a, i) => (
            <FadeIn key={a.id} delay={i * 0.08}>
              <Link
                href={`/blog/${a.handle}`}
                className="group flex flex-col gap-3"
              >
                {a.image ? (
                  <div className="overflow-hidden bg-neutral-100 aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.image.url}
                      alt={a.image.altText ?? a.title}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="bg-navy-900 aspect-[16/9]" />
                )}
                <div>
                  <p className="text-teal-500 text-[12px] font-semibold uppercase tracking-[0.24px] mb-1">
                    {new Date(a.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-navy-900 text-[15px] font-semibold leading-5 line-clamp-2 group-hover:text-teal-500 transition-colors">
                    {a.title}
                  </p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
