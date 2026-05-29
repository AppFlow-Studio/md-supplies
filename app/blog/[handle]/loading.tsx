import { WholesalePricing } from "@/components/home/WholesalePricing";
import { Skeleton }         from "@/components/ui/Skeleton";

export default function ArticleLoading() {
  return (
    <main className="bg-[#f9fafc]">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Hero banner */}
      <Skeleton className="w-full h-[280px] sm:h-[380px]" />

      {/* Article content */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12">
        <div className="max-w-[760px]">
          {/* Meta row: date + author */}
          <div className="flex items-center gap-5 mb-8 flex-wrap">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
          {/* Body text lines — every 5th line is shorter to look natural */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i % 5 === 4 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* More articles */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
          <Skeleton className="h-7 w-36 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px] gap-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[16/9] w-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <WholesalePricing />
    </main>
  );
}
