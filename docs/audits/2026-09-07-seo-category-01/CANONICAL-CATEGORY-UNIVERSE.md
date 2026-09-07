# Phase 0 — Canonical category universe

**Ticket:** MDSUPPLIES · SEO-CATEGORY-01
**Prepared:** 2026-09-07
**Branch:** `catalog-cro-review`
**Source of truth used:** current code (`lib/category-tree.ts`, `lib/seo/categorySeo.ts`, `lib/filter-registry.ts`), not a spreadsheet, per the ticket's own instruction.

## Method note on product counts

Two different counts appear below, and they are **not interchangeable**:

- **"Products (2026-07-17, production)"** — from `audit/category-tree-audit-report.md`, a tracked, pre-existing report generated against the real production Storefront API scanning **7,385 products**. This is the right number for catalog-depth judgments.
- Anywhere this document or the companion Trocars brief cites a **live QA-store** number, it is called out explicitly as QA. This branch's `.env.local` points at the QA store (`md-supplies-qa-shipping-and-checkout.myshopify.com`), which carries a much smaller, fixture-scale catalog (1,111 products as of a 2026-09-07 test query) — QA numbers are useful for verifying facet/registry *structure*, never for depth or ranking judgments. See the shop-domain-qa-vs-production distinction noted in prior sessions' project memory.

No GSC/Ahrefs/Keyword Planner pull informs this table — see the companion doc's §"Evidence sources actually available" for what that blocks.

## L1 categories

25 approved `category:` tags currently drive the top-level taxonomy (`CATEGORY_TREE_L1` in `lib/category-tree.ts`). All 25 reconcile to a live Shopify collection (confirmed via `scripts/audit-category-tree.ts`'s frontend↔Shopify reconciliation pass — "Status: OK" for every row checked). Three tags carry `productSet: 'tag'`, meaning the route is a tag-derived proxy in front of a collection whose own title/handle differs from the category's public name (Apparel → `capes-gowns`, Room Furniture → `seating`, Face Masks → `face-coverings`) — these three must never inherit their proxy collection's own Shopify SEO title/description (already enforced in code, see `useRegistryCopy` in `components/category/CategoryPageView.tsx`).

| Tag (route slug) | Display name | Shopify object | Nav group | Products (2026-07-17, production) | `categorySeo.ts` status | Priority |
|---|---|---|---|---:|---|---|
| exam-room | Exam Room | exam-room | primary | 845 | none | — |
| wound-care | Wound Care | wound-care | primary | 723 | **complete** | P0 |
| mobility | Mobility | mobility | primary | 638 | **complete** | P0 |
| needles-syringes | Needles & Syringes | needles-syringes | primary | 592 | **complete** | P1 |
| room-furniture | Room Furniture | seating (tag-proxy) | more | 512 | none | — |
| gloves | Gloves | gloves | primary | 445 | **complete** | P0 |
| home-care | Home Care | home-care | more | 422 | none | — |
| respiratory | Respiratory | respiratory | primary | 407 | none | — |
| emergency-supplies | Emergency Supplies | emergency-supplies | more | 355 | none | — |
| surgery-procedure | Surgery & Procedure | surgery-procedure | primary | 319 | none (currently inherits Shopify's own uncontrolled `seo.title`/description) | — |
| patient-therapy-rehab | Patient Therapy & Rehab | patient-therapy-rehab | primary | 299 | none | — |
| bariatric | Bariatric | bariatric | more | 258 | none | — |
| hygiene | Hygiene | hygiene | primary | 256 | none | — |
| surgical-sutures | Surgical Sutures | surgical-sutures | primary | 192 | **complete** | P0 |
| testing | Testing | testing-screening | primary | 173 | none | — |
| apparel | Apparel | capes-gowns (tag-proxy) | primary | 152 | none | — |
| dental | Dental | dental | more | 149 | none | — |
| incontinence | Incontinence | incontinence | more | 114 | none | — |
| pharmacy-products | Pharmacy Products | pharmacy-products | more | 101 | **complete** | P1 |
| housekeeping-janitorial | Housekeeping & Janitorial | housekeeping-janitorial | more | 85 | none | — |
| iv-therapy | IV Therapy | iv-therapy | more | 78 | none | — |
| urology-ostomy | Urology & Ostomy | urology-ostomy | more | 52 | none | — |
| sterilization | Sterilization | sterilization | more | 51 | none | — |
| face-masks | Face Masks | face-coverings (tag-proxy) | more | 35 | **complete** | P1 |
| disinfectants | Disinfectants | disinfectants | primary | 31 | none | — |

**9 of 25 L1 categories already have researched, approved on-page SEO** (title/meta/H1/answer block/FAQ in `lib/seo/categorySeo.ts`, `ahrefsResearchDate: 2026-06-29`). The other 16 currently render whatever Shopify's own collection `seo.title`/`description` fields carry (uncontrolled merchandising copy — see the `surgery-procedure` row above for a concrete, live example of what that means: no controlled title/meta at all today).

## Featured subcategory (collection-backed page under an L1, not a 26th L1)

| Slug | Display name | Parent | `categorySeo.ts` status | Priority |
|---|---|---|---|---|
| trocars-trocar-kits | Trocars & Trocar Kits | surgery-procedure | **complete — added this session** | **P0 (mandatory Tier-1)** |

This is the only `FEATURED_SUBCATEGORIES` entry that exists today (`lib/category-tree.ts`). It has its own route, hero, breadcrumb and facets, deliberately not promoted to a 26th L1 tag (there is no `category:trocars-trocar-kits` product tag — every Trocar product carries `category:surgery-procedure`). See the companion Trocars Tier-1 brief for the full research behind its new `categorySeo.ts` entry.

## Approved subcategory (L2) pages with their own on-page SEO

| Combined handle | Route | `categorySeo.ts` status |
|---|---|---|
| surgical-sutures-absorbable-sutures | /category/surgical-sutures/absorbable-sutures | complete |
| pharmacy-products-pharmacy-labels | /category/pharmacy-products/pharmacy-labels | complete |

229 other routable L2 subcategory tags exist across the 25 L1s (per `scripts/audit-category-tree.ts`'s live reconciliation) but have no dedicated `categorySeo.ts` entry — out of scope for this pass; flagging only because a future opportunity-model iteration should decide whether any L2 page (beyond Trocars) deserves the same treatment.

## Excluded from the opportunity model, per the ticket's own exclusion rules

- **Catalog noise tags** (`daily-living-aids`, `non-healthcare`, `non-medical`, `office-supplies`) — live product-tag values that exist in Shopify but are not in the approved L1 allowlist. Not real SEO landing pages; excluded.
- **`/solutions/occ`** — has its own, separately completed research pass (`docs/audits/2026-09-06-occ-seo-strategy/OCC-SEO-STRATEGY.md`, SEO-OCC-01). Not duplicated here.
- **Legacy `/collections/<handle>` URLs** — 301 to the canonical `/category/<slug>` in `proxy.ts`; not separate pages, not separate opportunities. (Note: the redirect is real in code but not live in production — see "site-wide blocker" below.)
- **Filtered/sorted/searched/paginated states of any category** — `noindex` by design (`isFiltered` branch in `buildCategoryMetadata`); correctly excluded from keyword-to-URL mapping.

## Site-wide fact that constrains every recommendation in this workstream

Per `docs/audits/2026-08-seo-remediation/STATUS-REPORT-2026-08-27.md`, production (`www.mdsupplies.com`) is currently serving `noindex,nofollow` sitewide with `robots.txt: Disallow: /`, and roughly 201 commits on this branch (including all prior P0/P1 SEO remediation and this ticket's own Trocars fix) are unmerged/undeployed. Nothing in this document or the Trocars brief will move rankings until that infra fix ships — see the companion brief's "Read this first" note for the same caveat applied specifically to Trocars.
