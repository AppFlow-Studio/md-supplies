import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductLoading() {
  return (
    <main className="bg-[#f9fafc]">
      {/* Breadcrumb — 3 segments: Home › vendor › title */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-20" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <section className="bg-[#f9fafc]">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-14 flex flex-col lg:flex-row gap-10 xl:gap-14">
          {/* Left: image gallery — matches lg:w-[52%] */}
          <div className="lg:w-[52%] shrink-0 flex flex-col gap-4">
            <Skeleton className="aspect-square w-full" />
            <div className="flex gap-3 overflow-x-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="size-[80px] sm:size-[100px] lg:size-[120px] shrink-0" />
              ))}
            </div>
          </div>

          {/* Right: product info */}
          <div className="flex-1 flex flex-col gap-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-9 w-32" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20" />
              ))}
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 flex-1" />
            </div>
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-24" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs — wrapped in bg-white section matching real ProductView */}
      <section className="bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-28 mx-5 my-5 shrink-0" />
              ))}
            </div>
          </div>
          <div className="py-10 sm:py-14 max-w-[760px] flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Related products — flex-col sm:flex-row matching real layout */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
          <Skeleton className="h-6 w-52 mb-8" />
          <div className="flex flex-col sm:flex-row gap-[23px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col bg-neutral-50 flex-1 min-w-[160px]">
                <Skeleton className="aspect-square w-full" />
                <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
