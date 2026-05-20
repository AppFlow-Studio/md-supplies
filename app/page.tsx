import { HeroSection }       from "@/components/home/HeroSection";
import { TrustedBrands }     from "@/components/home/TrustedBrands";
import { ShopByIndustry }    from "@/components/home/ShopByIndustry";
import { PopularCategories } from "@/components/home/PopularCategories";
import { PopularProducts }   from "@/components/home/PopularProducts";
import { WhyChooseUs }       from "@/components/home/WhyChooseUs";
import { WholesalePricing }  from "@/components/home/WholesalePricing";
import { storefrontFetch } from '@/lib/shopify/storefront';
import { GET_PRODUCTS } from '@/lib/shopify/queries/products';
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections';
import type { Product, Collection } from '@/lib/shopify/types';

export default async function Home() {
  const [products, collections] = await Promise.all([
    storefrontFetch<{ products: { nodes: Product[] } }>(GET_PRODUCTS, {
      first: 4,
      sortKey: 'BEST_SELLING',
    }),
    storefrontFetch<{ collections: { nodes: Collection[] } }>(GET_COLLECTIONS, {
      first: 6,
    }),
  ]);

  console.log('=== PRODUCTS ===');
  console.log(JSON.stringify(products.products.nodes, null, 2));

  console.log('=== COLLECTIONS ===');
  console.log(JSON.stringify(collections.collections.nodes, null, 2));

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
