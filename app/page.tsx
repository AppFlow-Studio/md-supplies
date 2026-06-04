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
import type { CollectionProduct } from '@/lib/shopify/types';
import { buildMetadata } from '@/lib/seo'
import { buildWebSiteSchema, jsonLdSafe } from '@/lib/schema'

interface CollectionSummary {
  id: string;
  title: string;
  handle: string;
  image: { url: string; altText: string | null } | null;
}

export const metadata = buildMetadata({ pageType: 'homepage' })

export default async function Home() {
  const [productsData, collectionsData] = await Promise.all([
    storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(GET_PRODUCTS, {
      first: 4,
      sortKey: 'BEST_SELLING',
    }),
    storefrontFetch<{ collections: { nodes: CollectionSummary[] } }>(GET_COLLECTIONS, {
      first: 8,
    }),
  ]);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildWebSiteSchema()) }}
      />
      <HeroSection />
      <TrustedBrands />
      <ShopByIndustry />
      <PopularCategories collections={collectionsData.collections.nodes} />
      <PopularProducts products={productsData.products.nodes} />
      <WhyChooseUs />
      <WholesalePricing />
    </main>
  );
}
