import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { OCC_HUB } from '@/lib/occ'
import { OCCHubPage } from '@/components/b2b/OCCHub'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import { GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
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

// Possible collection handles — first one that returns products wins.
// Confirm the exact handle with Izzy / Shopify Admin → Collections.
const OCC_COLLECTION_HANDLES = ['occ', 'operation-christmas-child', 'occ-supplies']

interface ProductNode {
  handle: string
  title: string
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } }
  images: { nodes: { url: string; altText: string | null }[] }
}

interface CollectionResult {
  collection: {
    products: { nodes: ProductNode[] }
  } | null
}

interface ProductsResult {
  products: { nodes: ProductNode[] }
}

function toOCCProduct(p: ProductNode): OCCProduct {
  return {
    handle: p.handle,
    title:  p.title,
    image:  p.images.nodes[0]?.url ?? '',
    price:  Math.round(parseFloat(p.priceRange.minVariantPrice.amount) * 100),
  }
}

async function fetchOCCProducts(): Promise<OCCProduct[]> {
  // 1. Try each known collection handle until one returns products
  for (const handle of OCC_COLLECTION_HANDLES) {
    try {
      const data = await storefrontFetch<CollectionResult>(GET_COLLECTION, {
        handle,
        first: 12,
      })
      const nodes = data.collection?.products.nodes ?? []
      if (nodes.length > 0) return nodes.map(toOCCProduct)
    } catch {
      // try next handle
    }
  }

  // 2. Tag-based fallback — catches any handle variation as long as products are tagged
  try {
    const data = await storefrontFetch<ProductsResult>(GET_PRODUCTS_BY_VENDOR, {
      query:   'tag:occ',
      first:   12,
      sortKey: 'BEST_SELLING',
    })
    if (data.products.nodes.length > 0) return data.products.nodes.map(toOCCProduct)
  } catch {
    // fall through
  }

  return []
}

export default async function OCCPage() {
  const liveProducts = await fetchOCCProducts()

  return (
    <>
      <WebPageSchema
        name={OCC_HUB.seoTitle || OCC_HUB.title}
        description={OCC_HUB.seoDescription || OCC_HUB.intro}
        url={`${SITE_URL}/solutions/occ`}
      />
      <BreadcrumbSchema
        items={[{ label: 'OCC', href: '/solutions/occ' }]}
      />
      <OCCHubPage hub={{ ...OCC_HUB, eligibleProducts: liveProducts }} />
    </>
  )
}
