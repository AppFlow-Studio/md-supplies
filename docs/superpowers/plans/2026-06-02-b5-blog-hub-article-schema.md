# B5 Blog Hub + Article Templates + BlogPosting & Product Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BlogPosting + Product JSON-LD schema, a reusable article template with TOC, and two static priority article pages (Types of Needles, Types of Sutures) — without breaking the live Shopify-connected blog.

**Architecture:** Static routes at `app/blog/types-of-needles/` and `app/blog/types-of-sutures/` override the dynamic `[handle]` route for those URLs. New `ArticlePage` component serves both static pages. Existing `[handle]/page.tsx` is enhanced with `buildMetadata` + `BlogPostingSchema` but its layout and Shopify fetch are unchanged.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, `lib/seo` B1 helpers, `SITE_URL` from `lib/seo/constants`, `components/schema/` B4 pattern, `components/b2b/FeaturedProductCard` from B4

---

### Task 1: Blog types

**Files:**
- Create: `types/blog.ts`

- [ ] **Step 1: Create `types/blog.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add types/blog.ts
git commit -m "feat(B5): add blog types"
```

---

### Task 2: Mock blog articles

**Files:**
- Create: `lib/mock/blog-articles.ts`

- [ ] **Step 1: Create `lib/mock/blog-articles.ts`**

```typescript
import type { BlogArticle } from '@/types/blog'

const sutulesArticleSummary = {
  slug: 'types-of-sutures',
  title: 'Types of Sutures: A Complete Guide for Healthcare Professionals',
  featuredImage: {
    url: 'https://placehold.co/1200x630/e5eff7/0086b1?text=Types+of+Sutures',
    altText: 'Surgical suture materials on a sterile field',
    width: 1200,
    height: 630,
  },
  publishedAt: '2024-03-10T00:00:00Z',
  modifiedAt: '2024-11-01T00:00:00Z',
  excerpt: 'A complete guide to absorbable vs non-absorbable sutures, suture sizing, and how to choose the right material for every wound type.',
  topic: 'Guides',
  author: { name: 'MDSupplies Clinical Team' },
}

const needlesArticleSummary = {
  slug: 'types-of-needles',
  title: 'Types of Needles: Suture Needle Guide for Clinicians',
  featuredImage: {
    url: 'https://placehold.co/1200x630/f0fdf4/166534?text=Types+of+Needles',
    altText: 'Assortment of suture needles on a surgical tray',
    width: 1200,
    height: 630,
  },
  publishedAt: '2024-02-15T00:00:00Z',
  modifiedAt: '2024-10-20T00:00:00Z',
  excerpt: 'Learn the differences between cutting, taper, and blunt suture needles, how needle sizing works, and how to choose the right needle for your procedure.',
  topic: 'Guides',
  author: { name: 'MDSupplies Clinical Team' },
}

export const mockBlogArticles: BlogArticle[] = [
  {
    ...needlesArticleSummary,
    publisher: 'MDSupplies',
    tableOfContents: [
      { id: 'needle-anatomy', text: 'Needle Anatomy', level: 2 },
      { id: 'suture-needle-types', text: 'Types of Suture Needles', level: 2 },
      { id: 'cutting-needles', text: 'Cutting Needles', level: 3 },
      { id: 'taper-needles', text: 'Taper (Round) Needles', level: 3 },
      { id: 'blunt-needles', text: 'Blunt Needles', level: 3 },
      { id: 'needle-sizing', text: 'Needle Sizing & Packaging', level: 2 },
      { id: 'choosing-needle', text: 'How to Choose the Right Needle', level: 2 },
    ],
    body: `
<p>Selecting the right suture needle is as important as selecting the right suture material. The needle determines how the suture enters tissue, the amount of trauma caused, and the risk of needlestick injury to staff. This guide covers the anatomy, types, and selection criteria for suture needles used in clinical settings.</p>

<h2 id="needle-anatomy">Needle Anatomy</h2>
<p>Every suture needle has three main components: the <strong>swage</strong> (the attachment point where suture thread is crimped onto the needle), the <strong>body</strong> (the main shaft, which may be round, triangular, or flattened in cross-section), and the <strong>point</strong> (the sharpened tip that penetrates tissue). The radius of curvature — expressed as a fraction of a circle — determines how the needle passes through tissue and affects access in deep or confined spaces.</p>
<p>Common curvature designations include <strong>3/8 circle</strong> (most versatile, used for most soft tissue), <strong>1/2 circle</strong> (deep or confined spaces), and <strong>straight (Keith)</strong> (subcutaneous and skin closure with needle holders).</p>

<h2 id="suture-needle-types">Types of Suture Needles</h2>
<p>Needles are broadly classified by their point geometry, which determines what tissue they are suited for.</p>

<h3 id="cutting-needles">Cutting Needles</h3>
<p>Cutting needles have a triangular cross-section with a sharp cutting edge. <strong>Conventional cutting</strong> needles have the cutting edge on the inside (concave) curve; <strong>reverse cutting</strong> needles have it on the outside (convex) curve. Reverse cutting is the more commonly used design because it reduces the risk of the suture tearing through tissue toward the wound edge.</p>
<p>Cutting needles are used for tough, fibrous tissue including <strong>skin, subcutaneous fascia, and tendon</strong>. They are not recommended for visceral or vascular tissue, where taper needles are preferred.</p>

<h3 id="taper-needles">Taper (Round) Needles</h3>
<p>Taper needles have a round body that tapers to a sharp point without any cutting edge. Rather than cutting tissue, they <strong>spread tissue fibers apart</strong>, which minimizes trauma and allows the tissue to close snugly around the suture.</p>
<p>Taper needles are the standard choice for <strong>visceral tissue, muscle, subcutaneous fat, peritoneum, and vascular anastomosis</strong>. Their atraumatic design makes them particularly suitable wherever watertight closure is needed.</p>

<h3 id="blunt-needles">Blunt Needles</h3>
<p>Blunt needles have a rounded, non-sharp tip. They cannot pierce intact gloves and are designed primarily to reduce <strong>needlestick injury risk to surgical staff</strong>. They are used for suturing <strong>fascia and muscle tissue</strong> where the blunt tip can still penetrate without causing excessive trauma.</p>
<p>Blunt needles are increasingly mandated in high-risk surgical environments and are recommended by OSHA guidelines for fascial closure in abdominal surgery.</p>

<h2 id="needle-sizing">Needle Sizing &amp; Packaging</h2>
<p>Needle size is designated by manufacturer codes that combine body diameter (gauge) and radius of curvature. Larger-diameter needles provide more strength for heavy tissue; smaller needles cause less trauma for delicate work. Most suture-needle combinations are packaged as <strong>armed sutures</strong> — needle and thread pre-attached — in sterile foil peel pouches.</p>
<p>Packaging typically indicates needle type (e.g., FS-2, CT-1, SH), suture gauge (e.g., 3-0, 2-0, 0), suture material, and needle count per box. MDSupplies stocks a full range of armed sutures from leading brands including <a href="/category/sutures">Ethicon, Covidien, and Medline</a>.</p>

<h2 id="choosing-needle">How to Choose the Right Needle</h2>
<p>Needle selection depends on tissue type, wound depth, and access constraints:</p>
<ul>
<li><strong>Skin and fibrous tissue:</strong> reverse cutting, 3/8 circle</li>
<li><strong>Viscera, muscle, peritoneum:</strong> taper (round), 1/2 circle</li>
<li><strong>Deep confined spaces:</strong> 1/2 circle or J-needle</li>
<li><strong>Fascia closure (high-risk environments):</strong> blunt needle</li>
<li><strong>Vascular anastomosis:</strong> fine taper, small-gauge, double-armed</li>
</ul>
<p>Browse our complete selection of <a href="/category/needles">suture needles</a> and <a href="/category/sutures">suture materials</a> at wholesale prices for licensed healthcare facilities.</p>
`,
    relatedArticles: [sutulesArticleSummary],
    relatedProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
    ],
    relatedCategories: [
      { handle: 'needles', title: 'Suture Needles' },
      { handle: 'sutures', title: 'Sutures & Wound Closure' },
    ],
    seoTitle: 'Types of Suture Needles: Cutting, Taper & Blunt Guide',
    seoDescription: 'Learn the differences between cutting, taper, and blunt suture needles, how needle sizing works, and how to choose the right needle for your procedure.',
  },
  {
    ...sutulesArticleSummary,
    publisher: 'MDSupplies',
    tableOfContents: [
      { id: 'absorbable-sutures', text: 'Absorbable Sutures', level: 2 },
      { id: 'non-absorbable-sutures', text: 'Non-Absorbable Sutures', level: 2 },
      { id: 'natural-vs-synthetic', text: 'Natural vs Synthetic', level: 3 },
      { id: 'monofilament-vs-multifilament', text: 'Monofilament vs Multifilament', level: 3 },
      { id: 'suture-sizing', text: 'Suture Sizing (USP Scale)', level: 2 },
      { id: 'choosing-suture', text: 'Choosing the Right Suture', level: 2 },
    ],
    body: `
<p>Suture selection is one of the most consequential decisions in wound management. The right suture supports healing, minimizes infection risk, and avoids unnecessary secondary procedures. This guide covers absorbable vs non-absorbable sutures, material classifications, sizing, and clinical selection criteria.</p>

<h2 id="absorbable-sutures">Absorbable Sutures</h2>
<p>Absorbable sutures are broken down by the body's natural enzymatic or hydrolytic processes over time, eliminating the need for removal. They are used for <strong>internal tissue layers, subcutaneous closure, and any site where removal would be impractical</strong>.</p>
<p>Common absorbable materials include:</p>
<ul>
<li><strong>Plain gut:</strong> derived from sheep submucosa or beef serosa; absorbed by enzymatic digestion in 10–14 days. Used for mucosa and superficial tissue.</li>
<li><strong>Chromic gut:</strong> plain gut treated with chromium salts to slow absorption to 21–28 days. Suitable for deeper tissue.</li>
<li><strong>Polyglycolic acid (PGA / Dexon):</strong> synthetic, hydrolytic absorption in 60–90 days. Minimal tissue reaction.</li>
<li><strong>Polyglactin 910 (Vicryl):</strong> synthetic braid; absorbed in 56–70 days. High initial tensile strength; widely used for fascial and subcutaneous closure.</li>
<li><strong>Poliglecaprone (Monocryl):</strong> monofilament synthetic; absorbed in 91–119 days. Excellent pliability; popular for subcuticular skin closure.</li>
</ul>

<h2 id="non-absorbable-sutures">Non-Absorbable Sutures</h2>
<p>Non-absorbable sutures are not degraded by the body and must be removed (for skin) or remain permanently (for internal permanent structures like tendon repair and vascular grafts). They maintain tensile strength indefinitely.</p>
<p>Common non-absorbable materials include:</p>
<ul>
<li><strong>Nylon (Ethilon, Dermalon):</strong> synthetic monofilament or braided. Excellent tensile strength; minimal tissue reactivity. Standard for skin closure and microsurgery.</li>
<li><strong>Polypropylene (Prolene, Surgipro):</strong> monofilament; extremely inert; used for vascular anastomosis and permanent fascial closure.</li>
<li><strong>Silk:</strong> natural braided suture; good handling but higher tissue reactivity. Used for ligatures and where knot security is paramount.</li>
<li><strong>Polyester (Mersilene, Ethibond):</strong> braided synthetic; high strength; used for cardiac and orthopedic procedures.</li>
</ul>

<h3 id="natural-vs-synthetic">Natural vs Synthetic</h3>
<p>Natural sutures (gut, silk) are derived from biological sources and tend to cause more tissue inflammation. Synthetic sutures (nylon, polypropylene, PGA) are manufactured polymers with more predictable absorption profiles and lower reactivity. For most modern clinical applications, synthetic sutures are preferred.</p>

<h3 id="monofilament-vs-multifilament">Monofilament vs Multifilament</h3>
<p><strong>Monofilament</strong> sutures are a single strand: they pass through tissue smoothly and resist harboring bacteria (lower infection risk). They are stiffer and require more throws to secure knots.</p>
<p><strong>Multifilament (braided)</strong> sutures are easier to handle and tie, with better knot security, but their braided surface can harbor microorganisms, increasing infection risk in contaminated wounds.</p>

<h2 id="suture-sizing">Suture Sizing (USP Scale)</h2>
<p>The United States Pharmacopeia (USP) scale measures suture diameter. Higher numbers indicate finer sutures; "0" designations indicate thicker material. The scale runs:</p>
<ul>
<li><strong>Thickest:</strong> #5, #4, #3, #2, #1, #0 (used for heavy fascial and orthopedic work)</li>
<li><strong>Mid-range:</strong> 2-0 (00), 3-0 (000) (general soft tissue, skin)</li>
<li><strong>Fine:</strong> 4-0, 5-0 (plastic surgery, facial, ophthalmic)</li>
<li><strong>Micro:</strong> 6-0, 7-0, 8-0, 9-0, 10-0 (vascular and neurological microsurgery)</li>
</ul>

<h2 id="choosing-suture">Choosing the Right Suture</h2>
<p>Select suture material based on tissue healing rate, infection risk, and whether permanent support is needed:</p>
<ul>
<li><strong>Skin (low tension):</strong> 4-0 or 5-0 nylon or polypropylene; remove in 5–14 days</li>
<li><strong>Subcuticular skin closure:</strong> 4-0 Monocryl (absorbable, no removal needed)</li>
<li><strong>Subcutaneous fat:</strong> 3-0 Vicryl or PGA</li>
<li><strong>Fascia:</strong> 0 or 1 PGA, PDS, or polypropylene</li>
<li><strong>Muscle:</strong> 2-0 or 3-0 PGA</li>
<li><strong>Mucosa / oral:</strong> 3-0 or 4-0 plain or chromic gut</li>
<li><strong>Vascular anastomosis:</strong> 5-0 to 7-0 polypropylene</li>
</ul>
<p>Browse MDSupplies' full selection of <a href="/category/sutures">suture materials</a> and <a href="/category/needles">suture needles</a> at wholesale prices. Licensed healthcare facilities can apply for OCC program pricing.</p>
`,
    relatedArticles: [needlesArticleSummary],
    relatedProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
    ],
    relatedCategories: [
      { handle: 'sutures', title: 'Sutures & Wound Closure' },
      { handle: 'needles', title: 'Suture Needles' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
    seoTitle: 'Types of Sutures: Absorbable vs Non-Absorbable Guide',
    seoDescription: 'A complete guide to absorbable vs non-absorbable sutures, suture sizing, and how to choose the right material for every wound type.',
  },
  {
    slug: 'pharmacy-supply-checklist',
    title: 'Essential Pharmacy Supply Checklist for Independent Pharmacies',
    featuredImage: {
      url: 'https://placehold.co/1200x630/fef9c3/854d0e?text=Pharmacy+Checklist',
      altText: 'Pharmacy counter with supply inventory',
      width: 1200,
      height: 630,
    },
    publishedAt: '2024-04-05T00:00:00Z',
    excerpt: 'A practical checklist of essential supplies every independent pharmacy should stock — from compounding materials to OTC staples.',
    topic: 'Guides',
    author: { name: 'MDSupplies Editorial Team' },
    publisher: 'MDSupplies',
    body: `<p>Running a well-stocked independent pharmacy requires careful inventory management. This checklist covers the essential supply categories every pharmacy should maintain.</p>
<h2 id="compounding-supplies">Compounding Supplies</h2>
<p>For pharmacies that compound, sterile technique supplies are non-negotiable: nitrile gloves, syringes, vials, and laminar flow hood consumables. Ensure USP 795/797 compliance at all times.</p>
<h2 id="otc-essentials">OTC Essentials</h2>
<p>Stock adequate quantities of bandages, antiseptics, and common OTC medications. High-velocity items like exam gloves and hand sanitizer should have standing reorder points.</p>
<p>Browse our full <a href="/category/prescription-supplies">pharmacy supplies catalog</a>.</p>`,
    relatedArticles: [sutulesArticleSummary, needlesArticleSummary],
    relatedCategories: [
      { handle: 'prescription-supplies', title: 'Prescription Supplies' },
      { handle: 'compounding', title: 'Compounding Supplies' },
    ],
  },
  {
    slug: 'urgent-care-supply-checklist',
    title: 'Urgent Care Supply Checklist: What Every Center Needs',
    featuredImage: {
      url: 'https://placehold.co/1200x630/dbeafe/1d4ed8?text=Urgent+Care+Checklist',
      altText: 'Urgent care exam room supply tray',
      width: 1200,
      height: 630,
    },
    publishedAt: '2024-05-12T00:00:00Z',
    excerpt: 'From exam gloves to wound care kits, here is what a fully stocked urgent care center should have on hand at all times.',
    topic: 'Guides',
    author: { name: 'MDSupplies Editorial Team' },
    publisher: 'MDSupplies',
    body: `<p>Urgent care centers see a wide variety of patients — from minor lacerations to respiratory complaints. Having the right supplies on hand prevents delays and improves patient outcomes.</p>
<h2 id="exam-room-basics">Exam Room Basics</h2>
<p>Every exam room needs: nitrile or latex gloves (multiple sizes), exam table paper, tongue depressors, otoscope covers, and blood pressure cuffs. Restock daily based on patient volume.</p>
<h2 id="wound-care">Wound Care Supplies</h2>
<p>Maintain suture kits, staple removers, sterile gauze, adhesive bandages, antiseptic solution, and wound closure strips. Suture needles and thread in common sizes (3-0, 4-0 nylon) should be stocked in quantity.</p>
<p>Browse our <a href="/category/exam-room">exam room supplies</a> and <a href="/category/wound-care">wound care catalog</a>.</p>`,
    relatedArticles: [sutulesArticleSummary, needlesArticleSummary],
    relatedCategories: [
      { handle: 'exam-room', title: 'Exam Room Supplies' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
  },
]

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return mockBlogArticles.find((a) => a.slug === slug)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mock/blog-articles.ts
git commit -m "feat(B5): add mock blog articles with priority content"
```

---

### Task 3: Schema components

**Files:**
- Create: `components/schema/BlogPostingSchema.tsx`
- Create: `components/schema/ProductSchema.tsx`

- [ ] **Step 1: Create `components/schema/BlogPostingSchema.tsx`**

```typescript
interface Props {
  title: string
  description: string
  url: string
  featuredImage: string
  publishedAt: string
  modifiedAt?: string
  authorName: string
  publisherName: string
  publisherLogo: string
}

export function BlogPostingSchema({
  title,
  description,
  url,
  featuredImage,
  publishedAt,
  modifiedAt,
  authorName,
  publisherName,
  publisherLogo,
}: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    image: featuredImage,
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogo,
      },
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

- [ ] **Step 2: Create `components/schema/ProductSchema.tsx`**

```typescript
interface Props {
  name: string
  description: string
  image: string
  sku: string
  mpn?: string
  gtin?: string
  brand: string
  price: number
  priceCurrency: string
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  url: string
  seller: string
  returnPolicy?: string
  shippingDetails?: string
}

export function ProductSchema({
  name,
  description,
  image,
  sku,
  mpn,
  gtin,
  brand,
  price,
  priceCurrency,
  availability,
  url,
  seller,
  returnPolicy,
  shippingDetails,
}: Props) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    sku,
    brand: { '@type': 'Brand', name: brand },
    offers: {
      '@type': 'Offer',
      url,
      price,
      priceCurrency,
      availability: `https://schema.org/${availability}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: seller },
    },
  }

  if (mpn) schema.mpn = mpn
  if (gtin) schema.gtin = gtin
  if (returnPolicy) (schema.offers as Record<string, unknown>).hasMerchantReturnPolicy = returnPolicy
  if (shippingDetails) (schema.offers as Record<string, unknown>).shippingDetails = shippingDetails

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/schema/BlogPostingSchema.tsx components/schema/ProductSchema.tsx
git commit -m "feat(B5): add BlogPostingSchema and ProductSchema components"
```

---

### Task 4: ArticleBody + ArticleCard

**Files:**
- Create: `components/blog/ArticleBody.tsx`
- Create: `components/blog/ArticleCard.tsx`

- [ ] **Step 1: Create `components/blog/ArticleBody.tsx`**

```typescript
interface Props {
  html: string
}

export function ArticleBody({ html }: Props) {
  return (
    <div
      className="prose prose-gray max-w-none text-[16px] leading-[1.75] text-gray-600
        prose-headings:text-navy-900 prose-headings:font-semibold
        prose-a:text-teal-500 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-navy-900
        prose-li:marker:text-teal-500"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

- [ ] **Step 2: Create `components/blog/ArticleCard.tsx`**

```typescript
import Link from 'next/link'
import type { BlogArticleSummary } from '@/types/blog'

interface Props {
  article: BlogArticleSummary
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ArticleCard({ article }: Props) {
  return (
    <article className="group flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      <Link href={`/blog/${article.slug}`} className="flex flex-col flex-1">
        <div className="aspect-[16/9] overflow-hidden bg-navy-900">
          <img
            src={article.featuredImage.url}
            alt={article.featuredImage.altText}
            width={article.featuredImage.width}
            height={article.featuredImage.height}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div className="p-5 flex flex-col gap-3 flex-1">
          {article.topic && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-teal-500">
              {article.topic}
            </span>
          )}
          <h2 className="text-base font-bold text-navy-900 leading-snug line-clamp-2 group-hover:text-teal-500 transition-colors">
            {article.title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
            {article.excerpt}
          </p>
          <p className="text-xs text-gray-500">{formatDate(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/blog/ArticleBody.tsx components/blog/ArticleCard.tsx
git commit -m "feat(B5): add ArticleBody and ArticleCard components"
```

---

### Task 5: TableOfContents

**Files:**
- Create: `components/blog/TableOfContents.tsx`

- [ ] **Step 1: Create `components/blog/TableOfContents.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { TOCEntry } from '@/types/blog'

interface Props {
  entries: TOCEntry[]
}

export function TableOfContents({ entries }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Mobile toggle — hidden on lg+ */}
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-navy-900 lg:hidden"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Contents
        <span className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/* Nav: controlled on mobile, always visible on desktop */}
      <nav
        aria-label="Table of contents"
        className={`px-4 pb-4 ${open ? 'block' : 'hidden'} lg:block lg:pt-4`}
      >
        <p className="hidden lg:block text-sm font-semibold text-navy-900 mb-3">Contents</p>
        <ol className="space-y-0.5">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.level === 3 ? 'pl-4' : ''}>
              <a
                href={`#${entry.id}`}
                className="text-sm text-gray-500 hover:text-teal-500 transition-colors leading-relaxed block py-1"
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/blog/TableOfContents.tsx
git commit -m "feat(B5): add TableOfContents component"
```

---

### Task 6: ArticlePage component

**Files:**
- Create: `components/blog/ArticlePage.tsx`

- [ ] **Step 1: Create `components/blog/ArticlePage.tsx`**

```typescript
import Link from 'next/link'
import type { BlogArticle } from '@/types/blog'
import { ArticleBody } from './ArticleBody'
import { ArticleCard } from './ArticleCard'
import { TableOfContents } from './TableOfContents'
import { FeaturedProductCard } from '@/components/b2b/FeaturedProductCard'
import { BlogPostingSchema } from '@/components/schema/BlogPostingSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  article: BlogArticle
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ArticlePage({ article }: Props) {
  const pageUrl = `${SITE_URL}/blog/${article.slug}`
  const publisherLogo = `${SITE_URL}/images/og-default.jpg`
  const hasTOC = article.tableOfContents && article.tableOfContents.length > 0

  return (
    <main className="bg-[#f9fafc]">
      <BlogPostingSchema
        title={article.seoTitle || article.title}
        description={article.seoDescription || article.excerpt}
        url={pageUrl}
        featuredImage={article.ogImage || article.featuredImage.url}
        publishedAt={article.publishedAt}
        modifiedAt={article.modifiedAt}
        authorName={article.author.name}
        publisherName={article.publisher}
        publisherLogo={publisherLogo}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Blog', item: `${SITE_URL}/blog` },
          { name: article.title, item: pageUrl },
        ]}
      />

      {/* Hero image — fetchPriority high (above fold) */}
      <div className="bg-navy-900 overflow-hidden h-[280px] sm:h-[380px] relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.featuredImage.url}
          alt={article.featuredImage.altText}
          width={article.featuredImage.width}
          height={article.featuredImage.height}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-end pb-10">
          {article.topic && (
            <span className="text-teal-300 text-[13px] font-semibold uppercase tracking-[0.5px] mb-3">
              {article.topic}
            </span>
          )}
          <h1 className="text-white text-[26px] sm:text-[36px] font-bold leading-tight max-w-[720px]">
            {article.title}
          </h1>
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb nav */}
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] mb-8">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <Link href="/blog" className="text-gray-500 hover:text-navy-900 transition-colors">Blog</Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold line-clamp-1">{article.title}</span>
        </nav>

        {/* Meta row */}
        <div className="flex items-center gap-5 mb-8 flex-wrap text-sm text-gray-500">
          <span>{formatDate(article.publishedAt)}</span>
          {article.modifiedAt && article.modifiedAt !== article.publishedAt && (
            <span>Updated {formatDate(article.modifiedAt)}</span>
          )}
          <span className="flex items-center gap-2">
            {article.author.avatar && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={article.author.avatar}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            {article.author.name}
          </span>
        </div>

        {/* Body + TOC layout */}
        <div className={hasTOC ? 'lg:grid lg:grid-cols-[240px_1fr] lg:gap-12 lg:items-start' : ''}>
          {hasTOC && (
            <aside className="lg:sticky lg:top-8 mb-8 lg:mb-0">
              <TableOfContents entries={article.tableOfContents!} />
            </aside>
          )}
          <div className="min-w-0 max-w-[760px]">
            <ArticleBody html={article.body} />
          </div>
        </div>

        {/* Related categories */}
        {article.relatedCategories && article.relatedCategories.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Related Categories</h2>
            <div className="flex flex-wrap gap-2">
              {article.relatedCategories.map((cat) => (
                <a
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Related products */}
        {article.relatedProducts && article.relatedProducts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {article.relatedProducts.map((p) => (
                <FeaturedProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Related articles */}
        {article.relatedArticles.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {article.relatedArticles.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/blog/ArticlePage.tsx
git commit -m "feat(B5): add ArticlePage component"
```

---

### Task 7: Static priority article pages

**Files:**
- Create: `app/blog/types-of-needles/page.tsx`
- Create: `app/blog/types-of-sutures/page.tsx`

- [ ] **Step 1: Create `app/blog/types-of-needles/page.tsx`**

```typescript
// NOTE: 301 redirect from old URL(s) needed before launch — coordinate with data team
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getBlogArticleBySlug } from '@/lib/mock/blog-articles'
import { ArticlePage } from '@/components/blog/ArticlePage'

const article = getBlogArticleBySlug('types-of-needles')

export const metadata: Metadata = article
  ? buildMetadata({
      pageType: 'blog-article',
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      slug: article.slug,
      image: article.ogImage || article.featuredImage.url,
    })
  : {}

export default function TypesOfNeedlesPage() {
  if (!article) notFound()
  return <ArticlePage article={article} />
}
```

- [ ] **Step 2: Create `app/blog/types-of-sutures/page.tsx`**

```typescript
// NOTE: 301 redirect from old URL(s) needed before launch — coordinate with data team
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getBlogArticleBySlug } from '@/lib/mock/blog-articles'
import { ArticlePage } from '@/components/blog/ArticlePage'

const article = getBlogArticleBySlug('types-of-sutures')

export const metadata: Metadata = article
  ? buildMetadata({
      pageType: 'blog-article',
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      slug: article.slug,
      image: article.ogImage || article.featuredImage.url,
    })
  : {}

export default function TypesOfSuturesPage() {
  if (!article) notFound()
  return <ArticlePage article={article} />
}
```

- [ ] **Step 3: Commit**

```bash
git add app/blog/types-of-needles/page.tsx app/blog/types-of-sutures/page.tsx
git commit -m "feat(B5): add /blog/types-of-needles and /blog/types-of-sutures static pages"
```

---

### Task 8: Enhance existing article route

**Files:**
- Modify: `app/blog/[handle]/page.tsx`

The existing file fetches from Shopify and renders the article layout. We add `buildMetadata` (replacing the manual metadata object) and inject `BlogPostingSchema` into the page render. Layout and Shopify fetch are unchanged.

- [ ] **Step 1: Add imports at top of `app/blog/[handle]/page.tsx`**

Add these two imports after the existing import block:

```typescript
import { buildMetadata } from '@/lib/seo'
import { BlogPostingSchema } from '@/components/schema/BlogPostingSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
```

- [ ] **Step 2: Replace the `generateMetadata` function**

Replace the existing `generateMetadata` function (lines 62–78) with:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  try {
    const found = await findArticle(handle)
    if (!found) return {}
    const { article } = found
    return buildMetadata({
      pageType: 'blog-article',
      title: article.title,
      description: article.excerpt?.slice(0, 155) ?? undefined,
      slug: handle,
      image: article.image?.url,
    })
  } catch {
    return {}
  }
}
```

- [ ] **Step 3: Add schema components inside the page JSX**

In the `ArticlePage` function (currently named `ArticlePage` — note: rename to `ShopifyArticlePage` to avoid future clash with our new `ArticlePage` component), add schema output at the very top of the returned `<main>`:

First, rename the function from `ArticlePage` to `ShopifyArticlePage`:
```typescript
export default async function ShopifyArticlePage({ params }: Props) {
```

Then inside the function, after the `publishedDate` variable, add:
```typescript
  const pageUrl = `${SITE_URL}/blog/${handle}`
  const publisherLogo = `${SITE_URL}/images/og-default.jpg`
```

Then add schema tags as the first children of `<main className="bg-[#f9fafc]">`:
```tsx
      <BlogPostingSchema
        title={article.title}
        description={article.excerpt ?? article.title}
        url={pageUrl}
        featuredImage={article.image?.url ?? publisherLogo}
        publishedAt={article.publishedAt}
        authorName={article.author.name}
        publisherName="MDSupplies"
        publisherLogo={publisherLogo}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Blog', item: `${SITE_URL}/blog` },
          { name: article.title, item: pageUrl },
        ]}
      />
```

- [ ] **Step 4: Verify build still compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to this file)

- [ ] **Step 5: Commit**

```bash
git add "app/blog/[handle]/page.tsx"
git commit -m "feat(B5): add BlogPostingSchema and buildMetadata to Shopify article route"
```

---

### Task 9: Enhance blog hub page

**Files:**
- Modify: `app/blog/page.tsx`

- [ ] **Step 1: Replace the `metadata` export and add imports**

At the top of `app/blog/page.tsx`, replace:
```typescript
export const metadata: Metadata = {
  title: "Blog | MD Supplies",
  description:
    "Tips, guides, and industry updates for healthcare professionals and facility managers.",
};
```

With:
```typescript
import { buildMetadata } from '@/lib/seo'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

export const metadata: Metadata = buildMetadata({ pageType: 'blog-hub' })
```

- [ ] **Step 2: Add schema tags inside the page JSX**

Add as the first children inside `<main>`:
```tsx
      <WebPageSchema
        name="MDSupplies Blog"
        description="Tips, guides, and industry updates for healthcare professionals and facility managers."
        url={`${SITE_URL}/blog`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Blog', item: `${SITE_URL}/blog` },
        ]}
      />
```

- [ ] **Step 3: Verify build still compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/blog/page.tsx
git commit -m "feat(B5): switch blog hub to buildMetadata and add WebPage + Breadcrumb schema"
```

---

### Task 10: Build verification

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -30
```

Expected: clean compile, all routes present including:
- `/blog` (hub)
- `/blog/[handle]` (Shopify articles)
- `/blog/types-of-needles` (static)
- `/blog/types-of-sutures` (static)

- [ ] **Step 2: Run tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: 44 tests passing (existing SEO tests — no new tests for UI components)

- [ ] **Step 3: Spot-check static routes in dev**

Start `npm run dev`, then open:
- `http://localhost:3000/blog/types-of-needles` — verify H1, TOC sidebar, body with anchor headings, related categories/products, BreadcrumbSchema in source
- `http://localhost:3000/blog/types-of-sutures` — same
- `http://localhost:3000/blog` — verify buildMetadata title in `<head>`, WebPageSchema in source
- View page source for types-of-needles: confirm `BlogPosting` JSON-LD present, no `aggregateRating`, no fake reviews
