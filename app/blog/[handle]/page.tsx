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

  const pageUrl = `${SITE_URL}/blog/${handle}`
  const publisherLogo = `${SITE_URL}/images/og-default.jpg`

  return (
    <main id="main-content" className="bg-[#f9fafc]">
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
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li>
              <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li>
              <Link href="/blog" className="text-gray-500 hover:text-navy-900 transition-colors">
                Blog
              </Link>
            </li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold line-clamp-1">{article.title}</li>
          </ol>
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
      </FadeIn>



      {/* ── Wholesale CTA ── */}
      <WholesalePricing />
    </main>
  );
}
