# B6 · Core Web Vitals + Accessibility Audit & Enforcement Design Spec

**Date:** 2026-06-03
**Status:** Approved
**Depends on:** B1–B5 (all Track B templates)

---

## Overview

Final quality gate before launch. Two work streams: (1) code fixes applied to all Track B templates, (2) audit infrastructure for live browser measurement. Track A template fixes are out of scope — noted in the report as Sardorbek's responsibility.

---

## Work Stream 1: Code Fixes

### 1. SkipLink component + root layout

**New file:** `components/a11y/SkipLink.tsx`

Visually hidden "Skip to main content" link. Becomes visible on keyboard focus. Links to `#main-content`.

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

**Modify:** `app/layout.tsx` — add `<SkipLink />` as first child of `<body>`.

**Add `id="main-content"`** to the `<main>` element in every Track B page template:
- `app/partners/page.tsx` — the `<main>` in `PartnersPage`
- `components/b2b/PartnerDetail.tsx`
- `components/b2b/IndustryPage.tsx`
- `components/b2b/OCCHub.tsx`
- `components/blog/ArticlePage.tsx`
- `app/blog/page.tsx`
- `app/blog/[handle]/page.tsx`

Track A pages (`app/page.tsx`, `app/products/[handle]/page.tsx`, etc.) — noted in audit report as Track A responsibility.

---

### 2. Breadcrumb ARIA fixes

All Track B breadcrumbs currently use plain `<nav className="...">` with `<span>` separators. Required pattern:

```tsx
<nav aria-label="Breadcrumb">
  <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
    <li><Link href="/">Home</Link></li>
    <li aria-hidden="true">›</li>
    <li><Link href="/partners">Partners</Link></li>
    <li aria-hidden="true">›</li>
    <li aria-current="page">Partner Name</li>
  </ol>
</nav>
```

**Fix in all Track B components with breadcrumb navs:**
- `components/b2b/PartnerDetail.tsx`
- `components/b2b/IndustryPage.tsx`
- `components/b2b/OCCHub.tsx` (breadcrumb nav)
- `components/blog/ArticlePage.tsx`
- `app/partners/page.tsx` (no breadcrumb needed — it's a top-level directory)
- `app/blog/[handle]/page.tsx` — the existing Shopify article breadcrumb nav

Separator `›` spans get `aria-hidden="true"`. Current page item gets `aria-current="page"`. The `<ol>` keeps all existing Tailwind classes; only semantic structure changes.

---

### 3. Button `type="button"` sweep

Add `type="button"` to every `<button>` that is not a form submit button.

**Files to fix:**
- `components/blog/TableOfContents.tsx` — toggle button
- `components/b2b/PartnerDirectory.tsx` — All/Brands/Vendors filter buttons
- `components/layout/Header.tsx` — search, account, cart, toggle-menu, close-search buttons
- `components/layout/CurrencySwitcher.tsx` — currency toggle and option buttons
- `components/layout/Footer.tsx` — newsletter subscribe button (currently no type)
- `components/category/CategorySort.tsx` — sort dropdown buttons
- `components/category/CategoryFilters.tsx` — filter toggle buttons
- `components/faq/FaqAccordion.tsx` — accordion toggle buttons
- `components/product/ProductView.tsx` (if any submit-free buttons exist there)

Exception: buttons that ARE form submits (newsletter form submit, search form submit) — leave those without `type` or explicitly set `type="submit"`.

---

### 4. Forbidden element fix

**`components/product/ProductView.tsx` line ~196:** Remove `"Low Stock – only {qty} left"` string.

This is fake urgency per §29 (real-time inventory count, fake urgency). The "Out of Stock" / `available: false` badge already handles stock status. The low-stock string is a separate conditional — remove the block.

---

### 5. Focus-visible global styles

**Modify:** `app/globals.css` — add after existing rules:

```css
/* Focus visibility — WCAG 2.4.11 */
:focus-visible {
  outline: 2px solid var(--color-teal-500);
  outline-offset: 2px;
  border-radius: 2px;
}
```

This gives a consistent teal outline on all keyboard-focused elements without overriding existing hover/active states.

---

### 6. Image alt-text fallback fixes

`alt=""` on content images is forbidden — empty alt means "decorative" to screen readers, but product/partner/article images are informative.

**Fix pattern:** `alt={image.altText || fallbackString}`

Files:
- `components/product/ProductGallery.tsx` — `alt={img.altText}` → `alt={img.altText || product.title}`
- `components/product/RelatedProducts.tsx` — verify alt fallback exists
- `components/b2b/FeaturedProductCard.tsx` — `alt={product.title}` is already correct (uses title as alt)
- `components/b2b/PartnerCard.tsx` — `alt={partner.logo.altText}` — add fallback `|| partner.name`
- `components/b2b/PartnerDetail.tsx` (logo) — same pattern
- `components/blog/ArticleCard.tsx` — `alt={article.featuredImage.altText}` — add fallback `|| article.title`

---

## Work Stream 2: Audit Infrastructure

### 7. Lighthouse batch script

**New file:** `scripts/run-lighthouse-audit.sh`

```bash
#!/usr/bin/env bash
# Run Lighthouse mobile audit against all Track B templates on localhost:3000
# Usage: ./scripts/run-lighthouse-audit.sh
# Requires: npx lighthouse (installed via npm), dev server running on :3000

set -e
OUTDIR="audit/lighthouse"
mkdir -p "$OUTDIR"
BASE="http://localhost:3000"

routes=(
  "/"
  "/blog"
  "/blog/types-of-needles"
  "/blog/types-of-sutures"
  "/partners"
  "/partners/dawn-mist"
  "/partners/graham-field"
  "/industries/pharmacy"
  "/industries/dental"
  "/solutions/occ"
  "/products/nitrile-exam-gloves-powder-free"
)

for route in "${routes[@]}"; do
  slug=$(echo "$route" | tr '/' '-' | sed 's/^-//')
  [ -z "$slug" ] && slug="homepage"
  echo "Auditing $BASE$route → $OUTDIR/$slug.json"
  npx lighthouse "$BASE$route" \
    --emulated-form-factor=mobile \
    --throttling-method=simulate \
    --output=json \
    --output-path="$OUTDIR/$slug.json" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet || echo "  ⚠️  Failed: $route"
done

echo "Done. Reports in $OUTDIR/"
```

### 8. Audit report template

**New file:** `audit/AUDIT-REPORT.md`

Pre-filled with all templates. Static analysis columns (H1, skip link, forbidden sweep, breadcrumb ARIA) filled in from code review. Live metric columns (LCP, INP, CLS, Lighthouse) left as `—` for you to fill after running the script.

---

## File Summary

```
New:
  components/a11y/SkipLink.tsx
  scripts/run-lighthouse-audit.sh
  audit/AUDIT-REPORT.md

Modified:
  app/layout.tsx                          # add SkipLink, id="main-content" on children
  app/blog/page.tsx                       # id="main-content" on <main>
  app/blog/[handle]/page.tsx              # id="main-content", breadcrumb aria fix
  app/partners/page.tsx                   # id="main-content" on <main>
  components/b2b/PartnerDetail.tsx        # id, breadcrumb ARIA, button types
  components/b2b/IndustryPage.tsx         # id, breadcrumb ARIA
  components/b2b/OCCHub.tsx               # id, breadcrumb ARIA
  components/blog/ArticlePage.tsx         # id, breadcrumb ARIA
  components/blog/TableOfContents.tsx     # type="button"
  components/b2b/PartnerDirectory.tsx     # type="button" on filter buttons
  components/layout/Header.tsx            # type="button" on icon buttons
  components/layout/CurrencySwitcher.tsx  # type="button"
  components/layout/Footer.tsx            # type="button" on newsletter button
  components/category/CategorySort.tsx    # type="button"
  components/category/CategoryFilters.tsx # type="button"
  components/faq/FaqAccordion.tsx         # type="button"
  components/product/ProductView.tsx      # remove fake urgency string
  components/product/ProductGallery.tsx   # alt fallback
  components/product/RelatedProducts.tsx  # alt fallback check
  components/b2b/PartnerCard.tsx          # alt fallback
  components/b2b/PartnerDetail.tsx        # alt fallback on logo
  components/blog/ArticleCard.tsx         # alt fallback
  app/globals.css                         # :focus-visible rule
```

---

## Out of Scope

- Track A template fixes (breadcrumbs, H1 checks in ShopView, ProductDetail, homepage) — Sardorbek's responsibility, noted in report
- Color contrast measurements — browser-only, noted in report with manual verification instructions
- B3 modal trap — already implemented in B3, noted as verified in report
- Lighthouse scores for Track A routes — data team / Sardorbek
- Third-party script audit
