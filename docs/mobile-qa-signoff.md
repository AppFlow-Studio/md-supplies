# Mobile QA Sign-off — T8

**Reviewer:** Eng (code-level) · **Date:** 2026-06-27 · **Scope:** home, categories, category, subcategory, product, OCC

This is a **code-level** responsive review against a local production build
(`npm run build && npm run start`). All six key templates were checked for layout
structure, tap targets, and hero/image behavior. Items that genuinely require a
physical device / real browser are flagged "needs device check" at the end —
those cannot be signed off from code alone.

## Smoke test (local prod server)

All key routes return HTTP 200, no runtime errors:
`/`, `/categories`, `/category/gloves`, `/category/gloves/[product]`,
`/solutions/occ`, `/product/nitrile-exam-gloves-powder-free`.

## Per-template findings

| Template | Layout | Tap targets | Hero / images | Verdict |
|---|---|---|---|---|
| **Home** (`/`) | Hero `flex-col lg:flex-row` — stacks on mobile; type scales `38→46→55px`. | Primary/secondary CTAs `py-[17px]` (~54px tall). | Hero image `w-full sm:w-105…` scales; product tiles `aspect-square`. | ✅ |
| **Categories** (`/categories`) | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. | Full-card links. | Image fallback present (letter avatar / neutral panel) — no empty gaps. | ✅ |
| **Category** (`/category/[slug]`) | Desktop filter sidebar `hidden lg:block`; mobile uses `FilterDrawer` (`fixed inset-0`, backdrop, `aria-label="Filters"`). Subcategory tabs `flex-wrap`. | Filter trigger `h-[40px]`; tab chips `h-[52px]`. | Hero image `hidden lg:block` on mobile (text-only, no awkward empty header gap); `CategoryImage` 3-tier fallback (BunnyCDN → Shopify → neutral panel). | ✅ |
| **Subcategory** (`/category/[slug]` + subcat tabs / `[product]`) | Same category template + tab nav. | As category. | As category. | ✅ |
| **Product** (`/product/[slug]`) | `flex-col lg:flex-row`; gallery `lg:w-[52%]`; thumbnails `overflow-x-auto scrollbar-hide`. Spec tables `w-full max-w-[600px]` (cell widths are hints — no horizontal overflow). | Qty stepper `h-[56px]`, +/- buttons aria-labeled; Qty + Add-to-cart `flex-wrap sm:flex-nowrap`. | Gallery `aspect-square`; `ProductImage` 3-tier fallback. | ✅ |
| **OCC** (`/solutions/occ`) | `flex-col lg:flex-row`; floating spec card `lg:absolute … max-lg:w-full` (full-width on mobile). | Standard. | Animated hero scales `44→56px`. | ✅ |

## Minor flags (non-blocking)

- **Header hamburger tap target** — `<button aria-label="Toggle menu" className="… p-1">` with a 22px icon ≈ 30px hit area, under the 44×44 px comfort target (still ≥ 24px WCAG 2.2 minimum). Consider bumping to `p-2`. (`components/layout/Header.tsx:325-329`)
- **Variant selector buttons** — `min-w-[167px]`; two-up may be tight on the narrowest (≤360px) phones but wrap rather than overflow. (`components/product/VariantSelector.tsx:67`)

## Needs device check (cannot be signed off from code)

- Real tap accuracy / fat-finger on the header menu and filter chips.
- Hero/product imagery visual quality and crop on actual screens (esp. Retina).
- iOS Safari momentum scroll on the horizontal thumbnail strip and filter drawer.
- Sticky-header behavior + safe-area insets on notched devices.
- Pinch-zoom / text reflow at 200% zoom.

**Code-level verdict:** PASS for all six templates (2 minor non-blocking flags).
Final mobile sign-off pending the device-check list above on representative
iOS + Android hardware.
