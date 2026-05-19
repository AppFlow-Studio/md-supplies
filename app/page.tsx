import { HeroSection }       from "@/components/home/HeroSection";
import { TrustedBrands }     from "@/components/home/TrustedBrands";
import { ShopByIndustry }    from "@/components/home/ShopByIndustry";
import { PopularCategories } from "@/components/home/PopularCategories";
import { PopularProducts }   from "@/components/home/PopularProducts";
import { WhyChooseUs }       from "@/components/home/WhyChooseUs";
import { WholesalePricing }  from "@/components/home/WholesalePricing";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TrustedBrands />
      <ShopByIndustry />
      <PopularCategories />
      <PopularProducts />
      <WhyChooseUs />
      <WholesalePricing />
    </main>
  );
}
