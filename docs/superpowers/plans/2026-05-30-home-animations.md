# Home Page Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Framer Motion entrance animations to all 7 home page sections — staggered fade-up on hero load, scroll-triggered stagger on every section below.

**Architecture:** Install framer-motion, create a shared `FadeIn` client component for single-element fade-ups, and use inline `motion.div` + `variants` for staggered grids. All home components get `'use client'` (none do server-side data fetching — data is passed as props from `app/page.tsx` which stays a server component). All animations use `whileInView + viewport={{ once: true }}` so they trigger once and don't replay on scroll-back.

**Tech Stack:** Next.js 16 App Router, React 19, Framer Motion (latest), TypeScript, Tailwind CSS 4

---

## File Map

| File | Action |
|---|---|
| `package.json` | Add framer-motion dependency |
| `components/ui/FadeIn.tsx` | Create — shared fade-up wrapper |
| `components/home/HeroSection.tsx` | Modify — add `'use client'`, wrap elements in FadeIn |
| `components/home/TrustedBrands.tsx` | Modify — already client, add FadeIn |
| `components/home/ShopByIndustry.tsx` | Modify — add `'use client'`, FadeIn heading + stagger grid |
| `components/home/PopularCategories.tsx` | Modify — add `'use client'`, FadeIn heading + stagger grid |
| `components/home/PopularProducts.tsx` | Modify — add `'use client'`, FadeIn heading + stagger grid |
| `components/home/WhyChooseUs.tsx` | Modify — add `'use client'`, FadeIn heading + stagger grid |
| `components/home/WholesalePricing.tsx` | Modify — already client, stagger left panel + FadeIn form |

---

## Task 1: Install framer-motion + create FadeIn primitive

**Files:**
- Modify: `package.json` (via npm install)
- Create: `components/ui/FadeIn.tsx`

- [ ] **Step 1: Install framer-motion**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/md-supplies && npm install framer-motion
```

Expected: `added N packages` with no peer-dep errors. React 19 is supported from framer-motion 11.3+.

- [ ] **Step 2: Create `components/ui/FadeIn.tsx`**

```tsx
'use client'

import { motion } from 'framer-motion'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/ui/FadeIn.tsx
git commit -m "feat: install framer-motion and add FadeIn primitive"
```

---

## Task 2: Animate HeroSection

**Files:**
- Modify: `components/home/HeroSection.tsx`

Adds `'use client'`, imports `FadeIn`, wraps each left-column element with staggered delays, wraps right product grid in a single FadeIn.

- [ ] **Step 1: Replace `components/home/HeroSection.tsx` with the animated version**

```tsx
'use client'

import Link from "next/link";
import { ShieldCheck, Check, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";

const PRODUCT_CARDS = [
  {
    name: "Professional Thermometer",
    priceFrom: "$2.40/unit",
    pricePer: "Box of 40",
    img: "https://www.figma.com/api/mcp/asset/226d283f-825f-471a-b2c6-f75a4c4758fd",
  },
  {
    name: "Insulin Delivery System",
    priceFrom: "$4.60/unit",
    pricePer: "Box of 40",
    img: "https://www.figma.com/api/mcp/asset/356abec0-5f2d-491a-b744-aea8cfc297a2",
  },
  {
    name: "Sterile Barrier Pack",
    priceFrom: "$2.20/unit",
    pricePer: "Box of 50",
    img: "https://www.figma.com/api/mcp/asset/74ba38c1-0c87-488b-8cbb-585446711a84",
  },
  {
    name: "Digital BP Monitor",
    priceFrom: "$4.80/unit",
    pricePer: "Box of 10",
    img: "https://www.figma.com/api/mcp/asset/111e9c13-d77a-4538-a51b-96a4947d03b4",
  },
];

function ProductCard({ name, priceFrom, pricePer, img }: {
  name: string; priceFrom: string; pricePer: string; img: string;
}) {
  return (
    <Link
      href="/products"
      className="group bg-white overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="aspect-square overflow-hidden bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-[12px] font-semibold text-navy-900 leading-snug">{name}</p>
        <p className="text-[10px] text-gray-500">From {priceFrom} · {pricePer}</p>
      </div>
    </Link>
  );
}

export function HeroSection() {
  return (
    <section className="w-full bg-neutral-100">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 md:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12 xl:gap-20">

          {/* ── Left: content ── */}
          <div className="flex-1 min-w-0 flex flex-col items-start gap-5 sm:gap-6">

            <FadeIn delay={0}>
              <div className="flex items-center gap-2 bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-2">
                <ShieldCheck size={14} className="text-teal-500 shrink-0" />
                <span className="text-[11px] font-semibold tracking-[0.08em] text-teal-500 uppercase">
                  Certified Medical Supplier
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div>
                <h1 className="text-[38px] sm:text-[46px] lg:text-[55px] font-bold leading-[1.15] tracking-tight text-navy-900">
                  Medical-Grade Supplies
                </h1>
                <h1 className="text-[38px] sm:text-[46px] lg:text-[55px] font-bold leading-[1.15] tracking-tight text-teal-500">
                  Wholesale Prices
                </h1>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-gray-500 text-[15px] leading-[1.9] max-w-122.5">
                Bulk pricing on 4,000+ products. Trusted by urgent care centers,
                HRT clinics, home health agencies, and first responders.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="bg-navy-900 text-white text-sm font-semibold px-10 py-[18px] hover:bg-navy-950 transition-colors"
                >
                  Shop All Products
                </Link>
                <Link
                  href="/contact"
                  className="border border-navy-900 text-navy-900 text-sm font-semibold px-10 py-[18px] hover:bg-navy-900 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="bg-[rgba(0,193,255,0.2)] px-5 py-4 flex flex-col gap-2 w-full max-w-77.75 mt-1">
                <p className="text-navy-900 text-[17px] font-bold">OCC Program</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Check size={12} className="text-teal-500 shrink-0" />
                  <span>Free shipping on all eligible items</span>
                </div>
                <Link
                  href="/occ"
                  className="text-teal-500 text-sm font-semibold hover:underline flex items-center gap-1 mt-0.5"
                >
                  Shop OCC <ArrowRight size={13} />
                </Link>
              </div>
            </FadeIn>

          </div>

          {/* ── Right: product grid ── */}
          <FadeIn delay={0.2} className="w-full sm:w-105 lg:w-115 xl:w-135 shrink-0">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex flex-col gap-3 sm:gap-4 flex-1 mt-8">
                {[PRODUCT_CARDS[0], PRODUCT_CARDS[2]].map(({ name, priceFrom, pricePer, img }) => (
                  <ProductCard key={name} name={name} priceFrom={priceFrom} pricePer={pricePer} img={img} />
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:gap-4 flex-1">
                {[PRODUCT_CARDS[1], PRODUCT_CARDS[3]].map(({ name, priceFrom, pricePer, img }) => (
                  <ProductCard key={name} name={name} priceFrom={priceFrom} pricePer={pricePer} img={img} />
                ))}
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/HeroSection.tsx
git commit -m "feat: add entrance animations to HeroSection"
```

---

## Task 3: Animate TrustedBrands

**Files:**
- Modify: `components/home/TrustedBrands.tsx`

Already `'use client'`. Wrap the inner container div in `FadeIn` so the whole brands row fades up on scroll.

- [ ] **Step 1: Replace `components/home/TrustedBrands.tsx`**

```tsx
"use client";

import { useState } from "react";
import { FadeIn } from "@/components/ui/FadeIn";

const BRANDS = [
  { name: "Cardinal Health", img: "/images/brands/cardinal-health.png" },
  { name: "Medline",         img: "/images/brands/medline.png" },
  { name: "Covidien",        img: "/images/brands/covidien.png" },
  { name: "McKesson",        img: "/images/brands/mc-kesson.png" },
  { name: "Dynarex",         img: "/images/brands/dynarex.png" },
  { name: "BD",              img: "/images/brands/bd.png" },
];

function BrandLogo({ name, img }: { name: string; img: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="font-extrabold text-[14px] sm:text-[17px] tracking-[0.06em] text-[rgba(6,13,25,0.25)] select-none">
        {name.toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt={name}
      className="h-7 sm:h-9 w-auto max-w-30 sm:max-w-37.5 object-contain grayscale opacity-50 hover:opacity-90 hover:grayscale-0 transition-all duration-300"
      onError={() => setFailed(true)}
    />
  );
}

export function TrustedBrands() {
  return (
    <section className="w-full bg-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.05)]">
      <FadeIn className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 md:py-10">
        <p className="text-center text-[12px] sm:text-[13px] font-semibold text-gray-500 tracking-[0.12em] uppercase mb-7">
          Trusted Brands We Carry
        </p>
        <div className="flex items-center gap-8 sm:gap-4 overflow-x-auto sm:overflow-visible sm:justify-between pb-1 sm:pb-0 scrollbar-hide">
          {BRANDS.map((brand) => (
            <div key={brand.name} className="shrink-0 sm:shrink-0 flex items-center justify-center min-w-25 sm:flex-1">
              <BrandLogo {...brand} />
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/TrustedBrands.tsx
git commit -m "feat: add fade-in animation to TrustedBrands"
```

---

## Task 4: Animate ShopByIndustry

**Files:**
- Modify: `components/home/ShopByIndustry.tsx`

Adds `'use client'`, FadeIn on heading row, staggered `motion.div` on each industry card.

- [ ] **Step 1: Replace `components/home/ShopByIndustry.tsx`**

```tsx
'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

const INDUSTRIES = [
  {
    name: "Urgent Care",
    href: "/industries/urgent-care",
    img: "https://www.figma.com/api/mcp/asset/bce9ec8d-dd4e-4faf-85b1-f47ce6d1124c",
  },
  {
    name: "EMS",
    href: "/industries/ems",
    img: "https://www.figma.com/api/mcp/asset/b6de8838-e64a-4bf2-9ef1-cff96d90b28d",
  },
  {
    name: "Pharmacy",
    href: "/industries/pharmacy",
    img: "https://www.figma.com/api/mcp/asset/46383ec7-9c26-4ab3-9a2a-66fed0db01d5",
  },
  {
    name: "Physical Therapy",
    href: "/industries/physical-therapy",
    img: "https://www.figma.com/api/mcp/asset/f5c0d0c8-247d-4cbb-8cf5-c2756abc5171",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function ShopByIndustry() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Shop By Industry
          </h2>
          <Link
            href="/industries"
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            All Industries →
          </Link>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {INDUSTRIES.map(({ name, href, img }) => (
            <motion.div key={name} variants={itemVariants}>
              <Link
                href={href}
                className="group relative overflow-hidden aspect-[314/390] block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/65" />
                <span className="absolute bottom-5 left-5 text-white text-[20px] font-semibold tracking-[0.4px] drop-shadow-sm">
                  {name}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/ShopByIndustry.tsx
git commit -m "feat: add stagger animations to ShopByIndustry"
```

---

## Task 5: Animate PopularCategories

**Files:**
- Modify: `components/home/PopularCategories.tsx`

Adds `'use client'`, FadeIn on heading, staggered motion.div wrapping each category cell. The inner Link gets `h-full` so it fills the motion.div grid cell.

- [ ] **Step 1: Replace `components/home/PopularCategories.tsx`**

```tsx
'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

interface CollectionSummary {
  id: string;
  title: string;
  handle: string;
  image: { url: string; altText: string | null } | null;
}

interface Props {
  collections: CollectionSummary[];
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function PopularCategories({ collections }: Props) {
  return (
    <section className="w-full bg-white">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Popular Categories
          </h2>
          <Link
            href="/shop"
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            Browse all categories →
          </Link>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {collections.map(({ id, title, handle, image }) => (
            <motion.div key={id} variants={itemVariants}>
              <Link
                href={`/category/${handle}`}
                className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-10 px-4 h-full"
              >
                <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center overflow-hidden group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.altText ?? title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-teal-500 text-[20px] font-bold">
                      {title.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-[15px] font-semibold text-navy-900 text-center leading-snug">
                  {title}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/PopularCategories.tsx
git commit -m "feat: add stagger animations to PopularCategories"
```

---

## Task 6: Animate PopularProducts

**Files:**
- Modify: `components/home/PopularProducts.tsx`

Adds `'use client'`, FadeIn on heading, replaces the outer product `<div>` with `<motion.div variants={itemVariants}>` so each card staggers in.

- [ ] **Step 1: Replace `components/home/PopularProducts.tsx`**

```tsx
'use client'

import Link from "next/link";
import { Star, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import type { CollectionProduct } from "@/lib/shopify/types";

interface Props {
  products: CollectionProduct[];
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function PopularProducts({ products }: Props) {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn>
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] mb-8">
            Popular products
          </h2>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {products.map((product) => {
            const variant = product.variants.nodes[0];
            const price = parseFloat(
              variant?.price.amount ?? product.priceRange.minVariantPrice.amount,
            );
            const image = product.images.nodes[0];

            return (
              <motion.div key={product.id} variants={itemVariants} className="bg-white flex flex-col">

                <Link
                  href={`/product/${product.handle}`}
                  className="group overflow-hidden aspect-square bg-gray-50 block"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.altText ?? product.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </Link>

                <div className="flex flex-col gap-1.5 p-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-teal-500 tracking-[0.26px]">
                      {product.vendor}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-500/60 tracking-[0.26px]">
                      {product.availableForSale ? "in stock" : "out of stock"}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className="text-[#f5a623] fill-[#f5a623]" />
                    ))}
                  </div>
                  <p className="text-[14px] font-semibold text-black leading-snug line-clamp-3">
                    {product.title}
                  </p>
                  <p className="text-[18px] font-bold text-black tracking-[0.36px] mt-auto pt-1">
                    ${price.toFixed(2)} USD
                  </p>
                  <Link
                    href={`/product/${product.handle}`}
                    className="mt-2 bg-navy-900 text-white text-[12px] font-semibold text-center py-2.5 flex items-center justify-center gap-1.5 hover:bg-navy-950 transition-colors"
                  >
                    <Plus size={13} />
                    Quick Add
                  </Link>
                </div>

              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/PopularProducts.tsx
git commit -m "feat: add stagger animations to PopularProducts"
```

---

## Task 7: Animate WhyChooseUs

**Files:**
- Modify: `components/home/WhyChooseUs.tsx`

Adds `'use client'`, FadeIn on heading, each FeatureCard wrapped in `motion.div` for stagger. The horizontal divider is left as a plain div (it's 1px tall, not worth animating).

- [ ] **Step 1: Replace `components/home/WhyChooseUs.tsx`**

```tsx
'use client'

import { Truck, ShieldCheck, Tag, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

const FEATURES: { Icon: LucideIcon; title: string; description: string }[] = [
  {
    Icon: Truck,
    title: "Same Day Shipping",
    description: "Order by 2PM for same-day dispatch on in-stock items",
  },
  {
    Icon: ShieldCheck,
    title: "100% Authentic",
    description: "Every product is genuine and sourced directly from the manufacturers",
  },
  {
    Icon: Tag,
    title: "Competitive Pricing",
    description: "Save up to 40% compared to traditional distributors",
  },
  {
    Icon: RotateCcw,
    title: "30 Day Returns",
    description: "Easy hassle-free returns on all unopened products",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

function FeatureCard({ Icon, title, description }: (typeof FEATURES)[0]) {
  return (
    <div className="flex flex-col gap-3 p-6 md:p-8 lg:p-10">
      <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.2)] flex items-center justify-center shrink-0">
        <Icon size={22} className="text-teal-300" strokeWidth={1.5} />
      </div>
      <p className="text-white text-[16px] font-bold tracking-[0.32px]">{title}</p>
      <p className="text-white text-[14px] font-normal tracking-[0.28px] leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  );
}

export function WhyChooseUs() {
  return (
    <section className="w-full bg-navy-900">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn>
          <h2 className="text-[28px] font-semibold text-white text-center tracking-[0.56px] mb-10">
            Why Healthcare Professionals Choose Us
          </h2>
        </FadeIn>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}><FeatureCard {...FEATURES[0]} /></motion.div>
          <motion.div variants={itemVariants}><FeatureCard {...FEATURES[1]} /></motion.div>
          <div className="sm:col-span-2 h-px bg-white/10" />
          <motion.div variants={itemVariants}><FeatureCard {...FEATURES[2]} /></motion.div>
          <motion.div variants={itemVariants}><FeatureCard {...FEATURES[3]} /></motion.div>
        </motion.div>

      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/WhyChooseUs.tsx
git commit -m "feat: add stagger animations to WhyChooseUs"
```

---

## Task 8: Animate WholesalePricing

**Files:**
- Modify: `components/home/WholesalePricing.tsx`

Already `'use client'`. Stagger the left panel content (badge → headline → description → benefits) and fade in the right form panel.

- [ ] **Step 1: Replace `components/home/WholesalePricing.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

const BENEFITS = [
  "Volume discounts up to 25%",
  "Net 30 payment terms",
  "Dedicated account manager",
  "Priority same-day shipping",
];

const FACULTY_TYPES = [
  "Urgent Care Center",
  "Hospital / Health System",
  "HRT / Wellness Clinic",
  "Home Care Agency",
  "EMS / First Responder",
  "Pharmacy",
  "Physical Therapy",
  "Other",
];

const leftContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const leftItemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function WholesalePricing() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    facultyType: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert("Application submitted! We'll be in touch shortly.");
  }

  return (
    <section className="w-full bg-neutral-50 overflow-hidden">
      <div className="max-w-360 mx-auto flex flex-col lg:flex-row min-h-[580px]">

        {/* ── Left: teal panel ── */}
        <motion.div
          className="bg-teal-500 flex-1 px-8 sm:px-12 lg:px-14 py-14 md:py-16 flex flex-col justify-center gap-6"
          variants={leftContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={leftItemVariants} className="inline-flex items-center self-start bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-2">
            <span className="text-[13px] font-semibold tracking-[0.06em] text-white uppercase">
              For Healthcare Professionals
            </span>
          </motion.div>

          <motion.h2 variants={leftItemVariants} className="text-[38px] sm:text-[45px] font-bold text-white leading-[1.15] tracking-[0.9px] max-w-[460px]">
            Get exclusive Wholesale Pricing
          </motion.h2>

          <motion.p variants={leftItemVariants} className="text-white text-[15px] font-normal leading-[1.9] max-w-[490px]">
            Apply for a professional account and volume discounts, priority support, and net terms.
          </motion.p>

          <motion.ul variants={leftItemVariants} className="flex flex-col gap-3">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-white text-[15px]">
                <Check size={12} className="shrink-0 text-white" strokeWidth={3} />
                {item}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* ── Right: form panel ── */}
        <FadeIn delay={0.2} className="bg-white lg:w-[560px] xl:w-[642px] shrink-0 px-8 sm:px-12 lg:px-14 py-14 md:py-16 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">

            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Faculty Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="Dr. Jane Smith"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Your Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="jane@clinic.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Select Faculty Type
              </label>
              <select
                name="facultyType"
                value={form.facultyType}
                onChange={handleChange}
                required
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>Choose a type…</option>
                {FACULTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 bg-navy-900 text-white text-[18px] font-semibold tracking-[0.04em] py-4 hover:bg-navy-950 transition-colors"
            >
              Submit Application
            </button>

          </form>
        </FadeIn>

      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/WholesalePricing.tsx
git commit -m "feat: add animations to WholesalePricing"
```

---

## Final verification

- [ ] Run `npx tsc --noEmit` — confirm zero TypeScript errors across all changed files.
- [ ] Start the dev server (`npm run dev`) and open `http://localhost:3000`.
- [ ] Verify hero content staggers in on page load (badge first, then heading, description, CTAs, OCC card).
- [ ] Scroll down slowly — verify each section fades up as it enters the viewport.
- [ ] Verify industry, category, product, and feature cards stagger in one by one (not all at once).
- [ ] Scroll back to top and back down — verify animations do NOT replay (once: true).
