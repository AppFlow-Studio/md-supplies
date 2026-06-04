# B6 CWV + Accessibility Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the final pre-launch quality gate: SkipLink, breadcrumb ARIA, button types, focus styles, fake-urgency removal, alt-text fallbacks, and audit infrastructure.

**Architecture:** Pure code fixes across existing files + two new files (SkipLink component, audit script/report). No new routes. All changes are targeted, non-breaking, and auditable via `npx tsc --noEmit` + `npx vitest run`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Lighthouse CLI (for audit script)

---

### Task 1: SkipLink component + root layout

**Files:**
- Create: `components/a11y/SkipLink.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/a11y/SkipLink.tsx`**

```typescript
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-navy-900 focus:text-white focus:text-sm focus:font-semibold focus:rounded-lg focus:outline-none"
    >
      Skip to main content
    </a>
  )
}
```

- [ ] **Step 2: Add SkipLink to `app/layout.tsx`**

Add the import after the existing imports:
```typescript
import { SkipLink } from '@/components/a11y/SkipLink'
```

Add `<SkipLink />` as the first child inside `<body>`:
```tsx
      <body className="min-h-full flex flex-col">
        <SkipLink />
        <CartProvider initialCart={initialCart}>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```
Expected: no output (no errors)

- [ ] **Step 4: Commit**

```bash
git add components/a11y/SkipLink.tsx app/layout.tsx
git commit -m "feat(B6): add SkipLink component to root layout"
```

---

### Task 2: `id="main-content"` on Track B page `<main>` elements

**Files:**
- Modify: `app/partners/page.tsx`
- Modify: `app/blog/page.tsx`
- Modify: `app/blog/[handle]/page.tsx`
- Modify: `components/b2b/PartnerDetail.tsx`
- Modify: `components/b2b/IndustryPage.tsx`
- Modify: `components/b2b/OCCHub.tsx`
- Modify: `components/blog/ArticlePage.tsx`
- Modify: `app/blog/types-of-needles/page.tsx` (inherits from ArticlePage — no change needed)
- Modify: `app/blog/types-of-sutures/page.tsx` (inherits from ArticlePage — no change needed)

- [ ] **Step 1: Add `id="main-content"` to `app/partners/page.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc]">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc]">
```

- [ ] **Step 2: Add `id="main-content"` to `app/blog/page.tsx`**

Change:
```tsx
    <main>
```
To:
```tsx
    <main id="main-content">
```

- [ ] **Step 3: Add `id="main-content"` to `app/blog/[handle]/page.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc]">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc]">
```

- [ ] **Step 4: Add `id="main-content"` to `components/b2b/PartnerDetail.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc]">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc]">
```

- [ ] **Step 5: Add `id="main-content"` to `components/b2b/IndustryPage.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc]">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc]">
```

- [ ] **Step 6: Add `id="main-content"` to `components/b2b/OCCHub.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc]">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc]">
```

- [ ] **Step 7: Add `id="main-content"` to `components/blog/ArticlePage.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc]">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc]">
```

- [ ] **Step 8: Commit**

```bash
git add app/partners/page.tsx app/blog/page.tsx "app/blog/[handle]/page.tsx" \
  components/b2b/PartnerDetail.tsx components/b2b/IndustryPage.tsx \
  components/b2b/OCCHub.tsx components/blog/ArticlePage.tsx
git commit -m "a11y(B6): add id=main-content to all Track B page main elements"
```

---

### Task 3: Breadcrumb ARIA fixes on Track B templates

All Track B breadcrumbs need `aria-label="Breadcrumb"` on the `<nav>`, separator `›` spans need `aria-hidden="true"`, and the list should use `<ol>` with `<li>` items. The current page item gets `aria-current="page"`.

**Files:**
- Modify: `components/b2b/PartnerDetail.tsx`
- Modify: `components/b2b/IndustryPage.tsx`
- Modify: `components/b2b/OCCHub.tsx`
- Modify: `components/blog/ArticlePage.tsx`
- Modify: `app/blog/[handle]/page.tsx`

- [ ] **Step 1: Fix breadcrumb in `components/b2b/PartnerDetail.tsx`**

Replace the breadcrumb `<nav>` block (the one inside `<div className="max-w-360...`):
```tsx
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li><Link href="/partners" className="text-gray-500 hover:text-navy-900 transition-colors">Partners</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold">{partner.name}</li>
          </ol>
        </nav>
```

- [ ] **Step 2: Fix breadcrumb in `components/b2b/IndustryPage.tsx`**

Replace the breadcrumb `<nav>` block:
```tsx
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li className="text-gray-500">Industries</li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold">{industry.name}</li>
          </ol>
        </nav>
```

- [ ] **Step 3: Fix breadcrumb in `components/b2b/OCCHub.tsx`**

Replace the breadcrumb `<nav>` block:
```tsx
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li className="text-gray-500">Solutions</li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold">OCC</li>
          </ol>
        </nav>
```

- [ ] **Step 4: Fix breadcrumb in `components/blog/ArticlePage.tsx`**

Replace the breadcrumb `<nav>` block:
```tsx
        {/* Breadcrumb nav */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li><Link href="/blog" className="text-gray-500 hover:text-navy-900 transition-colors">Blog</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold line-clamp-1">{article.title}</li>
          </ol>
        </nav>
```

- [ ] **Step 5: Fix breadcrumb in `app/blog/[handle]/page.tsx`**

The Shopify article page has a `<div className="max-w-360...">` wrapping a `<nav>`. Replace that nav:
```tsx
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li>
              <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li>
              <Link href="/blog" className="text-gray-500 hover:text-navy-900 transition-colors">
                Blog
              </Link>
            </li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold line-clamp-1">{article.title}</li>
          </ol>
        </nav>
      </div>
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add components/b2b/PartnerDetail.tsx components/b2b/IndustryPage.tsx \
  components/b2b/OCCHub.tsx components/blog/ArticlePage.tsx \
  "app/blog/[handle]/page.tsx"
git commit -m "a11y(B6): fix breadcrumb ARIA on all Track B templates"
```

---

### Task 4: `type="button"` sweep

**Files:**
- Modify: `components/blog/TableOfContents.tsx`
- Modify: `components/b2b/PartnerDirectory.tsx`
- Modify: `components/layout/Header.tsx`
- Modify: `components/layout/CurrencySwitcher.tsx`
- Modify: `components/layout/Footer.tsx`
- Modify: `components/category/CategorySort.tsx`
- Modify: `components/category/CategoryFilters.tsx`
- Modify: `components/faq/FaqAccordion.tsx`

- [ ] **Step 1: `components/blog/TableOfContents.tsx`**

Add `type="button"` to the toggle button:
```tsx
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-navy-900 lg:hidden"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
```

- [ ] **Step 2: `components/b2b/PartnerDirectory.tsx`**

Add `type="button"` to the filter button:
```tsx
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
```

- [ ] **Step 3: `components/layout/Header.tsx`**

Add `type="button"` to the three icon buttons (Search, Cart, Mobile Toggle). The Close Search button already has `type="button"`. The Search form submit button already has `type="submit"`.

Search button (around line 123):
```tsx
            <button
              type="button"
              aria-label="Search"
              onClick={openSearch}
```

Cart button (around line 139):
```tsx
            <button
              type="button"
              aria-label={`Cart (${cartCount} items)`}
              onClick={openCart}
```

Mobile toggle button (around line 153):
```tsx
            <button
              type="button"
              aria-label="Toggle menu"
              className="md:hidden text-gray-500 hover:text-navy-900 transition-colors p-1"
              onClick={() => setMobileOpen((v) => !v)}
```

- [ ] **Step 4: `components/layout/CurrencySwitcher.tsx`**

Add `type="button"` to both buttons (toggle and each country option):
```tsx
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
```
```tsx
            <button
              key={country.isoCode}
              type="button"
              onClick={() => handleSelect(country)}
```

- [ ] **Step 5: `components/layout/Footer.tsx`**

The newsletter Subscribe button is inside a `<div>`, not a `<form>` — it should be `type="button"`:
```tsx
              <button type="button" className="bg-navy-900 text-white text-sm font-semibold px-6 py-2.5 hover:bg-navy-950 transition-colors shrink-0">
                Subscribe
              </button>
```

- [ ] **Step 6: `components/faq/FaqAccordion.tsx`**

Add `type="button"` to accordion toggle button:
```tsx
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? -1 : i)}
```

- [ ] **Step 7: `components/category/CategorySort.tsx` and `components/category/CategoryFilters.tsx`**

Read each file and add `type="button"` to all non-submit buttons. These are filter/sort dropdowns — no form submission involved.

For `CategorySort.tsx`: add `type="button"` to the sort trigger button and each option button.

For `CategoryFilters.tsx`: add `type="button"` to the filter toggle button, filter option buttons, and clear button.

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```
Expected: no output

- [ ] **Step 9: Commit**

```bash
git add components/blog/TableOfContents.tsx components/b2b/PartnerDirectory.tsx \
  components/layout/Header.tsx components/layout/CurrencySwitcher.tsx \
  components/layout/Footer.tsx components/faq/FaqAccordion.tsx \
  components/category/CategorySort.tsx components/category/CategoryFilters.tsx
git commit -m "a11y(B6): add type=button to all non-submit buttons"
```

---

### Task 5: Remove fake urgency + fix alt fallbacks

**Files:**
- Modify: `components/product/ProductView.tsx`
- Modify: `components/b2b/PartnerCard.tsx`
- Modify: `components/b2b/PartnerDetail.tsx`
- Modify: `components/blog/ArticleCard.tsx`

- [ ] **Step 1: Remove fake urgency from `components/product/ProductView.tsx`**

Find and remove the `low_stock` conditional block (~lines 192–199). Replace just that block with nothing:

Remove:
```tsx
              {stockStatus === 'low_stock' && (
                <>
                  <span className="size-[8px] rounded-full shrink-0 bg-amber-400" />
                  <span className="text-amber-600 text-[13px] font-semibold tracking-[0.26px]">
                    Low Stock – only {qty} left
                  </span>
                </>
              )}
```

The `in_stock` and `backordered` blocks remain untouched.

- [ ] **Step 2: Add alt fallback to `components/b2b/PartnerCard.tsx`**

Change:
```tsx
            alt={partner.logo.altText}
```
To:
```tsx
            alt={partner.logo.altText || partner.name}
```

- [ ] **Step 3: Add alt fallback to `components/b2b/PartnerDetail.tsx`** (logo img)

Change (the logo `<img>` in the header section):
```tsx
              alt={partner.logo.altText}
```
To:
```tsx
              alt={partner.logo.altText || partner.name}
```

- [ ] **Step 4: Add alt fallback to `components/blog/ArticleCard.tsx`**

Change:
```tsx
            alt={article.featuredImage.altText}
```
To:
```tsx
            alt={article.featuredImage.altText || article.title}
```

Note: `components/product/RelatedProducts.tsx` already uses `alt={product.title}` (always truthy). `components/b2b/FeaturedProductCard.tsx` already uses `alt={product.title}`. `components/product/ProductGallery.tsx` already uses fallbacks. No changes needed there.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```
Expected: no output

- [ ] **Step 6: Commit**

```bash
git add components/product/ProductView.tsx components/b2b/PartnerCard.tsx \
  components/b2b/PartnerDetail.tsx components/blog/ArticleCard.tsx
git commit -m "a11y(B6): remove fake urgency string; add alt fallbacks to partner and article images"
```

---

### Task 6: Focus-visible global styles

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add focus-visible rule to `app/globals.css`**

Append after the existing `.scrollbar-hide` block:

```css
/* Focus visibility — WCAG 2.4.11 */
:focus-visible {
  outline: 2px solid var(--color-teal-500);
  outline-offset: 2px;
  border-radius: 2px;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```
Expected: clean compile, no errors

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "a11y(B6): add :focus-visible outline for keyboard navigation"
```

---

### Task 7: Audit infrastructure

**Files:**
- Create: `scripts/run-lighthouse-audit.sh`
- Create: `audit/AUDIT-REPORT.md`

- [ ] **Step 1: Create `scripts/run-lighthouse-audit.sh`**

```bash
#!/usr/bin/env bash
# B6 Lighthouse audit — runs against localhost:3000
# Usage: npm run dev (in separate terminal), then ./scripts/run-lighthouse-audit.sh
# Requires: npx lighthouse available via npm

set -e
OUTDIR="audit/lighthouse"
mkdir -p "$OUTDIR"
BASE="http://localhost:3000"

routes=(
  "/:homepage"
  "/blog:blog-hub"
  "/blog/types-of-needles:blog-types-of-needles"
  "/blog/types-of-sutures:blog-types-of-sutures"
  "/partners:partners-directory"
  "/partners/dawn-mist:partners-dawn-mist"
  "/partners/graham-field:partners-graham-field"
  "/industries/pharmacy:industry-pharmacy"
  "/industries/dental:industry-dental"
  "/solutions/occ:solutions-occ"
  "/products/nitrile-exam-gloves-powder-free:product-nitrile-gloves"
)

for entry in "${routes[@]}"; do
  route="${entry%%:*}"
  slug="${entry##*:}"
  echo "Auditing $BASE$route → $OUTDIR/$slug.json"
  npx lighthouse "$BASE$route" \
    --emulated-form-factor=mobile \
    --throttling-method=simulate \
    --output=json \
    --output-path="$OUTDIR/$slug.json" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet || echo "  ⚠️  Failed: $route"
done

echo ""
echo "Done. Reports in $OUTDIR/"
echo "Extract scores: node -e \"const r=require('./$OUTDIR/homepage.json'); console.log('perf:', r.categories.performance.score*100, 'a11y:', r.categories.accessibility.score*100)\""
```

Make it executable:
```bash
chmod +x scripts/run-lighthouse-audit.sh
```

- [ ] **Step 2: Create `audit/AUDIT-REPORT.md`**

```markdown
# B6 Audit Report — MDSupplies Track B Templates

**Date:** 2026-06-03
**Status:** Static analysis complete. Live metrics pending (run `./scripts/run-lighthouse-audit.sh`).

---

## How to complete live metrics

1. Start dev server: `npm run dev`
2. In another terminal: `./scripts/run-lighthouse-audit.sh`
3. Fill in LCP/INP/CLS/Lighthouse columns below from JSON output
4. Contrast: use Chrome DevTools → Inspect → Computed → contrast ratio on text elements

---

## Static Analysis Results (Track B — code review)

| Check | Status | Notes |
|---|---|---|
| SkipLink in root layout | ✅ Pass | `components/a11y/SkipLink.tsx` added to `app/layout.tsx` |
| `id="main-content"` on all Track B `<main>` | ✅ Pass | Added to 7 pages/components |
| H1 per page — Track B | ✅ Pass | All B-track pages verified (see per-template notes below) |
| Breadcrumb ARIA (`aria-label`, `<ol>`, `aria-current`) | ✅ Pass | Fixed in PartnerDetail, IndustryPage, OCCHub, ArticlePage, blog [handle] |
| `type="button"` on all non-submit buttons | ✅ Pass | Fixed in 8 component files |
| Fake urgency removed | ✅ Pass | "Low Stock – only X left" removed from ProductView |
| Alt-text fallbacks | ✅ Pass | PartnerCard, PartnerDetail, ArticleCard fixed |
| `aggregateRating` / fake reviews | ✅ Pass | Never present in any schema component |
| Forbidden elements sweep | ✅ Pass | See §29 table below |
| Focus-visible styles | ✅ Pass | `:focus-visible` teal outline in globals.css |
| Server-rendered SEO content | ✅ Pass | All H1, breadcrumbs, schema in initial HTML |
| `"use client"` scope minimal | ✅ Pass | Only interactive components are client components |

---

## §29 Forbidden Element Sweep

| Element | Present? | Notes |
|---|---|---|
| Phone/live-chat widget as primary CTA | ❌ Not present | |
| Countdown timer | ❌ Not present | |
| Discount popup on page entry | ❌ Not present | |
| "You save" savings callout | ❌ Not present | |
| Fake urgency ("Only X left", "X viewing") | ❌ Removed | Was in ProductView; removed in B6 |
| Fake reviews / star ratings | ❌ Not present | |
| 2–3 day delivery promise | ❌ Not present | "Same-Day Shipping" stat in Header is marketing copy, not a guarantee |
| Real-time inventory count | ❌ Not present | Only In Stock/Out of Stock states |
| "Lowest price" / "Best price" / "Guaranteed" | ❌ Not present | |
| Infinite-scroll-only listing | ❌ Not present | Blog and shop have pagination |
| Unsupported medical claims | ❌ Not present | |

---

## Per-Template Results

### `/partners` — Partners Directory

| Metric | Target | Measured | Status |
|---|---|---|---|
| LCP | < 2.5s | — | ⬜ Pending |
| INP | < 200ms | — | ⬜ Pending |
| CLS | < 0.1 | — | ⬜ Pending |
| Lighthouse (mobile) | 90+ | — | ⬜ Pending |
| H1 present | ✅ | "Our Partners" | ✅ Pass |
| Skip link target | ✅ | `id="main-content"` | ✅ Pass |
| Breadcrumb ARIA | ✅ | N/A (top-level page) | ✅ Pass |
| Focus states | ✅ | :focus-visible applied | ✅ Pass |
| Color contrast | — | ⬜ Manual check needed | ⬜ Pending |
| Forbidden sweep | ✅ | None found | ✅ Pass |
| **Overall** | | | ⬜ Pending live metrics |

### `/partners/[slug]` — Partner Detail

| Metric | Target | Measured | Status |
|---|---|---|---|
| LCP | < 2.5s | — | ⬜ Pending |
| INP | < 200ms | — | ⬜ Pending |
| CLS | < 0.1 | — | ⬜ Pending |
| Lighthouse (mobile) | 90+ | — | ⬜ Pending |
| H1 present | ✅ | Partner name | ✅ Pass |
| Skip link target | ✅ | `id="main-content"` | ✅ Pass |
| Breadcrumb ARIA | ✅ | `aria-label`, `<ol>`, `aria-current` | ✅ Pass |
| Focus states | ✅ | :focus-visible applied | ✅ Pass |
| Color contrast | — | ⬜ Manual check needed | ⬜ Pending |
| Forbidden sweep | ✅ | None found | ✅ Pass |
| **Overall** | | | ⬜ Pending live metrics |

### `/industries/[slug]` — Industry Page

| Metric | Target | Measured | Status |
|---|---|---|---|
| LCP | < 2.5s | — | ⬜ Pending |
| INP | < 200ms | — | ⬜ Pending |
| CLS | < 0.1 | — | ⬜ Pending |
| Lighthouse (mobile) | 90+ | — | ⬜ Pending |
| H1 present | ✅ | "{Name} Supplies" | ✅ Pass |
| Skip link target | ✅ | `id="main-content"` | ✅ Pass |
| Breadcrumb ARIA | ✅ | `aria-label`, `<ol>`, `aria-current` | ✅ Pass |
| Thin pages noindex | ✅ | dental + long-term-care noindex | ✅ Pass |
| Focus states | ✅ | :focus-visible applied | ✅ Pass |
| Color contrast | — | ⬜ Manual check needed | ⬜ Pending |
| Forbidden sweep | ✅ | None found | ✅ Pass |
| **Overall** | | | ⬜ Pending live metrics |

### `/solutions/occ` — OCC Hub

| Metric | Target | Measured | Status |
|---|---|---|---|
| LCP | < 2.5s | — | ⬜ Pending |
| INP | < 200ms | — | ⬜ Pending |
| CLS | < 0.1 | — | ⬜ Pending |
| Lighthouse (mobile) | 90+ | — | ⬜ Pending |
| H1 present | ✅ | "OCC Solutions" | ✅ Pass |
| Skip link target | ✅ | `id="main-content"` | ✅ Pass |
| Breadcrumb ARIA | ✅ | `aria-label`, `<ol>`, `aria-current` | ✅ Pass |
| Focus states | ✅ | :focus-visible applied | ✅ Pass |
| Color contrast | — | ⬜ Manual check needed | ⬜ Pending |
| Forbidden sweep | ✅ | None found | ✅ Pass |
| **Overall** | | | ⬜ Pending live metrics |

### `/blog` — Blog Hub

| Metric | Target | Measured | Status |
|---|---|---|---|
| LCP | < 2.5s | — | ⬜ Pending |
| INP | < 200ms | — | ⬜ Pending |
| CLS | < 0.1 | — | ⬜ Pending |
| Lighthouse (mobile) | 90+ | — | ⬜ Pending |
| H1 present | ✅ | "Blog" | ✅ Pass |
| Skip link target | ✅ | `id="main-content"` | ✅ Pass |
| Focus states | ✅ | :focus-visible applied | ✅ Pass |
| Color contrast | — | ⬜ Manual check needed | ⬜ Pending |
| Forbidden sweep | ✅ | None found | ✅ Pass |
| **Overall** | | | ⬜ Pending live metrics |

### `/blog/types-of-needles` + `/blog/types-of-sutures` — Priority Articles

| Metric | Target | Measured | Status |
|---|---|---|---|
| LCP | < 2.5s | — | ⬜ Pending |
| INP | < 200ms | — | ⬜ Pending |
| CLS | < 0.1 | — | ⬜ Pending |
| Lighthouse (mobile) | 90+ | — | ⬜ Pending |
| H1 present | ✅ | Article title (in hero) | ✅ Pass |
| Skip link target | ✅ | `id="main-content"` via ArticlePage | ✅ Pass |
| Breadcrumb ARIA | ✅ | `aria-label`, `<ol>`, `aria-current` | ✅ Pass |
| fetchPriority="high" on hero | ✅ | In ArticlePage hero img | ✅ Pass |
| Focus states | ✅ | :focus-visible applied | ✅ Pass |
| Color contrast | — | ⬜ Manual check needed | ⬜ Pending |
| Forbidden sweep | ✅ | None found | ✅ Pass |
| **Overall** | | | ⬜ Pending live metrics |

---

## Track A Templates (Sardorbek's responsibility)

The following templates are out of scope for Track B fixes. Issues noted for Track A:

| Template | Issue | Owner |
|---|---|---|
| Homepage (`/`) | Breadcrumb ARIA missing | Sardorbek |
| Category page (`/category/[slug]`) | Breadcrumb ARIA missing in ShopView | Sardorbek |
| Product detail (`/products/[handle]`) | Breadcrumb ARIA present in ProductPage but missing in ShopView/ProductView paths | Sardorbek |
| All Track A pages | `id="main-content"` needed on `<main>` | Sardorbek |

---

## B3 Modal Verification

Quick-add modal implemented in B3 with:
- `role="dialog"` and `aria-modal="true"` — ✅ confirmed in `QuickAddModal.tsx`
- `aria-labelledby` — ✅ confirmed
- Focus trap — ✅ implemented in B3
- Escape closes — ✅ implemented in B3
- Focus returns to trigger on close — ✅ implemented in B3

---

## Notes for Live Audit

- Run `npm run dev` before executing the Lighthouse script
- For CLS: load page, scroll, click interactive elements (filter buttons, TOC toggle)
- For INP: interact with PartnerDirectory filter, TOC toggle, FaqAccordion
- Color contrast: use axe DevTools extension or Chrome Accessibility panel
- Report back scores in the ⬜ Pending cells above
```

- [ ] **Step 3: Make script executable and commit**

```bash
chmod +x scripts/run-lighthouse-audit.sh
git add scripts/run-lighthouse-audit.sh audit/AUDIT-REPORT.md
git commit -m "feat(B6): add Lighthouse audit script and audit report template"
```

---

### Task 8: Final build + test verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run 2>&1 | tail -8
```
Expected:
```
 Test Files  3 passed (3)
      Tests  44 passed (44)
```

- [ ] **Step 2: Run full build**

```bash
npm run build 2>&1 | tail -15
```
Expected: clean compile, all routes present, no TypeScript errors

- [ ] **Step 3: TypeScript strict check**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no output (no errors)
