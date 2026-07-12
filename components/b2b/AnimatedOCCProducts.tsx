import { FadeIn } from "@/components/ui/FadeIn";
import { FeaturedProductCard } from "./FeaturedProductCard";
import type { OCCProduct } from "@/types/occ";

export function AnimatedOCCProducts({ products }: { products: OCCProduct[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p, i) => (
        <FadeIn key={p.handle} delay={i * 0.07} className="h-full">
          <FeaturedProductCard product={p} />
        </FadeIn>
      ))}
    </div>
  );
}
