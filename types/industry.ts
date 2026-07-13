import type { CollectionProduct } from '@/lib/shopify/types'

export interface FAQ {
  question: string
  answer: string
}

export interface IndustryCategory {
  handle: string
  title: string
}

export interface IndustryGuide {
  slug: string
  title: string
}

export interface Industry {
  slug: string
  name: string
  isPopulated: boolean
  intro: string
  buyerType?: string
  heroImage?: { url: string; altText: string }
  relevantCategories: IndustryCategory[]
  relevantSubcategories: IndustryCategory[]
  relevantProducts: CollectionProduct[]
  relatedGuides: IndustryGuide[]
  ctaText: string
  ctaLink: string
  faq?: FAQ[]
  seoTitle?: string
  seoDescription?: string
}
