import { Skeleton } from "@/components/ui/Skeleton";

export function CategoryResultsSkeleton() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px]">
        <Skeleton className="h-5 w-20 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-7">
            <Skeleton className="h-4 w-28 mb-3" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2 mb-2.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* Product grid */}
      <div className="flex-1 min-w-0">
        {/* Sort bar */}
        <div className="flex justify-end mb-6">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-white">
              <Skeleton className="aspect-square w-full" />
              <div className="px-[22px] pt-[19px] pb-[22px] flex flex-col gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
