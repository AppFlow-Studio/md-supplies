export interface PartnerLogo {
  url: string
  altText: string
  width: number
  height: number
}

export interface PartnerFeaturedProduct {
  handle: string
  title: string
  image: string
  price: number
}

export interface PartnerRelatedCategory {
  handle: string
  title: string
}

export interface Partner {
  slug: string
  name: string
  vendorName: string    // exact Shopify product.vendor string (e.g. "Dynarex")
  type: 'brand' | 'vendor'
  isActive: boolean
  description: string
  logo: PartnerLogo
  intro: string
  productCategories: string[]
  featuredProducts: PartnerFeaturedProduct[]
  relatedBrands?: string[]
  relatedCategories: PartnerRelatedCategory[]
  seoTitle?: string
  seoDescription?: string
}
