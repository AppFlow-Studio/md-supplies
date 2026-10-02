import { HeroSection }       from "@/components/home/HeroSection";
import { TrustedBrands }     from "@/components/home/TrustedBrands";
import { ShopByIndustry }    from "@/components/home/ShopByIndustry";
import { PopularCategories } from "@/components/home/PopularCategories";
import { PopularProducts }   from "@/components/home/PopularProducts";
import { WhyChooseUs }       from "@/components/home/WhyChooseUs";
import { WholesalePricing }  from "@/components/home/WholesalePricing";
import { storefrontFetch }   from '@/lib/shopify/storefront';
import { GET_PRODUCTS } from '@/lib/shopify/queries/products';
import { GET_COLLECTION } from '@/lib/shopify/queries/collections';
import { attachCardShippingDisplay } from '@/lib/shipping-resolver/attach';
import type { Collection, CollectionProduct } from '@/lib/shopify/types';
import { buildMetadata } from '@/lib/seo'
import { buildWebSiteSchema, jsonLdSafe } from '@/lib/schema'

export const metadata = buildMetadata({ pageType: 'homepage' })

// "Popular products" is Shopify-managed (2026-10-02 client request): Juliette
// curates it herself by adding/reordering products in this manual collection
// in Shopify Admin — no developer/code change needed to feature, say,
// respiratory tests during flu season. The handle already existed, unused,
// in the live store (title "Featured Products") — reused rather than
// inventing a new one. Collection membership changes fire the collections/*
// webhook (app/api/revalidate), which already invalidates this exact
// `collection:${FEATURED_PRODUCTS_COLLECTION_HANDLE}` tag, so an edit shows
// up without waiting for the 5-minute background revalidate.
const FEATURED_PRODUCTS_COLLECTION_HANDLE = 'featured-products'

interface ProductsResult {
  products: { nodes: CollectionProduct[] }
}

async function fetchFeaturedProductsCollection(): Promise<CollectionProduct[]> {
  try {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      {
        handle: FEATURED_PRODUCTS_COLLECTION_HANDLE,
        first: 4,
        after: null,
        sortKey: 'COLLECTION_DEFAULT', // respects Juliette's manual drag-order
        reverse: false,
        filters: [],
      },
      {
        next: {
          revalidate: 300,
          tags: ['shopify', 'products', 'collections', `collection:${FEATURED_PRODUCTS_COLLECTION_HANDLE}`],
        },
      },
    )
    return (data.collection?.products.nodes ?? []).filter((p) => p.availableForSale)
  } catch {
    return []
  }
}

export default async function Home() {
  const [featured, fallbackData] = await Promise.all([
    fetchFeaturedProductsCollection(),
    storefrontFetch<ProductsResult>(
      GET_PRODUCTS,
      { first: 8, sortKey: 'BEST_SELLING' },
      { next: { revalidate: 300, tags: ['shopify', 'products'] } },
    ),
  ])

  const bestsellers = fallbackData.products.nodes

  // Juliette's picks fill the slots first, in her collection order; any slot
  // she hasn't curated yet (including all 4, on an empty collection) falls
  // back to best-sellers — dedup'd so the same product never appears twice.
  const usedHandles = new Set(featured.map((p) => p.handle))
  let fallbackCursor = 0
  function nextFallback(): CollectionProduct | null {
    while (fallbackCursor < bestsellers.length) {
      const candidate = bestsellers[fallbackCursor++]
      if (!usedHandles.has(candidate.handle)) {
        usedHandles.add(candidate.handle)
        return candidate
      }
    }
    return null
  }

  const slots: (CollectionProduct | null)[] = [...featured.slice(0, 4)]
  while (slots.length < 4) slots.push(nextFallback())

  const popularProducts = attachCardShippingDisplay(
    slots.filter((p): p is CollectionProduct => p !== null),
  )

  const heroProducts = attachCardShippingDisplay(bestsellers.slice(0, 4))

  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        suppressHydrationWarning
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
