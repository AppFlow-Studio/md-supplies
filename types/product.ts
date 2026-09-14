import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

export interface ProductImage {
  url: string
  altText: string
  width: number
  height: number
}

export interface ProductVariant {
  id: string
  title: string
  sku: string
  price: number
  available: boolean
  selectedOptions: { name: string; value: string }[]
}

export interface ProductOption {
  name: string
  values: string[]
}

export interface RelatedProduct {
  handle: string
  title: string
  image: string
  price: number
}

export interface RelatedCollection {
  handle: string
  title: string
}

export interface Breadcrumb {
  title: string
  handle?: string
}

export interface ProductCardData {
  handle: string
  title: string
  image: { url: string; altText: string; width: number; height: number }
  images?: { url: string; altText: string; width: number; height: number }[]
  brand: string
  vendor: string
  partnerVendor?: string
  price: number
  compareAtPrice?: number
  sku: string
  available: boolean
  isOCC?: boolean
  // No hasFreeShipping / leadTime here: a shipping claim may come only from
  // the resolver-backed shippingDisplay (DEV-LABEL-01 / DEV-SHIP-01).
  shippingDisplay?: ShippingDisplay | null
  isRx?: boolean
  /** Flattened `custom.backorder` — boolean gate; the ETA below is optional decoration only. */
  isBackordered?: boolean
  backorderRestockDate?: string | null
  variants: {
    id: string
    title: string
    /** Optional so pre-DEV-CATALOG fixtures/call sites still type-check;
        real toCardData() mappers always populate it now. */
    sku?: string | null
    price: number
    compareAtPrice?: number
    available: boolean
    /** Native Shopify variant-media assignment. Null/absent when the
        variant has no assigned image — QuickAddContent falls back to a
        neutral state rather than showing a sibling variant's image
        (2026-08-14 fix, mirrors the PDP's useSelectedVariant). */
    image?: { url: string; altText: string; width: number; height: number } | null
    /** Raw `custom.backorder` scoped to this variant (Bilal, 2026-09-14:
        same "variant first, product only when blank" rule as the PDP —
        lib/shopify/types.ts's VariantMetafields.backorder). Null/absent
        means this variant has no metafield value of its own, not "not
        backordered" — Quick Add falls back to the product-level flag. */
    backorder?: { value: string } | null
    /** This variant's own resolved shipping claim, attached server-side by
        attachCardShippingDisplay (Bilal, 2026-09-14) — resolveVariantShippingDisplay's
        per-variant class, gated by this variant's own custom.free_shipping
        (falling back to the product-level one when blank). Quick Add reads
        this instead of the top-level `shippingDisplay`, which collapses to
        FALLBACK whenever a product's variants disagree on class. */
    shippingDisplay?: ShippingDisplay | null
  }[]
}

export interface Product {
  title: string
  handle: string
  images: ProductImage[]
  imageAltText: string

  brand: string
  vendor: string
  partnerVendor: string

  sku: string
  price: number
  compareAtPrice?: number

  variants: ProductVariant[]
  options: ProductOption[]

  description: string
  specifications: { label: string; value: string }[]

  unitsPerBox: number
  boxesPerCase: number
  totalUnits: number
  sellingUnit: string
  unitPriceEach: number
  unitPriceBox: number
  unitPriceCase: number

  shippingMessage: string
  leadTime: string
  returnPolicySummary: string

  relatedProducts: RelatedProduct[]
  relatedCollections: RelatedCollection[]

  breadcrumbs: Breadcrumb[]

  seoTitle: string
  seoDescription: string
}
