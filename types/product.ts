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
  brand: string
  vendor: string
  partnerVendor?: string
  price: number
  compareAtPrice?: number
  sku: string
  available: boolean
  leadTime?: string
  isOCC?: boolean
  hasFreeShipping?: boolean
  isRx?: boolean
  variants: { id: string; title: string; price: number; available: boolean }[]
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
