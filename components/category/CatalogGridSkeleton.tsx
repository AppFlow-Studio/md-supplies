import { Skeleton } from '@/components/ui/Skeleton'

// Suspense fallback for a streaming product grid (Cache Components). Shown only
// while the request-time results stream in on the PPR routes (solutions/occ,
// industries/[slug], partners/[slug]/products) whose grid depends on
// searchParams; the surrounding shell (breadcrumb, hero, subcategory nav) is the
// prerendered static shell around this boundary.
export function CatalogGridSkeleton({ cards = 9 }: { cards?: number }) {
  return (
    <div aria-hidden className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="border border-gray-200 bg-white">
          <Skeleton className="aspect-square w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-1/3 mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}
