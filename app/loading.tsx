import { TrustedBrands }    from "@/components/home/TrustedBrands";
import { ShopByIndustry }   from "@/components/home/ShopByIndustry";
import { WhyChooseUs }      from "@/components/home/WhyChooseUs";
import { WholesalePricing } from "@/components/home/WholesalePricing";
import { Skeleton }         from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <main>
      {/* Hero skeleton — real HeroSection has H1s that would leak into non-homepage SSR HTML */}
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
      <TrustedBrands />
      <ShopByIndustry />

      {/* PopularCategories skeleton */}
      <section className="w-full bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-52" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white flex flex-col items-center justify-center gap-4 py-10 px-4">
                <Skeleton className="w-[50px] h-[50px] rounded-xl" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PopularProducts skeleton */}
      <section className="w-full bg-neutral-50">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">
          <Skeleton className="h-8 w-52 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white flex flex-col">
                <Skeleton className="aspect-square w-full" />
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-20 mt-1" />
                  <Skeleton className="h-9 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhyChooseUs />
      <WholesalePricing />
    </main>
  );
}
