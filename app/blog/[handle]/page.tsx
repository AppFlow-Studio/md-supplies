import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { storefrontFetch } from "@/lib/shopify/storefront";
import {
  GET_ARTICLE,
  GET_ALL_ARTICLE_HANDLES,
  GET_BLOG_HANDLES,
  GET_BLOGS_WITH_ARTICLES,
} from "@/lib/shopify/queries/blog";
import type { BlogArticle, ShopifyBlog, BlogArticleSummary } from "@/lib/shopify/types";
import { WholesalePricing } from "@/components/home/WholesalePricing";
import { FadeIn } from "@/components/ui/FadeIn";

export const revalidate = 3600;

interface Props {
  params: Promise<{ handle: string }>;
}

async function findArticle(
  handle: string,
): Promise<{ blogHandle: string; article: BlogArticle } | null> {
  const data = await storefrontFetch<{ blogs: { nodes: Array<{ handle: string }> } }>(
    GET_BLOG_HANDLES,
  );

  for (const blog of data.blogs.nodes) {
    const result = await storefrontFetch<{
      blog: { articleByHandle: BlogArticle | null } | null;
    }>(GET_ARTICLE, { blogHandle: blog.handle, articleHandle: handle });

    if (result.blog?.articleByHandle) {
      return { blogHandle: blog.handle, article: result.blog.articleByHandle };
    }
  }
  return null;
}

export async function generateStaticParams() {
  try {
    const data = await storefrontFetch<{
      blogs: { nodes: Array<{ handle: string; articles: { nodes: Array<{ handle: string }> } }> };
    }>(GET_ALL_ARTICLE_HANDLES);

    return data.blogs.nodes.flatMap((blog) =>
      blog.articles.nodes.map((a) => ({ handle: a.handle })),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  try {
    const found = await findArticle(handle);
    if (!found) return { title: "Article | MD Supplies Blog" };
    const { article } = found;
    return {
      title: `${article.title} | MD Supplies Blog`,
      description: article.excerpt?.slice(0, 155) ?? undefined,
      openGraph: article.image
        ? { images: [{ url: article.image.url, alt: article.image.altText ?? article.title }] }
        : undefined,
    };
  } catch {
    return { title: "Article | MD Supplies Blog" };
  }
}

export default async function ArticlePage({ params }: Props) {
  const { handle } = await params;

  const found = await findArticle(handle).catch(() => null);
  if (!found) notFound();

  const { article } = found;

  let relatedArticles: BlogArticleSummary[] = [];
  try {
    const blogsData = await storefrontFetch<{ blogs: { nodes: ShopifyBlog[] } }>(
      GET_BLOGS_WITH_ARTICLES,
      { first: 6 },
    );
    relatedArticles = blogsData.blogs.nodes
      .flatMap((b) => b.articles.nodes)
      .filter((a) => a.handle !== handle)
      .slice(0, 3);
  } catch {
    // silently skip
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  const wordCount = article.contentHtml.replace(/<[^>]+>/g, "").split(/\s+/).length;
  const readMins = Math.max(1, Math.round(wordCount / 200));

  const heroSrc = article.image?.url ?? "/images/pills_on_hands.png";
  const heroAlt = article.image?.altText ?? article.title;

  return (
    <main className="bg-white">

      {/* ── Hero image with breadcrumb overlay ── */}
      <div className="w-full overflow-hidden bg-navy-900 h-[280px] sm:h-[380px] lg:h-[460px] relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroSrc}
          alt={heroAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient for breadcrumb legibility */}
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/65 to-transparent" />
        {/* Breadcrumb overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-5">
            <nav className="flex items-center gap-2 text-[13px] tracking-[0.26px]">
              <Link href="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              <span className="text-white/40">›</span>
              <Link href="/blog" className="text-white/70 hover:text-white transition-colors">Blog</Link>
              <span className="text-white/40">›</span>
              <span className="text-white/90 font-medium line-clamp-1">{article.title}</span>
            </nav>
          </div>
        </div>
      </div>

      {/* ── Content area — two-column ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row gap-12 xl:gap-16 items-start">

          {/* ── Left: main article ── */}
          <article className="flex-1 min-w-0">
            <FadeIn delay={0}>
              {/* Meta: date + read time */}
              <p className="text-teal-500 text-[13px] tracking-[0.75px] uppercase mb-3 font-semibold">
                {publishedDate}
                <span className="text-gray-300 mx-2">•</span>
                <span className="text-gray-400 font-normal">{readMins} min read</span>
              </p>

              {/* Title */}
              <h1 className="text-navy-900 text-[28px] sm:text-[36px] lg:text-[42px] font-semibold leading-[1.2] tracking-[-0.01em] mb-6">
                {article.title}
              </h1>

              <hr className="border-gray-200 mb-6" />

              {/* Author */}
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-full bg-navy-900 flex items-center justify-center shrink-0">
                  <span className="text-white text-[14px] font-bold">
                    {article.author.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-navy-900 text-[15px] font-semibold leading-tight">{article.author.name}</p>
                  {article.tags.length > 0 && (
                    <p className="text-gray-400 text-[12px] uppercase tracking-[0.5px]">{article.tags[0]}</p>
                  )}
                </div>
              </div>

              <hr className="border-gray-200 mb-8" />
            </FadeIn>

            {/* Article body */}
            <FadeIn delay={0.1}>
              <div
                className="article-prose"
                dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />
            </FadeIn>

            {/* Back link */}
            <FadeIn delay={0.15}>
              <div className="mt-12 pt-8 border-t border-gray-200">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-navy-900 text-[14px] font-semibold hover:text-teal-500 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to all articles
                </Link>
              </div>
            </FadeIn>
          </article>

          {/* ── Right: sidebar ── */}
          <aside className="w-full lg:w-[320px] xl:w-[360px] shrink-0 lg:sticky lg:top-[100px]">
            {relatedArticles.length > 0 && (
              <>
                <FadeIn delay={0}>
                  <h2 className="text-navy-900 text-[13px] font-semibold tracking-[0.65px] uppercase mb-5 pb-3 border-b border-gray-200">
                    Related Posts
                  </h2>
                </FadeIn>
                <div className="flex flex-col gap-4">
                  {relatedArticles.map((a, i) => (
                    <FadeIn key={a.id} delay={0.05 * (i + 1)}>
                      <Link
                        href={`/blog/${a.handle}`}
                        className="group flex flex-col bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="overflow-hidden bg-gray-100 aspect-[16/9]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.image?.url ?? "/images/pills_on_hands.png"}
                            alt={a.image?.altText ?? a.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="px-4 py-4 flex flex-col gap-1.5">
                          <p className="text-teal-500 text-[11px] font-semibold tracking-[0.55px] uppercase">
                            {new Date(a.publishedAt).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            }).toUpperCase()}
                          </p>
                          <p className="text-navy-900 text-[14px] font-semibold leading-[1.4] line-clamp-2 group-hover:text-teal-500 transition-colors">
                            {a.title}
                          </p>
                        </div>
                      </Link>
                    </FadeIn>
                  ))}
                </div>
              </>
            )}
          </aside>

        </div>
      </div>

      {/* ── Wholesale CTA ── */}
      <WholesalePricing />

    </main>
  );
}
