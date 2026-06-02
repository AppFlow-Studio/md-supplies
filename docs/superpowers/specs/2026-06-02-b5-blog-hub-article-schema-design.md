# B5 · Blog Hub + Article Templates + BlogPosting & Product Schema Design Spec

**Date:** 2026-06-02
**Status:** Approved
**Depends on:** B1 (lib/seo), B4 (components/schema/ pattern)

---

## Overview

Enhance the existing Shopify-connected blog with better SEO, structured data, and richer article templates. Add two static priority article pages (Types of Needles, Types of Sutures) using mock content — these are static Next.js routes that take precedence over the dynamic `[handle]` route, so the live Shopify blog is untouched.

---

## Architecture

Two existing routes are enhanced (no breaking changes). Two new static routes are added. Schema components, blog components, types, and mock data are all new files.

```
app/
  blog/
    page.tsx                         # ENHANCED: buildMetadata, topic filter
    [handle]/
      page.tsx                       # ENHANCED: BlogPostingSchema, buildMetadata, ogImage
    types-of-needles/
      page.tsx                       # NEW: static, mock content
    types-of-sutures/
      page.tsx                       # NEW: static, mock content

components/
  blog/
    ArticleCard.tsx                  # NEW: richer card with image + topic
    ArticlePage.tsx                  # NEW: full article layout for static pages
    TableOfContents.tsx              # NEW: 'use client', sticky desktop/collapsible mobile
    ArticleBody.tsx                  # NEW: sanitized HTML renderer
    BlogCard.tsx                     # UNCHANGED
    BlogGrid.tsx                     # UNCHANGED
    MoreArticles.tsx                 # UNCHANGED
    Pagination.tsx                   # UNCHANGED
  schema/
    BlogPostingSchema.tsx            # NEW
    ProductSchema.tsx                # NEW
    WebPageSchema.tsx                # UNCHANGED (B4)
    BreadcrumbSchema.tsx             # UNCHANGED (B4)
    FAQSchema.tsx                    # UNCHANGED (B4)

types/
  blog.ts                            # NEW: BlogArticle, BlogArticleSummary, Author, TOCEntry

lib/
  mock/
    blog-articles.ts                 # NEW: 4 articles (2 priority + 2 fillers)
```

---

## Types (`types/blog.ts`)

```typescript
export interface Author {
  name: string
  slug?: string
  avatar?: string
}

export interface TOCEntry {
  id: string      // anchor ID matching heading in body
  text: string    // heading text
  level: 2 | 3
}

export interface BlogArticleSummary {
  slug: string
  title: string
  featuredImage: { url: string; altText: string; width: number; height: number }
  publishedAt: string    // ISO date
  modifiedAt?: string    // ISO date
  excerpt: string
  topic?: string         // e.g. "Guides", "Product Education", "Industry News"
  author: Author
}

export interface BlogArticle extends BlogArticleSummary {
  publisher: string      // "MDSupplies"
  body: string           // HTML content
  tableOfContents?: TOCEntry[]
  relatedArticles: BlogArticleSummary[]
  relatedProducts?: { handle: string; title: string; image: string; price: number }[]
  relatedCategories?: { handle: string; title: string }[]
  seoTitle?: string
  seoDescription?: string
  ogImage?: string
}
```

These types are independent of `lib/shopify/types.ts` — no cross-dependency.

---

## Mock Data (`lib/mock/blog-articles.ts`)

Four articles:
- **types-of-needles** (`isPopulated: true`): long-form guide, full TOC (4+ entries), internal links to needle categories, redirect hook comment
- **types-of-sutures** (`isPopulated: true`): long-form guide, full TOC, internal links to suture categories, redirect hook comment
- **pharmacy-supply-checklist** (filler): simpler article, no TOC
- **urgent-care-supply-checklist** (filler): simpler article, no TOC

Priority articles have substantial mock body HTML with real headings matching the TOC entries, so the anchor links work.

Exports: `mockBlogArticles: BlogArticle[]`, `getBlogArticleBySlug(slug): BlogArticle | undefined`

---

## Schema Components

### `components/schema/BlogPostingSchema.tsx`

```typescript
interface Props {
  title: string
  description: string
  url: string
  featuredImage: string
  publishedAt: string       // ISO 8601
  modifiedAt?: string       // ISO 8601 — falls back to publishedAt
  authorName: string
  publisherName: string     // "MDSupplies"
  publisherLogo: string     // absolute URL
}
```

Output JSON-LD:
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "description": "...",
  "url": "...",
  "image": "...",
  "datePublished": "...",
  "dateModified": "...",
  "author": { "@type": "Person", "name": "..." },
  "publisher": {
    "@type": "Organization",
    "name": "...",
    "logo": { "@type": "ImageObject", "url": "..." }
  }
}
```

### `components/schema/ProductSchema.tsx`

```typescript
interface Props {
  name: string
  description: string
  image: string
  sku: string
  mpn?: string
  gtin?: string
  brand: string
  price: number             // in dollars (already converted from cents)
  priceCurrency: string     // "USD"
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  url: string
  seller: string            // "MDSupplies"
  returnPolicy?: string     // only when accurate
  shippingDetails?: string  // only when accurate
}
```

Output JSON-LD: `@type: Product` with `Offer` nested. Fields `mpn`, `gtin`, `returnPolicy`, `shippingDetails` omitted when undefined/falsy — never emit empty strings.

**Schema rules (hard):**
- No `aggregateRating`, no `Review`, no star ratings of any kind
- `returnPolicy` and `shippingDetails` only included when prop is provided and truthy
- `availability` maps to `https://schema.org/{availability}`
- `itemCondition` hardcoded to `https://schema.org/NewCondition`

---

## New Blog Components

### `ArticleCard.tsx` (server)

Accepts `BlogArticleSummary` from `types/blog.ts`. Renders: featured image (lazy), topic badge (if present), title (link to `/blog/[slug]`), published date, excerpt (~150 chars). Used by static article pages' related-articles sections.

### `ArticlePage.tsx` (server)

Full article layout for static mock pages. Accepts `BlogArticle`. Renders:
- `BreadcrumbSchema` + `BlogPostingSchema` (injected in `<head>` via script tags)
- Breadcrumb nav: Home > Blog > {title}
- Featured image (`priority` loading — above fold)
- H1 = article title
- Published date + modified date (if different from published)
- Author name + avatar (if available)
- `TableOfContents` (only when `tableOfContents` has entries)
- `ArticleBody` (renders `body` HTML)
- Related categories (anchor links to `/category/[handle]`)
- Related products (using `FeaturedProductCard` from B4)
- Related articles (using `ArticleCard`)
- `FAQSection` (reused from B4, only when FAQ data present — N/A for these articles)

### `TableOfContents.tsx` (`'use client'`)

- Receives `TOCEntry[]`
- Desktop: sticky sidebar positioned alongside article body
- Mobile: collapsible `<details>/<summary>` accordion
- Links are `<a href="#[id]">` anchor jumps — no JS navigation
- No scroll-spy (YAGNI — can add later)

### `ArticleBody.tsx` (server)

Renders `body` HTML string. Uses `dangerouslySetInnerHTML`. No external sanitization library needed — content is controlled mock data; note that real Shopify `contentHtml` is already sanitized server-side.

---

## Enhanced Existing Routes

### `app/blog/page.tsx` changes

- Switch `export const metadata` to `buildMetadata({ pageType: 'blog-hub' })`
- Add `WebPageSchema` + `BreadcrumbSchema` (Home > Blog)
- Keep Shopify data fetch unchanged
- Add client-side topic filter: extract unique `topic` values from articles, render filter pills. Shopify `BlogArticleSummary` doesn't have a `topic` field — filter only activates when articles have topics (no-op for plain Shopify articles)

### `app/blog/[handle]/page.tsx` changes

- Switch from manual `metadata` object to `buildMetadata({ pageType: 'blog-article', ... })`
- Add `BlogPostingSchema` using article data
- Add `ogImage` support: `article.ogImage || article.image?.url`
- Keep all existing layout, `MoreArticles`, `WholesalePricing` unchanged
- Publisher logo: `${SITE_URL}/images/og-default.jpg` (reuse existing OG image as publisher logo)

### Static priority pages

`app/blog/types-of-needles/page.tsx` and `app/blog/types-of-sutures/page.tsx`:
- `export const metadata` via `buildMetadata({ pageType: 'blog-article', ... })`
- Reads from `lib/mock/blog-articles.ts`
- Renders `<ArticlePage article={...} />`
- Comment in each file: `// NOTE: 301 redirect from old URL(s) needed — coordinate with data team`
- No `generateStaticParams` needed (static routes)

---

## SEO

All pages use `buildMetadata` from `@/lib/seo`:

```typescript
// Hub
buildMetadata({ pageType: 'blog-hub' })

// Articles (existing [handle] route + static pages)
buildMetadata({
  pageType: 'blog-article',
  title: article.seoTitle || article.title,
  description: article.seoDescription || article.excerpt,
  slug: article.slug,
  image: article.ogImage || article.featuredImage?.url,
})
```

OG type `'article'` is handled inside `buildMetadata`/`buildOg` for `blog-article` page type (already supported by B1).

---

## Out of Scope

- Article copywriting (content team)
- Scroll-spy in TableOfContents
- Comment system
- 301 redirect maps (data team)
- Wiring ProductSchema into B2 product pages (just building the component here)
- Topic filter for Shopify articles (Shopify `BlogArticleSummary` has no topic field; filter only works when topic data is present)
