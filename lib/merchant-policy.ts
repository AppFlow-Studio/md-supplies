/**
 * Store-wide shipping + returns defaults for the Product schema Offer
 * (M6, Merchant-listing warnings).
 *
 * Both are null until the real store-wide policy arrives (owner: Bilal).
 * While null, the Offer simply omits `shippingDetails` /
 * `hasMerchantReturnPolicy` — nothing fabricated is ever published, matching
 * the visible policy pages. To go live, replace the nulls with real values;
 * every product page updates at once.
 *
 * Shapes follow Google's Merchant-listing structured-data requirements
 * (OfferShippingDetails / MerchantReturnPolicy).
 */

/* TODO(Bilal): fill from the real shipping policy, e.g.
{
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'USD' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
    transitTime:  { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' },
  },
} */
export const OFFER_SHIPPING_DETAILS: Record<string, unknown> | null = null

/* TODO(Bilal): fill from the real returns policy, e.g.
{
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'US',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 30,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
} */
export const MERCHANT_RETURN_POLICY: Record<string, unknown> | null = null
