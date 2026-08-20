import type { Product, ProductMetafields, ProductVariant, VariantMetafields } from '@/lib/shopify/types'

// Shopify returns metafields as `{ value: string } | null`, not bare strings.
// This type reflects the actual JSON shape before we normalize it.
export type RawMetafield = { value: string } | null

// Mirrors ProductVariant's raw-metafield shape the same way RawProduct does
// for product-level metafields (below) — variant.image is a native field,
// already correctly typed on ProductVariant, so it is NOT part of this
// remapped set.
export type RawVariant = Omit<ProductVariant, keyof VariantMetafields> & {
  [K in keyof VariantMetafields]?: RawMetafield
}

export type RawProduct = Omit<Product, keyof ProductMetafields | 'variants'> & {
  variants: { nodes: RawVariant[] }
} & {
  [K in keyof ProductMetafields]: RawMetafield
}

export function normalizeVariant(raw: RawVariant): ProductVariant {
  const mv = (m: RawMetafield | undefined): string | null => m?.value ?? null
  return {
    ...raw,
    manufacturerNumber: mv(raw.manufacturerNumber),
    orderSize:          mv(raw.orderSize),
    unitsPerOrder:      mv(raw.unitsPerOrder),
    // custom.variant_description is a Shopify "Rich text" metafield (confirmed
    // live against the AeroWalk QA pilot, 2026-08-17) — its raw .value is
    // JSON, not display text. Kept raw here and flattened at render time by
    // ProductView.tsx via lib/policy/rich-text.ts, same as shippingReturns
    // below — one flattening implementation, not two.
    description:        mv(raw.description),
    innerPackQuantity:  mv(raw.innerPackQuantity),
    packsPerCase:       mv(raw.packsPerCase),
    totalOrderQuantity: mv(raw.totalOrderQuantity),
  }
}

/**
 * Flattens GET_PRODUCT's raw metafield objects into the Product shape the
 * UI consumes. Shared by every route that renders a PDP — the category
 * product route previously skipped this and passed raw `{ value }` objects
 * into ProductView (crashing spec rows / breaking the backorder date).
 */
export function normalizeProduct(raw: RawProduct): Product {
  const mv = (m: RawMetafield | undefined): string | null => m?.value ?? null
  return {
    ...raw,
    variants:             { nodes: raw.variants.nodes.map(normalizeVariant) },
    brandName:            mv(raw.brandName),
    unitsPerOrder:        mv(raw.unitsPerOrder),
    quantityOfUnits:      mv(raw.quantityOfUnits),
    orderSize:            mv(raw.orderSize),
    material:             mv(raw.material),
    use:                  mv(raw.use),
    features:             mv(raw.features),
    color:                mv(raw.color),
    sterility:            mv(raw.sterility),
    thickness:            mv(raw.thickness),
    gloveSize:            mv(raw.gloveSize),
    needleGauge:          mv(raw.needleGauge),
    needleLength:         mv(raw.needleLength),
    sizeLength:           mv(raw.sizeLength),
    estimatedRestockDate: mv(raw.estimatedRestockDate),
    backorderRestockEta:  mv(raw.backorderRestockEta),
    // custom.shipping_returns (H-01) is a rich_text_field, confirmed by
    // Izzy's 2026-08-14 field contract — kept raw here, flattened at render
    // time by ProductView.tsx's vendorPolicyText via lib/policy/rich-text.ts.
    shippingReturns:      mv(raw.shippingReturns),
    testsFor:             mv(raw.testsFor),
    detectableDrugs:      mv(raw.detectableDrugs),
    adulterants:          mv(raw.adulterants),
    otherFeatures:        mv(raw.otherFeatures),
    typeList:             mv(raw.typeList),
    customBadge1:         mv(raw.customBadge1),
    customBadge2:         mv(raw.customBadge2),
    customBadge3:         mv(raw.customBadge3),
  }
}
