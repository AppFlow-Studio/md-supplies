import { Skeleton } from "@/components/ui/Skeleton";

// Root loading fallback. Deliberately skeleton-only: this markup is streamed
// into every route's HTML before the page segment arrives, so anything real
// rendered here is duplicated in the document (audit L14 — two <main>s, three
// duplicate H2s) and its eager <img>s get preloaded by React ahead of the LCP
// image (audit M23 — ~47 preloads). No <main> (the page provides it), no
// headings, no images.
export default function RootLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      {/* Hero skeleton */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 lg:py-24 flex flex-col lg:flex-row gap-10 items-center min-h-[480px] lg:min-h-[600px]">
          <div className="flex-1 flex flex-col gap-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 w-full max-w-[480px]" />
            <Skeleton className="h-14 w-3/4 max-w-[360px]" />
            <Skeleton className="h-5 w-full max-w-[520px]" />
            <Skeleton className="h-5 w-4/5 max-w-[420px]" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-14 w-48" />
              <Skeleton className="h-14 w-36" />
            </div>
          </div>
          <Skeleton className="w-full sm:w-[420px] lg:w-[540px] h-[320px] lg:h-[460px] shrink-0" />
        </div>
      </section>

      {/* Content grid skeleton */}
      <section className="w-full bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">
          <Skeleton className="h-8 w-52 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white flex flex-col">
                <Skeleton className="aspect-square w-full" />
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-20 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
