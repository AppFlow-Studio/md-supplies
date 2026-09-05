import { safeJsonLd } from '@/lib/safe-json-ld'
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
  priceValidUntil,
  returnPolicy,
  shippingDetails,
}: Props) {
  // Google's Product rich result requires at least one of offers, review, or
  // aggregateRating. This component never emits review/aggregateRating (no
  // real review data exists), and a zero/unusable price already omits offers
  // (see below) — so a quote-only product would emit a Product node with NONE
  // of the three, which Google's validator flags as a missing required field.
  // That's the real cause behind the 12 pharmacy/HRT Rich Results errors
  // (2026-08-21 audit; all on /category/pharmacy-products/<handle>, all
  // zero-price/quote-only items per docs/audits/2026-08-02-catalog-cro/
  // zero-price-active-variants.csv) — distinct from the zero-price-Offer
  // theory already ruled out. Skip the whole block rather than submit an
  // incomplete one.
  if (!hasUsablePrice(price)) return null

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

  // Price is guaranteed usable here (see the early return above), so the
  // Offer is always built — never with a fabricated $0/missing price.
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

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
