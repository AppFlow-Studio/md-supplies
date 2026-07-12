import { HeroSection }       from "@/components/home/HeroSection";
import { TrustedBrands }     from "@/components/home/TrustedBrands";
import { ShopByIndustry }    from "@/components/home/ShopByIndustry";
import { PopularCategories } from "@/components/home/PopularCategories";
import { PopularProducts }   from "@/components/home/PopularProducts";
import { WhyChooseUs }       from "@/components/home/WhyChooseUs";
import { WholesalePricing }  from "@/components/home/WholesalePricing";
import { storefrontFetch }   from '@/lib/shopify/storefront';
import { GET_PRODUCTS, GET_PRODUCT_CARD_FULL } from '@/lib/shopify/queries/products';
import type { CollectionProduct } from '@/lib/shopify/types';
import { buildMetadata } from '@/lib/seo'
import { buildWebSiteSchema, jsonLdSafe } from '@/lib/schema'
import { getNonce } from '@/lib/csp-nonce'

export const revalidate = 60

export const metadata = buildMetadata({ pageType: 'homepage' })

// Top-selling products confirmed from sales report (2026-05-29 → 2026-06-28).
const POPULAR_PRODUCT_HANDLES = [
  'single-head-stethoscope-22-black',
  'cotton-tipped-wood-applicators-3-2-pack-sterile-9013',
  'blood-collection-tube-holder-luer-slip-w-needle-20g-200-bx',
  'alpha-sheet-fed-duo-web-laser-labels-case-of-1-200-5850',
] as const

interface ProductResult {
  product: CollectionProduct | null
}

interface ProductsResult {
  products: { nodes: CollectionProduct[] }
}

async function fetchProductByHandle(handle: string): Promise<CollectionProduct | null> {
  try {
    const data = await storefrontFetch<ProductResult>(
      GET_PRODUCT_CARD_FULL,
      { handle },
      { next: { revalidate: 300, tags: ['shopify', 'products', `product:${handle}`] } },
    )
    return data.product
  } catch {
    return null
  }
}

export default async function Home() {
  const nonce = await getNonce()
  const [p0, p1, p2, p3, fallbackData] = await Promise.all([
    fetchProductByHandle(POPULAR_PRODUCT_HANDLES[0]),
    fetchProductByHandle(POPULAR_PRODUCT_HANDLES[1]),
    fetchProductByHandle(POPULAR_PRODUCT_HANDLES[2]),
    fetchProductByHandle(POPULAR_PRODUCT_HANDLES[3]),
    storefrontFetch<ProductsResult>(
      GET_PRODUCTS,
      { first: 8, sortKey: 'BEST_SELLING' },
      { next: { revalidate: 300, tags: ['shopify', 'products'] } },
    ),
  ])

  const bestsellers = fallbackData.products.nodes
  const ranked = [p0, p1, p2, p3]

  // For each slot: use the ranked product if it resolved, otherwise the corresponding
  // BEST_SELLING product (dedup'd so the same product never appears twice).
  const usedHandles = new Set(ranked.filter(Boolean).map((p) => p!.handle))
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

  const popularProducts = ranked.map((p) => p ?? nextFallback()).filter(
    (p): p is CollectionProduct => p !== null,
  )

  const heroProducts = bestsellers.slice(0, 4)

  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        nonce={nonce}
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
