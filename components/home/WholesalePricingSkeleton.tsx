import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading placeholder for <WholesalePricing />.
 *
 * WHY THIS EXISTS — two independent reasons, both real:
 *
 * 1. CSP. WholesalePricing is a client component ("use client") that pulls in
 *    a server action (submitForm) and FadeIn. Rendering it inside a
 *    `loading.tsx` Suspense fallback made Next emit its client chunk as an
 *    async <script> WITHOUT the request nonce. Under `strict-dynamic` the
 *    'self' source is ignored, so that one nonce-less same-origin script was
 *    blocked outright — the long-standing console error on /blog and
 *    /blog/[handle]. Those were the only two routes putting a client
 *    component in a loading fallback, and the only two with the error.
 *
 * 2. It was wrong on its own terms. A loading fallback is a PLACEHOLDER. The
 *    previous version rendered a fully interactive lead-capture form, complete
 *    with a server action, that a shopper could begin filling in moments
 *    before it was torn down and replaced. Shipping interactive JS to render
 *    something guaranteed to be discarded is waste at best and a lost lead at
 *    worst.
 *
 * Dimensions mirror the real section (min-h-[580px], teal left panel, white
 * right panel at the same widths) so the swap costs no layout shift.
 */
export function WholesalePricingSkeleton() {
  return (
    <section
      aria-hidden
      className="w-full bg-neutral-50 overflow-hidden relative"
    >
      <div className="mx-auto flex flex-col lg:flex-row min-h-[580px]">
        {/* Left: teal panel — solid, matching the real one's background */}
        <div className="bg-teal-500 flex-1 px-8 sm:px-12 lg:px-16 py-14 md:py-32 flex flex-col justify-center gap-6">
          <Skeleton className="h-9 w-64 rounded-full bg-white/20" />
          <Skeleton className="h-10 w-3/4 bg-white/20" />
          <Skeleton className="h-10 w-1/2 bg-white/20" />
          <div className="flex flex-col gap-3 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-64 bg-white/20" />
            ))}
          </div>
        </div>

        {/* Spacer — desktop only, reserves room for the absolute form panel */}
        <div className="hidden lg:block w-[40%] shrink-0" />

        {/* Right: form panel */}
        <div
          className="bg-white w-full px-8 sm:px-12 py-14
                     lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:right-[8%] lg:w-[560px] lg:px-14 lg:py-16
                     xl:w-[642px]
                     flex flex-col justify-center gap-8"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </section>
  );
}
