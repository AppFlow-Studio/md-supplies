export interface FAQItem {
  question: string
  answer: string
}

export interface ContentSection {
  h2: string
  body: string
}

export interface PageSEO {
  route: string
  pageType: 'category' | 'subcategory' | 'industry' | 'partner' | 'solution' | 'blog'
  primaryKeyword: string
  secondaryKeywords: string[]
  searchIntent: string
  targetAudience: string
  title: string
  metaDescription: string
  h1: string
  answerBlock: string
  contentSections: ContentSection[]
  faqs: FAQItem[]
  internalLinks: string[]
  schemaTypes: string[]
  imageAltPattern: string
  croNotes: string
  priority: 'P0' | 'P1' | 'P2'
  implementationStatus: 'pending' | 'in-progress' | 'complete'
  ahrefsResearchDate: string
}
