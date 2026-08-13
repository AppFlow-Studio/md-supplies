import { safeJsonLd } from '@/lib/safe-json-ld'
import { getNonce } from '@/lib/csp-nonce'
import { hasUsablePrice } from '@/lib/purchasability'

interface Props {
  name: string
  description: string
  image: string
  sku: string
  mpn?: string
  gtin?: string
  /** Public brand (custom.brand_name). Undefined when none is approved —
      never the fulfilling vendor, so the Brand node is simply omitted. */
  brand?: string
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
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
  }

  // Never fabricate identifiers or policies: each field is emitted only when
  // a real value exists (gtin is pre-validated by lib/gtin.ts).
  if (mpn) schema.mpn = mpn
  if (gtin) schema.gtin = gtin

  // A zero/missing price is a quote-only item, never a $0 product
  // (lib/purchasability.ts). Emitting an Offer with `price: 0` would tell
  // Google (and any other JSON-LD consumer) a price the page itself refuses
  // to state — the exact card/PDP/structured-data disagreement this schema
  // must not create. Omit the Offer entirely rather than fabricate one.
  if (hasUsablePrice(price)) {
    const offers: Record<string, unknown> = {
      '@type': 'Offer',
      url,
      price,
      priceCurrency,
      availability: `https://schema.org/${availability}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: seller },
    }
    if (priceValidUntil) offers.priceValidUntil = priceValidUntil
    if (returnPolicy) offers.hasMerchantReturnPolicy = returnPolicy
    if (shippingDetails) offers.shippingDetails = shippingDetails
    schema.offers = offers
  }

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
