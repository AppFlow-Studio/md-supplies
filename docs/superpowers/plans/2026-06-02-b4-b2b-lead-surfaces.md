# B4 B2B Lead Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three B2B lead surface templates — Partners directory+detail, Industry pages, and OCC hub — with SEO, structured data, and internal linking using mock data.

**Architecture:** All pages are Next.js 16 App Router server components. Client code is isolated to `PartnerDirectory.tsx` (filter toggle only). Schema components emit `<script type="application/ld+json">` tags. `FAQSection` enforces the rule that FAQ schema only emits when FAQ is visibly rendered. `params` is always a `Promise` — must be awaited.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, `lib/seo` helpers (`buildMetadata`, `buildRobots`), `SITE_URL` from `lib/seo/constants`

---

### Task 1: Fix occ route in SEO helper

**Files:**
- Modify: `lib/seo/metadata.ts` (line ~29, `resolvePath` function)

- [ ] **Step 1: Update the occ case in resolvePath**

In `lib/seo/metadata.ts`, in the `resolvePath` switch, change:

```typescript
    case 'occ':            return '/occ'
```

to:

```typescript
    case 'occ':            return '/solutions/occ'
```

- [ ] **Step 2: Verify change**

Run: `grep -n "occ" lib/seo/metadata.ts`

Expected output includes:
```
case 'occ':            return '/solutions/occ'
```

- [ ] **Step 3: Run existing SEO tests**

Run: `npx vitest run lib/seo`

Expected: all tests pass (no occ-specific test exists, so this is a smoke check)

- [ ] **Step 4: Commit**

```bash
git add lib/seo/metadata.ts
git commit -m "fix: update occ canonical path to /solutions/occ"
```

---

### Task 2: Create B4 types

**Files:**
- Create: `types/partner.ts`
- Create: `types/industry.ts`
- Create: `types/occ.ts`

- [ ] **Step 1: Create `types/partner.ts`**

```typescript
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
```

- [ ] **Step 2: Create `types/industry.ts`**

```typescript
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
```

- [ ] **Step 3: Create `types/occ.ts`**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add types/partner.ts types/industry.ts types/occ.ts
git commit -m "feat(B4): add Partner, Industry, OCCHub types"
```

---

### Task 3: Create mock data

**Files:**
- Create: `lib/mock/partners.ts`
- Create: `lib/mock/industries.ts`
- Create: `lib/mock/occ.ts`

- [ ] **Step 1: Create `lib/mock/partners.ts`**

6 partners: 3 brands, 3 vendors, Dukal inactive.

```typescript
import type { Partner } from '@/types/partner'

export const mockPartners: Partner[] = [
  {
    slug: 'dawn-mist',
    name: 'Dawn Mist',
    type: 'brand',
    isActive: true,
    description: 'Premium personal care and hygiene products for healthcare facilities.',
    logo: {
      url: 'https://placehold.co/200x80/e5eff7/0086b1?text=Dawn+Mist',
      altText: 'Dawn Mist logo',
      width: 200,
      height: 80,
    },
    intro: 'Dawn Mist is a leading brand of personal care products trusted by hospitals and long-term care facilities across North America.',
    productCategories: ['personal-care', 'hygiene', 'bath-supplies'],
    featuredProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
      { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads', price: 3299 },
    ],
    relatedCategories: [
      { handle: 'personal-care', title: 'Personal Care' },
      { handle: 'hygiene', title: 'Hygiene Supplies' },
    ],
    seoTitle: 'Dawn Mist Products — MDSupplies Partner',
    seoDescription: 'Browse Dawn Mist personal care and hygiene products available at wholesale prices through MDSupplies.',
  },
  {
    slug: 'lumex',
    name: 'Lumex',
    type: 'brand',
    isActive: true,
    description: 'Durable medical equipment and mobility aids for patient care.',
    logo: {
      url: 'https://placehold.co/200x80/f0fdf4/166534?text=Lumex',
      altText: 'Lumex logo',
      width: 200,
      height: 80,
    },
    intro: 'Lumex specializes in durable medical equipment including walkers, wheelchairs, and patient lifts used in home care and clinical settings.',
    productCategories: ['dme', 'mobility-aids', 'patient-lifts'],
    featuredProducts: [
      { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker', price: 4999 },
      { handle: 'transport-wheelchair', title: 'Transport Wheelchair', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Wheelchair', price: 8999 },
    ],
    relatedCategories: [
      { handle: 'dme', title: 'Durable Medical Equipment' },
      { handle: 'mobility-aids', title: 'Mobility Aids' },
    ],
  },
  {
    slug: 'dynao2',
    name: 'DynaO2',
    type: 'brand',
    isActive: true,
    description: 'Respiratory therapy and oxygen delivery products for clinical use.',
    logo: {
      url: 'https://placehold.co/200x80/fef9c3/854d0e?text=DynaO2',
      altText: 'DynaO2 logo',
      width: 200,
      height: 80,
    },
    intro: 'DynaO2 manufactures respiratory therapy products including nasal cannulas, oxygen masks, and nebulizer kits for hospitals and home health agencies.',
    productCategories: ['respiratory', 'oxygen-therapy'],
    featuredProducts: [
      { handle: 'nasal-cannula-adult', title: 'Nasal Cannula, Adult', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Cannula', price: 199 },
      { handle: 'simple-face-mask', title: 'Simple Face Mask', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Face+Mask', price: 299 },
    ],
    relatedCategories: [
      { handle: 'respiratory', title: 'Respiratory Supplies' },
      { handle: 'oxygen-therapy', title: 'Oxygen Therapy' },
    ],
  },
  {
    slug: 'dukal',
    name: 'Dukal',
    type: 'vendor',
    isActive: false,
    description: 'Medical supply distributor specializing in wound care and surgical products.',
    logo: {
      url: 'https://placehold.co/200x80/fce7f3/9d174d?text=Dukal',
      altText: 'Dukal logo',
      width: 200,
      height: 80,
    },
    intro: 'Dukal is a leading distributor of wound care, surgical, and exam room supplies to healthcare facilities nationwide.',
    productCategories: ['wound-care', 'surgical', 'exam-room'],
    featuredProducts: [],
    relatedBrands: ['dawn-mist'],
    relatedCategories: [{ handle: 'wound-care', title: 'Wound Care' }],
  },
  {
    slug: 'graham-field',
    name: 'Graham Field',
    type: 'vendor',
    isActive: true,
    description: 'Full-line distributor of durable medical equipment and rehabilitation products.',
    logo: {
      url: 'https://placehold.co/200x80/ede9fe/5b21b6?text=Graham+Field',
      altText: 'Graham Field logo',
      width: 200,
      height: 80,
    },
    intro: 'Graham Field is a comprehensive distributor of DME, rehabilitation, and patient-care products, supplying healthcare facilities and home care agencies.',
    productCategories: ['dme', 'rehabilitation', 'patient-care'],
    featuredProducts: [
      { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/ede9fe/5b21b6?text=Walker', price: 4999 },
      { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/ede9fe/5b21b6?text=Bed+Pads', price: 3299 },
    ],
    relatedBrands: ['lumex'],
    relatedCategories: [
      { handle: 'dme', title: 'Durable Medical Equipment' },
      { handle: 'rehabilitation', title: 'Rehabilitation' },
    ],
  },
  {
    slug: 'dynarex',
    name: 'Dynarex',
    type: 'vendor',
    isActive: true,
    description: 'High-volume distributor of disposable medical products for all care settings.',
    logo: {
      url: 'https://placehold.co/200x80/dbeafe/1d4ed8?text=Dynarex',
      altText: 'Dynarex logo',
      width: 200,
      height: 80,
    },
    intro: 'Dynarex distributes a wide range of disposable medical products including gloves, wound care, and personal protective equipment to healthcare facilities at competitive prices.',
    productCategories: ['disposables', 'wound-care', 'ppe'],
    featuredProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Gloves', price: 2499 },
      { handle: 'latex-exam-gloves-powder-free', title: 'Latex Exam Gloves', image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Latex+Gloves', price: 2299 },
    ],
    relatedBrands: ['dawn-mist', 'dynao2'],
    relatedCategories: [
      { handle: 'disposables', title: 'Disposables' },
      { handle: 'ppe', title: 'PPE' },
    ],
  },
]

export function getActivePartners(): Partner[] {
  return mockPartners.filter((p) => p.isActive)
}

export function getPartnerBySlug(slug: string): Partner | undefined {
  return mockPartners.find((p) => p.slug === slug)
}
```

- [ ] **Step 2: Create `lib/mock/industries.ts`**

```typescript
import type { Industry } from '@/types/industry'

export const mockIndustries: Industry[] = [
  {
    slug: 'pharmacy',
    name: 'Pharmacy',
    isPopulated: true,
    intro: 'From compounding supplies to retail pharmacy essentials, MDSupplies stocks everything your pharmacy needs to serve patients efficiently and safely.',
    heroImage: {
      url: 'https://placehold.co/1200x400/e5eff7/0086b1?text=Pharmacy+Supplies',
      altText: 'Pharmacy supply counter with medications and supplies',
    },
    relevantCategories: [
      { handle: 'prescription-supplies', title: 'Prescription Supplies' },
      { handle: 'compounding', title: 'Compounding Supplies' },
      { handle: 'otc-products', title: 'OTC Products' },
    ],
    relevantSubcategories: [
      { handle: 'vials-syringes', title: 'Vials & Syringes' },
      { handle: 'pill-bottles', title: 'Pill Bottles & Caps' },
      { handle: 'labels', title: 'Pharmacy Labels' },
    ],
    relevantProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
      { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads', price: 3299 },
      { handle: 'nasal-cannula-adult', title: 'Nasal Cannula', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Cannula', price: 199 },
    ],
    relatedGuides: [
      { slug: 'pharmacy-supply-checklist', title: 'Essential Pharmacy Supply Checklist' },
      { slug: 'compounding-sterile-supplies', title: 'Sterile Compounding Supply Guide' },
    ],
    ctaText: 'Browse Pharmacy Supplies',
    ctaLink: '/category/prescription-supplies',
    faq: [
      { question: 'Do you offer bulk pricing for pharmacies?', answer: 'Yes, MDSupplies offers tiered wholesale pricing for licensed pharmacies. Contact our B2B team for a custom quote.' },
      { question: 'Are your compounding supplies USP-compliant?', answer: 'All compounding supplies we carry meet USP 795 and USP 797 standards where applicable.' },
    ],
    seoTitle: 'Pharmacy Supplies — MDSupplies',
    seoDescription: 'Wholesale pharmacy supplies including compounding materials, prescription containers, syringes, and OTC essentials.',
  },
  {
    slug: 'urgent-care',
    name: 'Urgent Care',
    isPopulated: true,
    intro: 'Equip your urgent care center with the high-volume disposables, diagnostic tools, and exam room supplies needed to move patients efficiently.',
    heroImage: {
      url: 'https://placehold.co/1200x400/f0fdf4/166534?text=Urgent+Care+Supplies',
      altText: 'Urgent care exam room with medical supplies',
    },
    relevantCategories: [
      { handle: 'exam-room', title: 'Exam Room Supplies' },
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'diagnostic', title: 'Diagnostic Supplies' },
    ],
    relevantSubcategories: [
      { handle: 'exam-gloves', title: 'Exam Gloves' },
      { handle: 'bandages', title: 'Bandages & Dressings' },
      { handle: 'otoscopes', title: 'Otoscopes & Scopes' },
    ],
    relevantProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Gloves', price: 2499 },
      { handle: 'latex-exam-gloves-powder-free', title: 'Latex Exam Gloves', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Latex', price: 2299 },
      { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker', price: 4999 },
    ],
    relatedGuides: [
      { slug: 'urgent-care-supply-checklist', title: 'Urgent Care Supply Checklist' },
    ],
    ctaText: 'Browse Urgent Care Supplies',
    ctaLink: '/category/exam-room',
    faq: [
      { question: 'Can I set up a standing order for high-volume items?', answer: 'Yes, we support recurring orders for exam gloves, gauze, and other high-velocity items. Contact our team to set up a standing order.' },
    ],
    seoTitle: 'Urgent Care Supplies — MDSupplies',
    seoDescription: 'Wholesale urgent care supplies: exam gloves, wound care, diagnostic tools, and exam room essentials for high-volume urgent care centers.',
  },
  {
    slug: 'dental',
    name: 'Dental',
    isPopulated: false,
    intro: 'Dental supplies for practices of all sizes.',
    relevantCategories: [],
    relevantSubcategories: [],
    relevantProducts: [],
    relatedGuides: [],
    ctaText: 'Browse Dental Supplies',
    ctaLink: '/category/dental',
  },
  {
    slug: 'long-term-care',
    name: 'Long-Term Care',
    isPopulated: false,
    intro: 'Supplies for skilled nursing facilities and long-term care communities.',
    relevantCategories: [],
    relevantSubcategories: [],
    relevantProducts: [],
    relatedGuides: [],
    ctaText: 'Browse Long-Term Care Supplies',
    ctaLink: '/category/long-term-care',
  },
]

export function getIndustryBySlug(slug: string): Industry | undefined {
  return mockIndustries.find((i) => i.slug === slug)
}

export function generateIndustrySlugs(): { 'industry-slug': string }[] {
  return mockIndustries.map((i) => ({ 'industry-slug': i.slug }))
}
```

- [ ] **Step 3: Create `lib/mock/occ.ts`**

```typescript
import type { OCCHub } from '@/types/occ'

export const mockOCCHub: OCCHub = {
  title: 'OCC Solutions',
  intro: 'The MDSupplies OCC program connects qualifying healthcare organizations with streamlined ordering, preferred pricing, and dedicated account support.',
  programExplanation: 'Our Organized Customer Care (OCC) program is designed for healthcare facilities that order regularly and need reliable supply chain partnerships. OCC members receive dedicated account management, priority fulfillment, and access to volume-based pricing tiers.',
  freeShippingMessage: 'OCC members with qualifying order volumes receive free standard shipping on eligible product categories.',
  eligibleCategories: [
    { handle: 'exam-gloves', title: 'Exam Gloves' },
    { handle: 'wound-care', title: 'Wound Care' },
    { handle: 'personal-care', title: 'Personal Care' },
    { handle: 'disposables', title: 'Disposables' },
  ],
  eligibleProducts: [
    { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Nitrile+Gloves', price: 2499 },
    { handle: 'latex-exam-gloves-powder-free', title: 'Latex Exam Gloves', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Latex+Gloves', price: 2299 },
    { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads', price: 3299 },
    { handle: 'nasal-cannula-adult', title: 'Nasal Cannula, Adult', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Cannula', price: 199 },
    { handle: 'simple-face-mask', title: 'Simple Face Mask', image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Face+Mask', price: 299 },
    { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker', price: 4999 },
  ],
  faq: [
    { question: 'Who qualifies for the OCC program?', answer: 'Licensed healthcare facilities including hospitals, clinics, urgent care centers, pharmacies, and home health agencies are eligible to apply for OCC membership.' },
    { question: 'How does OCC pricing work?', answer: 'OCC pricing is tiered based on annual spend. Your dedicated account manager will work with you to establish pricing tiers that reflect your order volume.' },
    { question: 'Does the OCC program include free shipping?', answer: 'Free shipping is available on eligible product categories for OCC members who meet minimum order thresholds. Your account manager will confirm which categories and thresholds apply to your account.' },
    { question: 'How do I apply for OCC membership?', answer: 'Contact our B2B team via the contact form or call our dedicated B2B line. We will verify your facility credentials and set up your account within 1–2 business days.' },
  ],
  seoTitle: 'OCC Solutions — MDSupplies',
  seoDescription: 'The MDSupplies OCC program offers healthcare organizations streamlined ordering, volume pricing, and dedicated account support for medical supplies.',
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/mock/partners.ts lib/mock/industries.ts lib/mock/occ.ts
git commit -m "feat(B4): add mock data for partners, industries, and OCC hub"
```

---

### Task 4: Schema components

**Files:**
- Create: `components/schema/WebPageSchema.tsx`
- Create: `components/schema/BreadcrumbSchema.tsx`
- Create: `components/schema/FAQSchema.tsx`

- [ ] **Step 1: Create `components/schema/WebPageSchema.tsx`**

```typescript
interface Props {
  name: string
  description: string
  url: string
}

export function WebPageSchema({ name, description, url }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

- [ ] **Step 2: Create `components/schema/BreadcrumbSchema.tsx`**

```typescript
interface BreadcrumbItem {
  name: string
  item: string
}

interface Props {
  items: BreadcrumbItem[]
}

export function BreadcrumbSchema({ items }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

- [ ] **Step 3: Create `components/schema/FAQSchema.tsx`**

```typescript
interface FAQ {
  question: string
  answer: string
}

interface Props {
  faq: FAQ[]
}

export function FAQSchema({ faq }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/schema/WebPageSchema.tsx components/schema/BreadcrumbSchema.tsx components/schema/FAQSchema.tsx
git commit -m "feat(B4): add WebPage, Breadcrumb, and FAQ JSON-LD schema components"
```

---

### Task 5: FAQSection + FeaturedProductCard

**Files:**
- Create: `components/b2b/FAQSection.tsx`
- Create: `components/b2b/FeaturedProductCard.tsx`

- [ ] **Step 1: Create `components/b2b/FAQSection.tsx`**

Returns null when no FAQ data — this is the enforcement point for the "no schema without visible content" rule.

```typescript
import { FAQSchema } from '@/components/schema/FAQSchema'

interface FAQ {
  question: string
  answer: string
}

interface Props {
  faq?: FAQ[]
}

export function FAQSection({ faq }: Props) {
  if (!faq || faq.length === 0) return null

  return (
    <section className="py-12 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-navy-900 mb-8">Frequently Asked Questions</h2>
      <dl className="space-y-4">
        {faq.map(({ question, answer }) => (
          <div key={question} className="border border-gray-200 rounded-xl p-6 bg-white">
            <dt className="text-base font-semibold text-navy-900 mb-2">{question}</dt>
            <dd className="text-sm text-gray-500 leading-relaxed">{answer}</dd>
          </div>
        ))}
      </dl>
      <FAQSchema faq={faq} />
    </section>
  )
}
```

- [ ] **Step 2: Create `components/b2b/FeaturedProductCard.tsx`**

Minimal card for the `{ handle, title, image, price }` shape used in B4 mock data (lighter than B3 ProductCard which requires full `ProductCardData`).

```typescript
import Link from 'next/link'

interface Props {
  product: {
    handle: string
    title: string
    image: string
    price: number
  }
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function FeaturedProductCard({ product }: Props) {
  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow"
    >
      <div className="aspect-square w-full overflow-hidden bg-neutral-50">
        <img
          src={product.image}
          alt={product.title}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-navy-900 leading-snug line-clamp-2 group-hover:text-teal-500 transition-colors">
          {product.title}
        </h3>
        <p className="text-sm font-bold text-navy-900">{formatCents(product.price)}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/b2b/FAQSection.tsx components/b2b/FeaturedProductCard.tsx
git commit -m "feat(B4): add FAQSection and FeaturedProductCard shared components"
```

---

### Task 6: PartnerCard + PartnerDirectory

**Files:**
- Create: `components/b2b/PartnerCard.tsx`
- Create: `components/b2b/PartnerDirectory.tsx`

- [ ] **Step 1: Create `components/b2b/PartnerCard.tsx`**

```typescript
import Link from 'next/link'
import type { Partner } from '@/types/partner'

interface Props {
  partner: Partner
}

export function PartnerCard({ partner }: Props) {
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group flex flex-col border border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow p-5 gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center h-12 flex-1 min-w-0">
          <img
            src={partner.logo.url}
            alt={partner.logo.altText}
            width={partner.logo.width}
            height={partner.logo.height}
            loading="lazy"
            decoding="async"
            className="max-h-10 w-auto object-contain"
          />
        </div>
        <span
          className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.3px] px-2.5 py-1 rounded-full ${
            partner.type === 'brand'
              ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20'
              : 'bg-navy-900/10 text-navy-900 border border-navy-900/20'
          }`}
        >
          {partner.type === 'brand' ? 'Brand' : 'Vendor'}
        </span>
      </div>
      <div>
        <h2 className="text-base font-bold text-navy-900 mb-1 group-hover:text-teal-500 transition-colors">
          {partner.name}
        </h2>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{partner.description}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create `components/b2b/PartnerDirectory.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { Partner } from '@/types/partner'
import { PartnerCard } from './PartnerCard'

type Filter = 'all' | 'brand' | 'vendor'

interface Props {
  partners: Partner[]
}

export function PartnerDirectory({ partners }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? partners : partners.filter((p) => p.type === filter)

  return (
    <div>
      <div className="flex gap-2 mb-8" role="group" aria-label="Filter partners by type">
        {(['all', 'brand', 'vendor'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f
                ? 'bg-navy-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Partners' : f === 'brand' ? 'Brands' : 'Vendors'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((partner) => (
          <PartnerCard key={partner.slug} partner={partner} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-gray-500 text-sm py-12 text-center">No partners found.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/b2b/PartnerCard.tsx components/b2b/PartnerDirectory.tsx
git commit -m "feat(B4): add PartnerCard and PartnerDirectory components"
```

---

### Task 7: PartnerDetail

**Files:**
- Create: `components/b2b/PartnerDetail.tsx`

- [ ] **Step 1: Create `components/b2b/PartnerDetail.tsx`**

```typescript
import Link from 'next/link'
import type { Partner } from '@/types/partner'
import { FeaturedProductCard } from './FeaturedProductCard'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  partner: Partner
}

export function PartnerDetail({ partner }: Props) {
  const pageUrl = `${SITE_URL}/partners/${partner.slug}`
  const pageDescription = partner.seoDescription || partner.description

  return (
    <main className="bg-[#f9fafc]">
      <WebPageSchema
        name={partner.seoTitle || partner.name}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Partners', item: `${SITE_URL}/partners` },
          { name: partner.name, item: pageUrl },
        ]}
      />

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] mb-10">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <Link href="/partners" className="text-gray-500 hover:text-navy-900 transition-colors">Partners</Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">{partner.name}</span>
        </nav>

        {/* Header: logo + name + type badge + intro */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-12">
          <div className="flex items-center justify-center bg-white border border-gray-200 rounded-xl p-6 sm:w-48 shrink-0">
            <img
              src={partner.logo.url}
              alt={partner.logo.altText}
              width={partner.logo.width}
              height={partner.logo.height}
              className="max-h-16 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-navy-900">{partner.name}</h1>
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.3px] px-3 py-1 rounded-full ${
                  partner.type === 'brand'
                    ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20'
                    : 'bg-navy-900/10 text-navy-900 border border-navy-900/20'
                }`}
              >
                {partner.type === 'brand' ? 'Brand' : 'Vendor / Distributor'}
              </span>
            </div>
            <p className="text-base text-gray-500 leading-relaxed max-w-[640px]">{partner.intro}</p>
          </div>
        </div>

        {/* Featured products */}
        {partner.featuredProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Featured Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {partner.featuredProducts.map((p) => (
                <FeaturedProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Related categories */}
        {partner.relatedCategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Product Categories</h2>
            <div className="flex flex-wrap gap-2">
              {partner.relatedCategories.map((cat) => (
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

        {/* Related brands — vendor pages only */}
        {partner.type === 'vendor' && partner.relatedBrands && partner.relatedBrands.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Related Brands</h2>
            <div className="flex flex-wrap gap-2">
              {partner.relatedBrands.map((slug) => (
                <a
                  key={slug}
                  href={`/partners/${slug}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors capitalize"
                >
                  {slug.replace(/-/g, ' ')}
                </a>
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
git add components/b2b/PartnerDetail.tsx
git commit -m "feat(B4): add PartnerDetail component"
```

---

### Task 8: IndustryPage

**Files:**
- Create: `components/b2b/IndustryPage.tsx`

- [ ] **Step 1: Create `components/b2b/IndustryPage.tsx`**

```typescript
import Link from 'next/link'
import type { Industry } from '@/types/industry'
import { FeaturedProductCard } from './FeaturedProductCard'
import { FAQSection } from './FAQSection'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  industry: Industry
}

export function IndustryPage({ industry }: Props) {
  const pageUrl = `${SITE_URL}/industries/${industry.slug}`
  const pageTitle = `${industry.name} Supplies`
  const pageDescription = industry.seoDescription || industry.intro

  return (
    <main className="bg-[#f9fafc]">
      <WebPageSchema
        name={industry.seoTitle || pageTitle}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Industries', item: `${SITE_URL}/industries` },
          { name: industry.name, item: pageUrl },
        ]}
      />

      {/* Hero image */}
      {industry.heroImage && (
        <div className="bg-navy-900 overflow-hidden h-[200px] sm:h-[280px] relative">
          <img
            src={industry.heroImage.url}
            alt={industry.heroImage.altText}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-end pb-8">
            <p className="text-white/60 text-sm mb-2">Industries</p>
            <h1 className="text-white text-[26px] sm:text-[36px] font-bold leading-tight">
              {pageTitle}
            </h1>
          </div>
        </div>
      )}

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] mb-8">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <span className="text-gray-500">Industries</span>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">{industry.name}</span>
        </nav>

        {/* H1 only when no hero image (hero already shows H1) */}
        {!industry.heroImage && (
          <h1 className="text-3xl font-bold text-navy-900 mb-6">{pageTitle}</h1>
        )}

        {/* Intro */}
        <p className="text-base text-gray-500 leading-relaxed max-w-[720px] mb-12">{industry.intro}</p>

        {/* Categories + subcategories */}
        {industry.relevantCategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Product Categories</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {industry.relevantCategories.map((cat) => (
                <a
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </a>
              ))}
            </div>
            {industry.relevantSubcategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {industry.relevantSubcategories.map((sub) => (
                  <a
                    key={sub.handle}
                    href={`/category/${sub.handle}`}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-500 hover:border-teal-500 hover:text-teal-500 transition-colors"
                  >
                    {sub.title}
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Products */}
        {industry.relevantProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Popular Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {industry.relevantProducts.map((p) => (
                <FeaturedProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Related guides */}
        {industry.relatedGuides.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Related Guides</h2>
            <ul className="space-y-2">
              {industry.relatedGuides.map((guide) => (
                <li key={guide.slug}>
                  <a
                    href={`/blog/${guide.slug}`}
                    className="text-teal-500 hover:text-navy-900 text-sm font-medium transition-colors"
                  >
                    {guide.title} →
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <div className="mb-12">
          <a
            href={industry.ctaLink}
            className="inline-flex items-center px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-colors"
          >
            {industry.ctaText}
          </a>
        </div>

        {/* FAQ — renders nothing + no schema if no data */}
        <FAQSection faq={industry.faq} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/b2b/IndustryPage.tsx
git commit -m "feat(B4): add IndustryPage component"
```

---

### Task 9: OCCHub

**Files:**
- Create: `components/b2b/OCCHub.tsx`

- [ ] **Step 1: Create `components/b2b/OCCHub.tsx`**

Note: component export is `OCCHubPage` to avoid name collision with the `OCCHub` type from `types/occ.ts`.

```typescript
import Link from 'next/link'
import type { OCCHub } from '@/types/occ'
import { FeaturedProductCard } from './FeaturedProductCard'
import { FAQSection } from './FAQSection'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  hub: OCCHub
}

export function OCCHubPage({ hub }: Props) {
  const pageUrl = `${SITE_URL}/solutions/occ`
  const pageDescription = hub.seoDescription || hub.intro

  return (
    <main className="bg-[#f9fafc]">
      <WebPageSchema
        name={hub.seoTitle || hub.title}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Solutions', item: `${SITE_URL}/solutions` },
          { name: 'OCC', item: pageUrl },
        ]}
      />

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] mb-10">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <span className="text-gray-500">Solutions</span>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">OCC</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">{hub.title}</h1>
          <p className="text-base text-gray-500 leading-relaxed max-w-[720px]">{hub.intro}</p>
        </div>

        {/* Program explanation */}
        <section className="mb-12 bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-navy-900 mb-4">What is the OCC Program?</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{hub.programExplanation}</p>
          {hub.freeShippingMessage && (
            <div className="mt-5 flex items-start gap-3 bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
              <span className="text-teal-500 font-bold text-base leading-none mt-0.5">✓</span>
              <p className="text-sm text-teal-500 font-medium">{hub.freeShippingMessage}</p>
            </div>
          )}
        </section>

        {/* Eligible categories */}
        {hub.eligibleCategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">OCC-Eligible Categories</h2>
            <div className="flex flex-wrap gap-2">
              {hub.eligibleCategories.map((cat) => (
                <a
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Eligible products */}
        {hub.eligibleProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-6">OCC-Eligible Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {hub.eligibleProducts.map((p) => (
                <FeaturedProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* FAQ — renders nothing + no schema if no data */}
        <FAQSection faq={hub.faq} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/b2b/OCCHub.tsx
git commit -m "feat(B4): add OCCHubPage component"
```

---

### Task 10: Partner route pages

**Files:**
- Create: `app/partners/page.tsx`
- Create: `app/partners/[partner-slug]/page.tsx`

- [ ] **Step 1: Create `app/partners/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { getActivePartners } from '@/lib/mock/partners'
import { PartnerDirectory } from '@/components/b2b/PartnerDirectory'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'

export const metadata: Metadata = buildMetadata({ pageType: 'partners' })

export default function PartnersPage() {
  const partners = getActivePartners()

  return (
    <main className="bg-[#f9fafc]">
      <WebPageSchema
        name="Our Partners"
        description="Browse MDSupplies brand and vendor partners supplying medical and dental products."
        url={`${SITE_URL}/partners`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Partners', item: `${SITE_URL}/partners` },
        ]}
      />

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-3">Our Partners</h1>
        <p className="text-base text-gray-500 mb-10 max-w-[640px]">
          MDSupplies works with trusted brands and distributors to bring you high-quality medical supplies at wholesale prices.
        </p>
        <PartnerDirectory partners={partners} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/partners/[partner-slug]/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getPartnerBySlug, mockPartners } from '@/lib/mock/partners'
import { PartnerDetail } from '@/components/b2b/PartnerDetail'

interface Props {
  params: Promise<{ 'partner-slug': string }>
}

export function generateStaticParams() {
  return mockPartners
    .filter((p) => p.isActive)
    .map((p) => ({ 'partner-slug': p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)
  if (!partner) return {}

  return buildMetadata({
    pageType: 'partner-detail',
    title: partner.seoTitle || partner.name,
    description: partner.seoDescription || partner.description,
    slug: partner.slug,
    image: partner.logo.url,
  })
}

export default async function PartnerDetailPage({ params }: Props) {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)

  if (!partner || !partner.isActive) notFound()

  return <PartnerDetail partner={partner} />
}
```

- [ ] **Step 3: Commit**

```bash
git add app/partners/page.tsx "app/partners/[partner-slug]/page.tsx"
git commit -m "feat(B4): add /partners directory and /partners/[partner-slug] route pages"
```

---

### Task 11: Industry route page

**Files:**
- Create: `app/industries/[industry-slug]/page.tsx`

- [ ] **Step 1: Create `app/industries/[industry-slug]/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getIndustryBySlug, generateIndustrySlugs } from '@/lib/mock/industries'
import { IndustryPage } from '@/components/b2b/IndustryPage'

interface Props {
  params: Promise<{ 'industry-slug': string }>
}

export function generateStaticParams() {
  return generateIndustrySlugs()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'industry-slug': slug } = await params
  const industry = getIndustryBySlug(slug)
  if (!industry) return {}

  return buildMetadata({
    pageType: 'industry',
    title: industry.seoTitle || industry.name,
    description: industry.seoDescription || industry.intro,
    slug: industry.slug,
    noIndex: !industry.isPopulated,
  })
}

export default async function IndustryDetailPage({ params }: Props) {
  const { 'industry-slug': slug } = await params
  const industry = getIndustryBySlug(slug)

  if (!industry) notFound()

  return <IndustryPage industry={industry} />
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/industries/[industry-slug]/page.tsx"
git commit -m "feat(B4): add /industries/[industry-slug] route page"
```

---

### Task 12: OCC route page

**Files:**
- Create: `app/solutions/occ/page.tsx`

- [ ] **Step 1: Create `app/solutions/occ/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { mockOCCHub } from '@/lib/mock/occ'
import { OCCHubPage } from '@/components/b2b/OCCHub'

export const metadata: Metadata = buildMetadata({
  pageType: 'occ',
  title: mockOCCHub.seoTitle,
  description: mockOCCHub.seoDescription || mockOCCHub.intro,
})

export default function OCCPage() {
  return <OCCHubPage hub={mockOCCHub} />
}
```

- [ ] **Step 2: Commit**

```bash
git add app/solutions/occ/page.tsx
git commit -m "feat(B4): add /solutions/occ route page"
```

---

### Task 13: Verify all routes

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify /partners**

Open `http://localhost:3000/partners`

Expected:
- H1 "Our Partners"
- 5 partner cards (Dukal excluded — `isActive: false`)
- All/Brands/Vendors filter buttons work client-side without page reload
- No JS errors in console

- [ ] **Step 3: Verify /partners/dawn-mist (brand)**

Open `http://localhost:3000/partners/dawn-mist`

Expected:
- H1 "Dawn Mist" with teal "Brand" badge
- Logo, intro, featured products grid, category links
- No "Related Brands" section (brand type — only vendors show this)
- `<script type="application/ld+json">` tags in page source containing WebPage and BreadcrumbList schemas

- [ ] **Step 4: Verify /partners/graham-field (vendor)**

Open `http://localhost:3000/partners/graham-field`

Expected:
- H1 "Graham Field" with navy "Vendor / Distributor" badge
- "Related Brands" section present with link to `/partners/lumex`

- [ ] **Step 5: Verify /partners/dukal returns 404**

Open `http://localhost:3000/partners/dukal`

Expected: 404 page (inactive partner — `notFound()` fires)

- [ ] **Step 6: Verify /industries/pharmacy (populated, index)**

Open `http://localhost:3000/industries/pharmacy`

Expected:
- H1 "Pharmacy Supplies" in hero
- Intro, category chips, subcategory chips, product grid, related guides, CTA button, FAQ section (2 items)
- View page source: `<meta name="robots" content="index,follow">`
- `<script type="application/ld+json">` with FAQPage schema present

- [ ] **Step 7: Verify /industries/dental (thin, noindex)**

Open `http://localhost:3000/industries/dental`

Expected:
- Page renders (not 404)
- View page source: `<meta name="robots" content="noindex,follow">`
- No FAQ section visible, no FAQPage schema in source

- [ ] **Step 8: Verify /solutions/occ**

Open `http://localhost:3000/solutions/occ`

Expected:
- H1 "OCC Solutions"
- Program explanation card with free-shipping callout
- Eligible categories as anchor links to `/category/...`
- Product grid with 6 items
- FAQ section with 4 items
- View page source: FAQPage schema present, robots = `index,follow`
