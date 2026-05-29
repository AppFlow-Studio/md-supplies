import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductLoading() {
  return (
    <main className="bg-[#f9fafc]">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: image gallery */}
          <div className="w-full lg:w-[520px] shrink-0 flex flex-col gap-3">
            <Skeleton className="aspect-square w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-[70px] h-[70px]" />
              ))}
            </div>
          </div>

          {/* Right: product info */}
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-32" />
            <div className="flex gap-2 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20" />
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 flex-1" />
            </div>
            <div className="flex gap-6 mt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-24" />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs bar */}
        <div className="flex gap-8 mt-12 border-b border-gray-200 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-28 mb-3" />
          ))}
        </div>

        {/* Tab body */}
        <div className="mt-6 flex flex-col gap-3 max-w-[760px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      </div>

      {/* Related products */}
      <section className="bg-white border-t border-gray-200 mt-10">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
          <Skeleton className="h-7 w-48 mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col bg-neutral-50 flex-1 min-w-[160px]">
                <Skeleton className="aspect-square w-full" />
                <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
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
