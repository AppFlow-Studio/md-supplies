import { safeJsonLd } from '@/lib/safe-json-ld'
import { getNonce } from '@/lib/csp-nonce'

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
  /** ISO date (YYYY-MM-DD) the offer price is valid until (M6). */
  priceValidUntil?: string
  /** Structured MerchantReturnPolicy JSON-LD fragment (lib/merchant-policy.ts). */
  returnPolicy?: Record<string, unknown>
  /** Structured OfferShippingDetails JSON-LD fragment (lib/merchant-policy.ts). */
  shippingDetails?: Record<string, unknown>
}

export async function ProductSchema({
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
  priceValidUntil,
  returnPolicy,
  shippingDetails,
}: Props) {
  const nonce = await getNonce()
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

  // Never fabricate identifiers or policies: each field is emitted only when
  // a real value exists (gtin is pre-validated by lib/gtin.ts).
  if (mpn) schema.mpn = mpn
  if (gtin) schema.gtin = gtin
  const offers = schema.offers as Record<string, unknown>
  if (priceValidUntil) offers.priceValidUntil = priceValidUntil
  if (returnPolicy) offers.hasMerchantReturnPolicy = returnPolicy
  if (shippingDetails) offers.shippingDetails = shippingDetails

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
