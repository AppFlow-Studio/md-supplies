# Homepage Hero LCP Opacity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the homepage hero H1 (and the rest of the above-the-fold hero content) from being server-rendered at `opacity:0`, so it paints immediately instead of waiting for hydration + `whileInView` to fire. This is the single biggest lever on homepage LCP (baseline 7.5s).

**Architecture:** `HeroSection` currently wraps every above-the-fold block in `<FadeIn>` (`components/ui/FadeIn.tsx`), a `'use client'` `framer-motion` component whose `initial={{ opacity: 0, y: 24 }}` is what framer-motion actually serializes into the server-rendered HTML (`style="opacity:0;transform:translateY(24px)"` — confirmed by rendering `HeroSection` with `renderToStaticMarkup` and inspecting the output). Because `whileInView` only resolves after hydration + an `IntersectionObserver` callback, the hero stays invisible until JS has loaded and run. The fix removes `<FadeIn>` from `HeroSection` entirely (it has no interactive/client-only needs otherwise, so it also drops its now-unnecessary `'use client'` directive and becomes a Server Component) and renders the hero content as plain, opaque markup. `FadeIn` itself is untouched — every below-the-fold home section (`TrustedBrands`, `ShopByIndustry`, `PopularCategories`, `PopularProducts`, `WhyChooseUs`) keeps its existing scroll-triggered fade-in, which is correct there because those sections start out of view anyway.

**Tech Stack:** Next.js 16 App Router (Server Components), React 19, Vitest, `react-dom/server` (`renderToStaticMarkup`) — same pattern already used by `__tests__/hero-cta-routes.test.ts`.

## Global Constraints

- This is a P1 launch-gate ticket. Scope is exactly the two checklist items below — do not also do the separate "framer-motion diet" ticket (M23/M24/L14/L15) in this change.
- No visual/structural regressions: every className currently passed to a `<FadeIn>` must end up on the exact same element after the wrapper is removed, so Tailwind layout (`flex flex-col items-start gap-5 sm:gap-6`, etc.) is unchanged.
- Do not touch `components/ui/FadeIn.tsx` or any below-the-fold section — they must keep their fade-in entrance animation.
- Ticket acceptance criteria:
  - View-source / server HTML shows the hero H1 text visible (not `opacity:0`).
  - Homepage LCP improves materially from the 7.5s baseline.

---

### Task 1: Write failing tests that capture the bug and lock in the fix

**Files:**
- Create: `__tests__/hero-lcp-opacity.test.ts`

**Interfaces:**
- Consumes: `HeroSection` from `@/components/home/HeroSection` (existing export, signature `HeroSection({ products: CollectionProduct[] })`, unchanged by this plan).

- [ ] **Step 1: Write the test file**

```typescript
// __tests__/hero-lcp-opacity.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { HeroSection } from '../components/home/HeroSection'

function readSource(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

const html = renderToStaticMarkup(createElement(HeroSection, { products: [] }))

describe('Homepage hero renders opaque in server HTML (LCP fix)', () => {
  it('server-rendered markup has no opacity:0 inline style', () => {
    expect(html).not.toMatch(/opacity:0/)
  })

  it('the hero H1 text is present in the server-rendered markup', () => {
    expect(html).toContain('Medical Supplies for')
  })

  it('HeroSection is a Server Component (no "use client" directive)', () => {
    const src = readSource('components/home/HeroSection.tsx')
    expect(src).not.toMatch(/^['"]use client['"]/m)
  })

  it('HeroSection no longer wraps above-the-fold content in FadeIn', () => {
    const src = readSource('components/home/HeroSection.tsx')
    expect(src).not.toMatch(/FadeIn/)
  })
})

describe('Below-the-fold homepage sections keep their fade-in entrance animation', () => {
  const sections = [
    'components/home/TrustedBrands.tsx',
    'components/home/ShopByIndustry.tsx',
    'components/home/PopularCategories.tsx',
    'components/home/PopularProducts.tsx',
    'components/home/WhyChooseUs.tsx',
  ]

  for (const file of sections) {
    it(`${file} still uses FadeIn`, () => {
      expect(readSource(file)).toMatch(/FadeIn/)
    })
  }
})
```

- [ ] **Step 2: Run the tests to verify the bug-capturing assertions fail**

Run: `npx vitest run __tests__/hero-lcp-opacity.test.ts`
Expected: FAIL on 3 of the 4 tests in the first `describe` block —
  - `opacity:0` IS present today → fails
  - `'use client'` IS present today → fails
  - `FadeIn` IS present today → fails
  - the H1-text test already passes (the text is in the markup, just invisible) — that's expected, it's a guard against a future regression, not proof of the current bug.
The second `describe` block (below-the-fold sections) should already PASS — this locks in the current, correct state as a regression guard.

---

### Task 2: Remove FadeIn from HeroSection and make it a Server Component

**Files:**
- Modify: `components/home/HeroSection.tsx`

- [ ] **Step 1: Replace the file contents**

Drop the `'use client'` directive and the `FadeIn` import, and unwrap every `<FadeIn>...</FadeIn>` to its plain child, moving any `className` FadeIn was given onto the child element directly:

```tsx
import Link from "next/link";
import Image from "next/image";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import type { CollectionProduct } from "@/lib/shopify/types";
import { Van } from "lucide-react";

function OccIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="1" y="4" width="12" height="9" rx="1" stroke="#0086b1" strokeWidth="1.4" fill="none"/>
      <path d="M4.5 4V3C4.5 1.895 5.395 1 6.5 1h1C8.605 1 9.5 1.895 9.5 3v1" stroke="#0086b1" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="1" y1="7.5" x2="13" y2="7.5" stroke="#0086b1" strokeWidth="1.4"/>
    </svg>
  );
}

interface Props {
  products: CollectionProduct[];
}

function ProductCard({ product, priority = false }: { product: CollectionProduct; priority?: boolean }) {
  const price = parseFloat(
    product.variants.nodes[0]?.price.amount ?? product.priceRange.minVariantPrice.amount,
  );
  const image = product.images.nodes[0];

  return (
    <Link
      href={`/product/${product.handle}`}
      className="group bg-white overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="relative aspect-square overflow-hidden bg-white p-7">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.title}
            fill
            sizes="(max-width: 640px) 45vw, 220px"
            priority={priority}
            className="object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-[14px] font-semibold text-navy-900 leading-snug line-clamp-2">{product.title}</p>
        <p className="text-[12px] text-gray-500">From ${price.toFixed(2)} · {product.vendor}</p>
      </div>
    </Link>
  );
}

export function HeroSection({ products }: Props) {
  return (
    <section className="w-full bg-neutral-100">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 md:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12 xl:gap-20">

          {/* ── Left: content ── */}
          <div className="flex-1 min-w-0 flex flex-col items-start gap-5 sm:gap-6">

            {/* Badge — no icon per Figma design */}
            <div className="inline-flex bg-[rgba(0,193,255,0.2)] rounded-full px-5 py-2">
              <span className="text-[15px] font-semibold tracking-[0.3px] text-teal-500">
                CERTIFIED MEDICAL SUPPLIER
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-[38px] sm:text-[46px] lg:text-[55px] font-semibold leading-[1.2] tracking-[0.9px] text-navy-900">
              Medical Supplies for{" "}
              <span className="text-teal-500">Clinics, Facilities &amp; Everyday Orders</span>
            </h1>

            {/* Description */}
            <p className="text-gray-500 text-[18px] leading-[30px] tracking-[0.36px] max-w-[516px]">
              Shop 8,000+ medical, home care, testing, mobility, and care supplies online.
              MDSupplies serves healthcare teams, organizations, businesses, and individual
              customers with clear product access and reliable ordering support.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/categories"
                className="bg-navy-900 text-white border border-navy-900 text-[18px] font-semibold px-[52px] py-[17px] hover:bg-white hover:text-navy-900 hover:border-teal-500 transition-colors tracking-[0.36px]"
              >
                Shop All Products
              </Link>
              <Link
                href="/categories"
                className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-[52px] py-[17px] hover:bg-navy-900 hover:text-white transition-colors tracking-[0.36px]"
              >
                Find Supplies by Category
              </Link>
            </div>

            {/* OCC Program box */}
            <div className="bg-[rgba(0,193,255,0.2)] px-5 py-4 flex items-center gap-4 w-full max-w-[539px]">
              <Van className="w-10 h-9"/>
              <div className="flex-1">
                <p className="text-navy-900 text-[18px] font-extrabold tracking-[0.36px] leading-snug">
                  OCC Program
                </p>
                <p className="text-navy-900 text-[16px] font-semibold tracking-[0.32px] leading-snug mt-0.5">
                  Dedicated pricing, terms &amp; account support
                </p>
              </div>
              <Link
                href="/solutions/occ"
                className="group text-teal-500 text-[15px] font-semibold shrink-0 tracking-[0.3px] inline-flex items-center gap-1"
              >
                Shop OCC <AnimatedArrow size={14} />
              </Link>
            </div>

          </div>

          {/* ── Right: product grid ── */}
          <div className="w-full sm:w-105 lg:w-115 xl:w-135 shrink-0">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex flex-col gap-3 sm:gap-4 flex-1 mt-8">
                {products && [products[0], products[2]].filter(Boolean).map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i === 0} />
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:gap-4 flex-1">
                {products && [products[1], products[3]].filter(Boolean).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
```

Note the unused `OccIcon` function was already unused in the original file (dead code pre-existing this change) — leave it as-is, removing it is out of scope for this fix.

- [ ] **Step 2: Run the tests to verify they now pass**

Run: `npx vitest run __tests__/hero-lcp-opacity.test.ts`
Expected: PASS (9/9 — 4 in the first block, 5 in the second).

- [ ] **Step 3: Run the pre-existing hero tests to confirm no regression**

Run: `npx vitest run __tests__/hero-cta-routes.test.ts __tests__/lcp-priority.test.ts __tests__/reduced-motion.test.ts`
Expected: PASS — CTA hrefs, single-H1 count, priority image, and sitewide reduced-motion guards are all unaffected by this change.

- [ ] **Step 4: Commit**

```bash
git add components/home/HeroSection.tsx __tests__/hero-lcp-opacity.test.ts
git commit -m "perf: render homepage hero opaque in server HTML, drop FadeIn/client boundary from above-the-fold content"
```

---

### Task 3: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new `hero-lcp-opacity.test.ts`.

- [ ] **Step 2: TypeScript strict check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: clean compile, all routes present. Confirms `HeroSection` compiles correctly as a Server Component (no client-only API leaking through `AnimatedArrow`, `Image`, or `Link`).

- [ ] **Step 4: Manual view-source proof (ties to the ticket's QA screenshot requirement)**

```bash
npm run build && npm run start &
sleep 3
curl -s http://localhost:3000/ | grep -o 'opacity:0' | head -1
curl -s http://localhost:3000/ | grep -o '<h1[^>]*>Medical Supplies for' | head -1
```

Expected: the first `grep` prints nothing (no `opacity:0` anywhere the hero renders — note `WholesalePricing` further down the page still legitimately uses framer-motion below the fold, so this checks the *hero* specifically if any hits appear inspect where they are before concluding failure). The second `grep` prints the opening of the H1 tag with the heading text, proving it's present and un-hidden in the raw server HTML. Stop the server afterward (`kill %1` or Ctrl-C).

This satisfies the ticket's "View-source showing hero text in server HTML" evidence item. The "Lighthouse LCP before/after (mobile)" evidence item requires a real Lighthouse run (e.g. `npx lighthouse http://localhost:3000/ --emulated-form-factor=mobile --throttling-method=simulate`, same invocation as `scripts/run-lighthouse-audit-track-a.sh`) against a built production server — do this manually and attach the before/after report to the ticket; it's a measurement step, not a code change, so it isn't encoded as an automated test here.
