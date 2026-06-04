export interface FAQ {
  question: string
  answer: string
}

export interface OCCProduct {
  handle: string
  title: string
  image: string
  price: number
}

export interface OCCCategory {
  handle: string
  title: string
}

export interface OCCHub {
  title: string
  intro: string
  programExplanation: string
  freeShippingMessage: string
  eligibleCategories: OCCCategory[]
  eligibleProducts: OCCProduct[]
  faq?: FAQ[]
  seoTitle?: string
  seoDescription?: string
}
