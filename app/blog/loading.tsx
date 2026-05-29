import { WholesalePricing } from "@/components/home/WholesalePricing";
import { Skeleton }         from "@/components/ui/Skeleton";

export default function BlogLoading() {
  return (
    <main>
      {/* Static page header — identical to real page, no API dependency */}
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

      {/* Blog grid skeleton */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-20 md:pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 mb-10">
                <Skeleton className="aspect-[16/9] w-full" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <WholesalePricing />
    </main>
  );
}
