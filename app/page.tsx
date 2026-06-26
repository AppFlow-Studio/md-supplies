import { HeroSection }       from "@/components/home/HeroSection";
import { TrustedBrands }     from "@/components/home/TrustedBrands";
import { ShopByIndustry }    from "@/components/home/ShopByIndustry";
import { PopularCategories } from "@/components/home/PopularCategories";
import { PopularProducts }   from "@/components/home/PopularProducts";
import { WhyChooseUs }       from "@/components/home/WhyChooseUs";
import { WholesalePricing }  from "@/components/home/WholesalePricing";
import { storefrontFetch } from '@/lib/shopify/storefront';
import { GET_PRODUCTS } from '@/lib/shopify/queries/products';
import type { CollectionProduct } from '@/lib/shopify/types';
import { buildMetadata } from '@/lib/seo'
import { buildWebSiteSchema, jsonLdSafe } from '@/lib/schema'

export const revalidate = 60

export const metadata = buildMetadata({ pageType: 'homepage' })

export default async function Home() {
  const productsData = await storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(
    GET_PRODUCTS,
    { first: 8, sortKey: 'BEST_SELLING' },
  );

  const allProducts = productsData.products.nodes;
  const heroProducts = allProducts.slice(0, 4);
  const popularProducts = allProducts.slice(4, 8);

  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildWebSiteSchema()) }}
      />
      <HeroSection products={heroProducts} />
      <TrustedBrands />
      <ShopByIndustry />
      <PopularCategories />
      <PopularProducts products={popularProducts} />
      <WhyChooseUs />
      <WholesalePricing />
    </main>
  );
}
