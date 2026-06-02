import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, User } from "lucide-react";
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
import { MoreArticles } from "@/components/blog/MoreArticles";
import { buildMetadata } from '@/lib/seo'
import { BlogPostingSchema } from '@/components/schema/BlogPostingSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

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
  const { handle } = await params
  try {
    const found = await findArticle(handle)
    if (!found) return { title: 'Article | MD Supplies Blog' }
    const { article } = found
    return buildMetadata({
      pageType: 'blog-article',
      title: article.title,
      description: article.excerpt?.slice(0, 155) ?? undefined,
      slug: handle,
      image: article.image?.url,
    })
  } catch {
    return { title: 'Article | MD Supplies Blog' }
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ShopifyArticlePage({ params }: Props) {
  const { handle } = await params;

  const found = await findArticle(handle).catch(() => null);
  if (!found) notFound();

  const { article } = found;

  // Fetch a few more articles for the "More articles" section
  let moreArticles: BlogArticleSummary[] = [];
  try {
    const blogsData = await storefrontFetch<{ blogs: { nodes: ShopifyBlog[] } }>(
      GET_BLOGS_WITH_ARTICLES,
      { first: 6 },
    );
    moreArticles = blogsData.blogs.nodes
      .flatMap((b) => b.articles.nodes)
      .filter((a) => a.handle !== handle)
      .slice(0, 3);
  } catch {
    // silently skip if unavailable
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const pageUrl = `${SITE_URL}/blog/${handle}`
  const publisherLogo = `${SITE_URL}/images/og-default.jpg`

  return (
    <main className="bg-[#f9fafc]">
      <BlogPostingSchema
        title={article.title}
        description={article.excerpt ?? article.title}
        url={pageUrl}
        featuredImage={article.image?.url ?? publisherLogo}
        publishedAt={article.publishedAt}
        authorName={article.author.name}
        publisherName="MDSupplies"
        publisherLogo={publisherLogo}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Blog', item: `${SITE_URL}/blog` },
          { name: article.title, item: pageUrl },
        ]}
      />
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">
            Home
          </Link>
          <span className="text-gray-500">›</span>
          <Link href="/blog" className="text-gray-500 hover:text-navy-900 transition-colors">
            Blog
          </Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold line-clamp-1">{article.title}</span>
        </nav>
      </div>

      {/* Hero image */}
      {article.image && (
        <FadeIn delay={0} className="w-full">
          <div className="bg-navy-900 overflow-hidden h-[280px] sm:h-[380px] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image.url}
              alt={article.image.altText ?? article.title}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-end pb-10">
              <h1 className="text-white text-[26px] sm:text-[36px] font-bold leading-tight max-w-[720px]">
                {article.title}
              </h1>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Article content */}
      <FadeIn delay={0.1} className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12">
        <div className="max-w-[760px]">
          {/* Meta row */}
          <div className="flex items-center gap-5 mb-8 flex-wrap">
            <div className="flex items-center gap-2 text-gray-500 text-[14px]">
              <Calendar size={14} className="text-teal-500" />
              {publishedDate}
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-[14px]">
              <User size={14} className="text-teal-500" />
              {article.author.name}
            </div>
            {article.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-teal-50 text-teal-700 text-[11px] font-semibold px-2 py-0.5 border border-teal-200 uppercase tracking-[0.22px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* No hero image: show title here */}
          {!article.image && (
            <h1 className="text-navy-900 text-[28px] sm:text-[36px] font-bold leading-tight mb-8">
              {article.title}
            </h1>
          )}

          {/* Body */}
          <div
            className="prose prose-gray max-w-none text-[16px] leading-[1.75] text-gray-600
              prose-headings:text-navy-900 prose-headings:font-semibold
              prose-a:text-teal-500 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-navy-900
              prose-li:marker:text-teal-500"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />

          {/* Back link */}
          <div className="mt-14 pt-8 border-t border-gray-200">
            <Link
              href="/blog"
              className="flex items-center gap-2 text-navy-900 text-[14px] font-semibold hover:text-teal-500 transition-colors w-fit"
            >
              <ArrowLeft size={16} />
              Back to all articles
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* More articles */}
      <MoreArticles articles={moreArticles} />

      <WholesalePricing />
    </main>
  );
}
