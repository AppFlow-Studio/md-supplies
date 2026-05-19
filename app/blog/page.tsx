import type { Metadata } from "next";
import { BlogGrid }        from "@/components/blog/BlogGrid";
import { WholesalePricing } from "@/components/home/WholesalePricing";

export const metadata: Metadata = {
  title: "Blog | MD Supplies",
  description:
    "Tips, guides, and industry updates for healthcare professionals and facility managers.",
};

export default function BlogPage() {
  return (
    <main>

      {/* ── Page header ── */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pt-16 md:pt-20 lg:pt-24 pb-12 md:pb-16">

          <p className="text-teal-500 text-[13px] sm:text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
            Resources &amp; Insights
          </p>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h1 className="text-[40px] sm:text-[50px] font-semibold text-navy-900 leading-[1.1] tracking-tight">
              Blog
            </h1>
            <p className="text-gray-500 text-[15px] leading-[1.65] max-w-[420px]">
              Tips, guides, and industry updates for healthcare professionals and facility managers.
            </p>
          </div>

        </div>
      </section>

      {/* ── Blog grid + pagination ── */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-20 md:pb-24">
          <BlogGrid />
        </div>
      </section>

      {/* ── Wholesale CTA (reused) ── */}
      <WholesalePricing />

    </main>
  );
}
