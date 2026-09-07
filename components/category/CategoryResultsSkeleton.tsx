import { Skeleton } from '@/components/ui/Skeleton'
import { CatalogGridSkeleton } from '@/components/category/CatalogGridSkeleton'

// Instant loading state for the client filter island (CategoryFilterableGrid).
//
// When a filter/sort/search is pressed on the static category route, the URL
// changes and the island fetches /api/catalog. Until that resolves we show THIS
// — a layout-stable skeleton that mirrors CategoryResultsView's two-column shape
// (rail + toolbar + product grid) — instead of flashing the unfiltered default
// grid (which read as a jarring "page refreshed, nothing filtered" to users).
// The dimensions match CategoryResultsView so swapping in the real results does
// not shift layout.
export function CategoryResultsSkeleton() {
  return (
    <div className="flex items-start lg:gap-10" aria-busy="true" role="status" aria-label="Loading results">
      {/* Filter rail placeholder — mirrors the w-[280px] aside. */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-4">
        <div className="space-y-7">
          {Array.from({ length: 4 }).map((_, g) => (
            <div key={g} className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              {Array.from({ length: 4 }).map((_, r) => (
                <Skeleton key={r} className="h-4 w-3/4" />
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Results column */}
      <div className="flex-1 min-w-0">
        {/* Toolbar row: result count (left) + sort control (right). */}
        <div className="mb-4 flex items-center justify-between gap-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        <CatalogGridSkeleton cards={12} />
      </div>
    </div>
  )
}
