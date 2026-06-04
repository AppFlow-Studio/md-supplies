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

export const revalidate = 3600;

interface Props {
  params: Promise<{ handle: string }>;
}

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── generateStaticParams ───────────────────────────────────────────────────

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

// ─── generateMetadata ───────────────────────────────────────────────────────

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

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ArticlePage({ params }: Props) {
  const { handle } = await params;

  const found = await findArticle(handle).catch(() => null);
  if (!found) notFound();

  const { article } = found;

  // Fetch related articles for sidebar
  let relatedArticles: BlogArticleSummary[] = [];
  try {
    const blogsData = await storefrontFetch<{ blogs: { nodes: ShopifyBlog[] } }>(
        GET_BLOGS_WITH_ARTICLES,
        { first: 6 },
    );
    relatedArticles = blogsData.blogs.nodes
        .flatMap((b) => b.articles.nodes)
        .filter((a) => a.handle !== handle)
        .slice(0, 2);
  } catch {
    // silently skip if unavailable
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  // Estimate read time (~200 words/min)
  const wordCount = article.contentHtml.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const readMins = Math.max(1, Math.round(wordCount / 200));

  return (
      <main className="bg-white">
        {/* Breadcrumb */}
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
          <nav className="flex items-center gap-2 text-[14px] tracking-[0.28px]">
            <Link href="/" className="text-gray-400 hover:text-navy-900 transition-colors">
              Home
            </Link>
            <span className="text-gray-400">›</span>
            <Link href="/blog" className="text-gray-400 hover:text-navy-900 transition-colors">
              Blog
            </Link>
            <span className="text-gray-400">›</span>
            <span className="text-navy-900 font-semibold line-clamp-1">{article.title}</span>
          </nav>
        </div>

        {/* Hero image — full width */}
        {article.image && (
            <div className="w-full overflow-hidden bg-navy-900 h-[320px] sm:h-[420px] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                  src={article.image.url}
                  alt={article.image.altText ?? article.title}
                  className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
        )}

        {/* Content area — two-column */}
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row gap-12 xl:gap-16 items-start">

            {/* ── Left: main article ── */}
            <article className="flex-1 min-w-0">
              {/* Back button */}
              <Link
                  href="/blog"
                  className="inline-flex items-center justify-center size-[38px] rounded-full border border-[rgba(11,23,43,0.2)] bg-[rgba(102,102,100,0.1)] hover:bg-gray-100 transition-colors mb-6"
                  aria-label="Back to blog"
              >
                <ArrowLeft size={14} className="text-navy-900" />
              </Link>

              {/* Meta: date + read time */}
              <p className="text-[#0086b1] text-[14px] tracking-[0.75px] uppercase mb-3">
                {publishedDate}
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-gray-400">{readMins} MINS READ</span>
              </p>

              {/* Title */}
              <h1 className="text-navy-900 text-[32px] sm:text-[40px] font-semibold leading-[1.25] tracking-[-0.02em] mb-6">
                {article.title}
              </h1>

              {/* Divider */}
              <hr className="border-gray-200 mb-6" />

              {/* Author */}
              <div className="flex items-center gap-4 mb-6">
                <div className="size-10 rounded-full bg-navy-900 flex items-center justify-center shrink-0">
                <span className="text-white text-[14px] font-bold">
                  {article.author.name.charAt(0)}
                </span>
                </div>
                <div>
                  <p className="text-navy-900 text-[15px] font-semibold">{article.author.name}</p>
                  {article.tags.length > 0 && (
                      <p className="text-gray-400 text-[12px] uppercase tracking-[0.5px]">{article.tags[0]}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 mb-8" />

              {/* Article body */}
              <div
                  className="prose prose-gray max-w-none text-[15px] leading-[1.75] text-gray-600
                prose-headings:text-navy-900 prose-headings:font-semibold
                prose-h2:text-[20px] prose-h3:text-[17px]
                prose-a:text-[#0086b1] prose-a:no-underline hover:prose-a:underline
                prose-strong:text-navy-900
                prose-li:marker:text-[#0086b1]"
                  dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />

              {/* Back link */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <Link
                    href="/blog"
                    className="flex items-center gap-2 text-navy-900 text-[14px] font-semibold hover:text-[#0086b1] transition-colors w-fit"
                >
                  <ArrowLeft size={16} />
                  Back to all articles
                </Link>
              </div>
            </article>

            {/* ── Right: sidebar related posts ── */}
            {relatedArticles.length > 0 && (
                <aside className="lg:w-[390px] xl:w-[420px] shrink-0">
                  <h2 className="text-navy-900 text-[14px] font-semibold tracking-[0.56px] uppercase mb-6">
                    Related Posts
                  </h2>
                  <div className="flex flex-col gap-5">
                    {relatedArticles.map((a) => (
                        <Link
                            key={a.id}
                            href={`/blog/${a.handle}`}
                            className="group flex flex-col bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                          {/* Card image */}
                          <div className="overflow-hidden bg-gray-100 aspect-[16/10]">
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
                          {/* Card info */}
                          <div className="px-5 py-4 flex flex-col gap-2">
                            <p className="text-[#0086b1] text-[12px] tracking-[0.65px] uppercase">
                              {new Date(a.publishedAt).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }).toUpperCase()}
                            </p>
                            <p className="text-navy-900 text-[14px] font-bold leading-5 line-clamp-2 group-hover:text-[#0086b1] transition-colors">
                              {a.title}
                            </p>
                          </div>
                        </Link>
                    ))}
                  </div>
                </aside>
            )}

          </div>
        </div>

        {/* ── Wholesale CTA ── */}
        <WholesalePricing />
      </main>
  );
}
