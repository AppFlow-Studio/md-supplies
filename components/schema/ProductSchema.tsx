interface Props {
  name: string
  description: string
  image: string
  sku: string
  mpn?: string
  gtin?: string
  brand: string
  price: number
  priceCurrency: string
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  url: string
  seller: string
  returnPolicy?: string
  shippingDetails?: string
}

export function ProductSchema({
  name,
  description,
  image,
  sku,
  mpn,
  gtin,
  brand,
  price,
  priceCurrency,
  availability,
  url,
  seller,
  returnPolicy,
  shippingDetails,
}: Props) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    sku,
    brand: { '@type': 'Brand', name: brand },
    offers: {
      '@type': 'Offer',
      url,
      price,
      priceCurrency,
      availability: `https://schema.org/${availability}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: seller },
    },
  }

  if (mpn) schema.mpn = mpn
  if (gtin) schema.gtin = gtin
  if (returnPolicy) (schema.offers as Record<string, unknown>).hasMerchantReturnPolicy = returnPolicy
  if (shippingDetails) (schema.offers as Record<string, unknown>).shippingDetails = shippingDetails

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
