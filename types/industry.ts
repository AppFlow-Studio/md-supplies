export interface FAQ {
  question: string
  answer: string
}

export interface IndustryProduct {
  handle: string
  title: string
  image: string
  price: number
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
  heroImage?: { url: string; altText: string }
  relevantCategories: IndustryCategory[]
  relevantSubcategories: IndustryCategory[]
  relevantProducts: IndustryProduct[]
  relatedGuides: IndustryGuide[]
  ctaText: string
  ctaLink: string
  faq?: FAQ[]
  seoTitle?: string
  seoDescription?: string
}
