export interface Author {
  name: string
  slug?: string
  avatar?: string
}

export interface TOCEntry {
  id: string
  text: string
  level: 2 | 3
}

export interface BlogArticleSummary {
  slug: string
  title: string
  featuredImage: { url: string; altText: string; width: number; height: number }
  publishedAt: string
  modifiedAt?: string
  excerpt: string
  topic?: string
  author: Author
}

export interface BlogArticle extends BlogArticleSummary {
  publisher: string
  body: string
  tableOfContents?: TOCEntry[]
  relatedArticles: BlogArticleSummary[]
  relatedProducts?: { handle: string; title: string; image: string; price: number }[]
  relatedCategories?: { handle: string; title: string }[]
  seoTitle?: string
  seoDescription?: string
  ogImage?: string
}
