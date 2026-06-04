import { BlogGrid } from "@/components/blog/BlogGrid";
import { WholesalePricing } from "@/components/home/WholesalePricing";
import { storefrontFetch } from "@/lib/shopify/storefront";
import { GET_BLOGS_WITH_ARTICLES } from "@/lib/shopify/queries/blog";
import type { ShopifyBlog, BlogArticleSummary } from "@/lib/shopify/types";
import { buildMetadata } from '@/lib/seo'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import {FadeIn} from "@/components/ui/FadeIn";

export const revalidate = 3600;

export const metadata = buildMetadata({
  pageType: 'blog-hub',
  description: 'Tips, guides, and industry updates for healthcare professionals and facility managers.',
})

export default async function BlogPage() {
  let articles: BlogArticleSummary[] = [];

  try {
    const data = await storefrontFetch<{ blogs: { nodes: ShopifyBlog[] } }>(
      GET_BLOGS_WITH_ARTICLES,
      { first: 50 },
    );
    articles = data.blogs.nodes.flatMap((b) => b.articles.nodes);
  } catch {
    // If Shopify blog is not yet set up, articles stays empty — page still renders
  }

  return (

    <main id="main-content">
      <WebPageSchema
        name="MDSupplies Blog"
        description="Tips, guides, and industry updates for healthcare professionals and facility managers."
        url={`${SITE_URL}/blog`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Blog', item: `${SITE_URL}/blog` },
        ]}
      />
      {/* ── Page header ── */}
      <section className="w-full bg-white border-b border-gray">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pt-16 md:pt-20 lg:pt-24 pb-12 md:pb-16">
          <FadeIn delay={0}>
            <p className="text-teal-500 text-[13px] sm:text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
              Resources &amp; Insights
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h1 className="text-[40px] sm:text-[50px] font-semibold text-navy-900 leading-[1.1] tracking-tight">
                Blog
              </h1>
              <p className="text-gray-500 text-[15px] leading-[1.65] max-w-[420px]">
                Tips, guides, and industry updates for healthcare professionals and facility managers.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Blog grid + pagination ── */}
      <section className="w-full bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 md:py-16">
          {articles.length > 0 ? (
            <BlogGrid articles={articles} />
          ) : (
            <p className="text-gray-500 text-[15px] py-12">No articles yet — check back soon.</p>
          )}
        </div>
      </section>

      {/* ── Wholesale CTA ── */}
      <WholesalePricing />
    </main>
  );
}
