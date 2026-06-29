import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { OCC_HUB } from '@/lib/occ'
import { OCCHubPage } from '@/components/b2b/OCCHub'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT_CARD_BY_HANDLE, GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
import type { OCCProduct } from '@/types/occ'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

export const revalidate = 3600

export const metadata: Metadata = buildMetadata({
  pageType: 'occ',
  title: OCC_HUB.seoTitle,
  description: OCC_HUB.seoDescription || OCC_HUB.intro,
})

interface ProductCardNode {
  handle: string
  title: string
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } }
  images: { nodes: { url: string; altText: string | null }[] }
}

interface ProductsResult {
  products: {
    nodes: ProductCardNode[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

interface ProductCardResult {
  product: ProductCardNode | null
}

function toOCCProduct(p: ProductCardNode): OCCProduct {
  return {
    handle: p.handle,
    title:  p.title,
    image:  p.images.nodes[0]?.url ?? '',
    price:  Math.round(parseFloat(p.priceRange.minVariantPrice.amount) * 100),
  }
}

async function fetchOCCProducts(fallbacks: OCCProduct[]): Promise<OCCProduct[]> {
  // Primary: products tagged 'occ' in Shopify (store owner controls this list)
  try {
    const data = await storefrontFetch<ProductsResult>(GET_PRODUCTS_BY_VENDOR, {
      query:   'tag:occ',
      first:   12,
      sortKey: 'BEST_SELLING',
    })
    if (data.products.nodes.length > 0) {
      return data.products.nodes.map(toOCCProduct)
    }
  } catch {
    // fall through to per-handle resolution
  }

  // Fallback: resolve the static handle list one by one
  const results = await Promise.allSettled(
    fallbacks.map(({ handle }) =>
      storefrontFetch<ProductCardResult>(GET_PRODUCT_CARD_BY_HANDLE, { handle })
    )
  )
  return results.map((result, i) => {
    const fallback = fallbacks[i]
    if (result.status === 'rejected' || !result.value.product) return fallback
    return toOCCProduct(result.value.product)
  })
}

export default async function OCCPage() {
  const liveProducts = await fetchOCCProducts(OCC_HUB.eligibleProducts)

  return (
    <>
      <WebPageSchema
        name={OCC_HUB.seoTitle || OCC_HUB.title}
        description={OCC_HUB.seoDescription || OCC_HUB.intro}
        url={`${SITE_URL}/solutions/occ`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'OCC',  item: `${SITE_URL}/solutions/occ` },
        ]}
      />
      <OCCHubPage hub={{ ...OCC_HUB, eligibleProducts: liveProducts }} />
    </>
  )
}
