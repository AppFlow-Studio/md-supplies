import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { OCC_HUB } from '@/lib/occ'
import { OCCHubPage } from '@/components/b2b/OCCHub'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT_CARD_BY_HANDLE } from '@/lib/shopify/queries/products'
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

interface ProductCardResult {
  product: {
    handle: string
    title:  string
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } }
    images: { nodes: { url: string; altText: string | null }[] }
  } | null
}

async function fetchLiveProducts(fallbacks: OCCProduct[]): Promise<OCCProduct[]> {
  const results = await Promise.allSettled(
    fallbacks.map(({ handle }) =>
      storefrontFetch<ProductCardResult>(GET_PRODUCT_CARD_BY_HANDLE, { handle })
    )
  )

  return results.map((result, i) => {
    const fallback = fallbacks[i]
    if (result.status === 'rejected' || !result.value.product) return fallback
    const p = result.value.product
    return {
      handle:  p.handle,
      title:   p.title,
      image:   p.images.nodes[0]?.url ?? fallback.image,
      price:   Math.round(parseFloat(p.priceRange.minVariantPrice.amount) * 100),
    }
  })
}

export default async function OCCPage() {
  const liveProducts = await fetchLiveProducts(OCC_HUB.eligibleProducts)

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
