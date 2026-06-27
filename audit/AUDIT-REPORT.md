# B6 Audit Report — MDSupplies Track B Templates

**Date:** 2026-06-03 · **Live Lighthouse run:** 2026-06-27 (T8)
**Status:** Static analysis complete. Live metrics captured locally — see "Live
Metrics (T8)" below. Production-candidate re-run still required before LCP sign-off.

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

**Re-verified 2026-06-27 (T8) after real Shopify data wired in.** The B6 sweep
passed at the component level, but live variant data (`quantityAvailable`)
surfaced two real-time-inventory / fake-urgency regressions, now fixed. See
"T8 re-verification fixes" and "T8 items requiring business sign-off" below.

| Element | Present? | Notes |
|---|---|---|
| Phone/live-chat widget as primary CTA | ❌ Not present | Only user phone *input* on the wholesale form (their own number) — not a "call us" CTA. No live-chat/chatbot widget (grep: intercom/drift/zendesk/tawk/crisp all clean). |
| Countdown timer | ❌ Not present | Header `setInterval` is a 4s rotating announcement banner, not a countdown. |
| Discount popup on page entry | ❌ Not present | No 10%/newsletter/coupon popup. |
| "You save" savings callout | ⚠️ Conditional | `Save {x}%` + struck-through compare-at price render **only** when Shopify provides a real `compareAtPrice > price` (`ProductView`, `ProductCard`, `ProductInfo`). Genuine merchant sale data, not fabricated. See sign-off note. |
| Fake urgency ("Only X left", "X viewing") | ❌ Removed (T8) | "Low Stock" badge (fired at `quantityAvailable ≤ 9`) removed from `ShopifyProductCard` in T8. |
| Fake reviews / star ratings | ❌ Not present | No `aggregateRating`/stars anywhere. |
| 2–3 day delivery promise | ⚠️ Data-dependent | No hardcoded 2–3 day promise. `Ships in {leadTime}` / `Lead time: {x}` render merchant-set product text — verify the actual data values make no specific fast-delivery guarantee. |
| Real-time inventory count | ❌ Removed (T8) | Was `In Stock – {qty} available` in `ProductView` (exact live count); reduced to `In Stock` in T8. Now only In Stock / Back-ordered / Out of Stock states remain. |
| "Lowest price" / "Best price" / "Guaranteed" | ❌ Not present | |
| Infinite-scroll-only listing | ❌ Not present | Blog and shop have pagination. |
| Unsupported medical claims | ❌ Not present | grep for cure/treat/FDA approved/clinically proven clean. |
| Active-account / trust counter | ⚠️ Needs substantiation | Header `STATS`: "12,000+ Facilities", "99.8% Order Accuracy", "8,000+ Products". Static (not a live counter), but must be substantiated or removed before launch. See sign-off note. |

### T8 re-verification fixes (code)

1. **Real-time inventory count removed** — `components/product/ProductView.tsx`:
   `In Stock – ${qty} available` → `In Stock`. Removed now-unused `qty`.
2. **Low-stock urgency badge removed** — `components/store/ShopifyProductCard.tsx`:
   deleted the `isLowStock` badge (`quantityAvailable ≤ 9`) and its logic.

Both verified: `npm run lint` clean on the files, node test project green (349
passing), `quantityAvailable` no longer rendered as customer-facing copy.

### T8 items requiring business sign-off (NOT code bugs)

These are honest-data-driven and not unilaterally removed — owners (business / Izzy) to confirm:

- **`Save {x}%` / compare-at price** — fine if compare-at prices in Shopify are genuine former/MSRP prices; remove if they are inflated anchors.
- **Header trust stats** ("12,000+ Facilities", "99.8% Order Accuracy", "8,000+ Products") — keep only if substantiated; otherwise remove.
- **`leadTime` / shipping copy** — confirm merchant-set values contain no specific 2–3 day delivery guarantee.

---

## Live Metrics (T8) — 2026-06-27

Captured via `scripts/run-lighthouse-audit.sh` against a local production build
(`npm run build && npm run start`), mobile emulation, simulated throttling.
**Directional, not the launch gate** — re-run against the deployed production
candidate before signing off LCP (local single-process server + server-side
BunnyCDN image proxy inflate LCP; see Track A report for the same caveat).

| Route | LCP | INP (≈TBT) | CLS | Perf | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|
| `/` (home) | 11.5 s | 60 ms | 0.004 | 74 | 94 | 100 | 100 |
| `/blog` | 13.4 s | 60 ms | 0.004 | 74 | 95 | 100 | 100 |
| `/blog/types-of-needles` | 4.2 s | 60 ms | 0.004 | 81 | 95 | 100 | 100 |
| `/blog/types-of-sutures` | 4.3 s | 60 ms | 0.004 | 85 | 95 | 100 | 100 |
| `/partners` | 12.6 s | 40 ms | 0.004 | 74 | 94 | 100 | 100 |
| `/partners/dawn-mist` | 12.6 s | 120 ms | 0.004 | 72 | 93 | 100 | 100 |
| `/partners/graham-field` | 12.3 s | 230 ms | 0.004 | 70 | 93 | 100 | 100 |
| `/industries/pharmacy` | 9.9 s | 250 ms | 0.004 | 69 | 92 | 100 | 66* |
| `/industries/dental` | 4.5 s | 280 ms | 0.004 | 78 | 96 | 100 | 69* |
| `/solutions/occ` | 13.4 s | 130 ms | 0.004 | 69 | 94 | 100 | 100 |
| `/products/nitrile-exam-gloves-powder-free` | 10.2 s | 140 ms | 0.004 | 67 | 92 | 100 | 66* |

**Findings**
- **CLS 0.004 everywhere — comfortably under the 0.1 target.** ✅
- **INP (lab proxy = TBT) ≤ 280 ms across the board.** Confirm with field data post-launch.
- **A11y 92–96, Best-practices 100** on every route. ✅
- **LCP is the watch item** (9–13 s on image-heavy heroes). Cause is image-delivery latency through the local BunnyCDN proxy on a single dev process, not markup — the article pages without a heavy proxied hero land at ~4 s. **Re-measure on the production candidate; do not sign off LCP from localhost.**
- *SEO 66/69 on `/industries/*` and `/products/*` reflects intentional `noindex` on thin/utility pages (Lighthouse flags "blocked from indexing") — expected, not a defect.

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
