# Home Page Animations Design

**Date:** 2026-05-30
**Status:** Approved

## Summary

Add Framer Motion animations to all 7 home page sections. Hero content plays a staggered entrance animation on page load. Every section below the hero fades up as it scrolls into view. Purely additive — no existing JSX structure or logic changes.

## Dependency

Install `framer-motion` via npm. No other new dependencies.

## Shared Primitive

**`components/ui/FadeIn.tsx`** — `'use client'` wrapper component.

- Uses `motion.div` with `whileInView` + `viewport={{ once: true }}`
- `initial`: `{ opacity: 0, y: 24 }`
- `animate`/`whileInView`: `{ opacity: 1, y: 0 }`
- Duration: `0.5s`, easing: `easeOut`
- Props: `delay?: number` (default `0`), `className?: string`, `children: React.ReactNode`

Because `whileInView` triggers immediately for elements already in the viewport, this same component handles both the hero entrance (plays on load) and scroll-triggered sections (plays when scrolled into view).

## Animations Per Section

### HeroSection (`components/home/HeroSection.tsx`)

Left column — each element wrapped in `<FadeIn>` with staggered delays:

| Element | Delay |
|---|---|
| Badge | 0s |
| Headline (`h1` block) | 0.1s |
| Description `<p>` | 0.2s |
| CTAs (`div` with two links) | 0.3s |
| OCC Program card | 0.4s |

Right column (product grid) — single `<FadeIn delay={0.2}>` wrapping the whole grid.

### TrustedBrands (`components/home/TrustedBrands.tsx`)

Single `<FadeIn>` wrapping the entire section content (label + brand logos row).

### ShopByIndustry (`components/home/ShopByIndustry.tsx`)

- Heading row: `<FadeIn delay={0}>`
- Industry cards grid: Framer Motion `staggerChildren` pattern
  - Container: `motion.div` with `whileInView`, `variants` → `staggerChildren: 0.08`
  - Each card: `motion.div` with `variants` → `{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }`

### PopularCategories (`components/home/PopularCategories.tsx`)

- Heading row: `<FadeIn delay={0}>`
- 8 category cells: same stagger pattern, `staggerChildren: 0.06`

### PopularProducts (`components/home/PopularProducts.tsx`)

- Heading: `<FadeIn delay={0}>`
- 4 product cards: same stagger pattern, `staggerChildren: 0.08`

### WhyChooseUs (`components/home/WhyChooseUs.tsx`)

- Section heading: `<FadeIn delay={0}>`
- 4 feature cards: same stagger pattern, `staggerChildren: 0.08`

### WholesalePricing (`components/home/WholesalePricing.tsx`)

Single `<FadeIn>` wrapping the section content.

## Stagger Pattern (reused across grids)

```tsx
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

// Usage:
<motion.div
  variants={containerVariants}
  initial="hidden"
  whileInView="show"
  viewport={{ once: true }}
>
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {/* card content */}
    </motion.div>
  ))}
</motion.div>
```

## Architecture Notes

- Server components (HeroSection, ShopByIndustry, etc.) can import and render `FadeIn` (a client component) — this is valid in Next.js App Router. The server component renders the client wrapper; it gets hydrated on the client.
- `TrustedBrands` is already `'use client'` — Framer Motion can be used directly inside it.
- No server component needs to become a client component.
- `viewport={{ once: true }}` — each element animates in exactly once; scrolling back up does not replay the animation.

## Files

| File | Action |
|---|---|
| `package.json` | Add `framer-motion` |
| `components/ui/FadeIn.tsx` | Create |
| `components/home/HeroSection.tsx` | Modify — add FadeIn wrappers |
| `components/home/TrustedBrands.tsx` | Modify — add FadeIn wrapper |
| `components/home/ShopByIndustry.tsx` | Modify — add FadeIn + stagger |
| `components/home/PopularCategories.tsx` | Modify — add FadeIn + stagger |
| `components/home/PopularProducts.tsx` | Modify — add FadeIn + stagger |
| `components/home/WhyChooseUs.tsx` | Modify — add FadeIn + stagger |
| `components/home/WholesalePricing.tsx` | Modify — add FadeIn wrapper |

## Out of Scope

- Animations on any page other than the home page
- Hover micro-interactions (beyond what already exists with Tailwind `transition-` classes)
- Loading/exit animations
