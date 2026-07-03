import { Skeleton } from "@/components/ui/Skeleton";
import { CategoryResultsSkeleton } from "@/components/category/CategoryResultsSkeleton";

export default function CategoryLoading() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Hero banner */}
      <Skeleton className="w-full h-[220px] sm:h-[280px]" />

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex gap-0 items-start">
        <CategoryResultsSkeleton />
      </div>
    </main>
  );
}
