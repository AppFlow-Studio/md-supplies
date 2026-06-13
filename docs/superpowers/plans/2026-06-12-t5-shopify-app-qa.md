# T5 · Shopify App QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit each Shopify app for headless-frontend conflicts, fix hardcoded fake product data (review count, rating, free-shipping badge), and produce the two required deliverables: a per-app QA table and a post-launch removal flag list.

**Architecture:** Two code-fix tasks address confirmed bugs found in the pre-plan audit. Everything else is documented in the QA table (manual testing required at runtime — noted inline). No new abstractions introduced; changes are surgical edits to two existing files.

**Tech Stack:** Next.js 16 App Router, TypeScript, Shopify Storefront API (`tags: string[]` on Product), Vitest.

---

## Pre-plan audit findings (already confirmed from code)

| App | Finding | Severity | Action |
|-----|---------|----------|--------|
| Fordeer Product Labels | `rating: 4.8` and `reviewCount: 127` hardcoded in `toProductDetailData()` — rendered in star rating + review tabs in `ProductDetail` | **Critical** | Fix in Task 1 |
| Fordeer Product Labels | `freeShipping: false` hardcoded in `toProductDetailData()` — badge never shows even for tagged products | **High** | Fix in Task 1 |
| Fordeer Product Labels | `hasFreeShipping` in `ProductCardData` never mapped from Shopify tags in any `toCardData()` function | **High** | Fix in Task 2 |
| Messaging widget | `layout.tsx` has zero external scripts — widget not injected in frontend | ✅ Pass | Document in QA table |
| Search & Discovery | `app/api/search/predictive/route.ts` uses Storefront API `predictiveSearch`, self-contained, no double-handling | ✅ Pass | Document in QA table |
| TrustShop Reviews | No review widget components found in app code | ✅ Pass (needs runtime check) | Document in QA table |
| Sitemap NoIndex Pro | T2 owns `app/sitemap.ts` and `app/robots.ts` — headless frontend serves both | ✅ Pass | Flag for post-launch removal |

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `app/shop/[slug]/page.tsx` | Modify (lines 69–94) | `toProductDetailData`: fix hardcoded `rating`, `reviewCount`, `freeShipping` |
| `components/shop/ProductDetail.tsx` | Modify | Conditionally render star rating + review count (guard on `reviewCount > 0`) |
| `components/store/ShopifyQuickAddButton.tsx` | Modify | Map `hasFreeShipping` from `tags.includes('free-shipping')` in `toCardData` |
| `docs/t5-qa-table.md` | Create | Per-app QA pass/fail table (deliverable 1) |
| `docs/t5-post-launch-removal.md` | Create | Post-launch app-removal flag list (deliverable 2) |

---

### Task 1: Fix hardcoded fake review data + free-shipping in `toProductDetailData`

**Files:**
- Modify: `app/shop/[slug]/page.tsx` (function `toProductDetailData`, lines 69–94)
- Modify: `components/shop/ProductDetail.tsx` (star rating + review count rendering)

#### Background

`toProductDetailData` in `app/shop/[slug]/page.tsx` maps a live Shopify `Product` into `ProductDetailData`. It currently hardcodes:
- `rating: 4.8` — fake star rating displayed to users
- `reviewCount: 127` — fake review count displayed in three places in `ProductDetail`
- `freeShipping: false` — free-shipping badge never shows

`product.tags` is already fetched by `GET_PRODUCT` and is `string[]` on the `Product` type. The free-shipping fix is `p.tags.includes('free-shipping')`. For rating/reviewCount, `ProductDetailData` defines them as `number` (not optional), so we zero them out AND guard the render.

#### Step-by-step

- [ ] **Step 1: Fix `toProductDetailData` in `app/shop/[slug]/page.tsx`**

Find this block (around lines 69–94):
```typescript
  return {
    id: 0,
    slug: p.handle,
    brand: p.brandName ?? p.vendor,
    sku: firstVariant?.id.split('/').pop() ?? p.handle,
    name: p.title,
    rating: 4.8,
    reviewCount: 127,
    inStock: p.availableForSale,
    freeShipping: false,
```

Replace with:
```typescript
  return {
    id: 0,
    slug: p.handle,
    brand: p.brandName ?? p.vendor,
    sku: firstVariant?.id.split('/').pop() ?? p.handle,
    name: p.title,
    rating: 0,
    reviewCount: 0,
    inStock: p.availableForSale,
    freeShipping: p.tags.includes('free-shipping'),
```

- [ ] **Step 2: Guard star rating + review count in `components/shop/ProductDetail.tsx`**

Read the file first, then apply two changes:

**Change A** — the inline star rating + review count block. Find the section that renders rating and reviewCount unconditionally (look for `{product.rating}` and `{product.reviewCount} reviews`). Wrap each in a `{product.reviewCount > 0 && (...)}` guard.

Concretely, find the pattern:
```tsx
<span className="text-navy-900 text-[48px] font-bold leading-none">{product.rating}</span>
```
and the adjacent review count span. Wrap the entire rating+reviews block:
```tsx
{product.reviewCount > 0 && (
  <div>
    {/* existing star rating + review count content */}
  </div>
)}
```

**Change B** — the "Brand + rating" section and "REVIEWS (N)" tab label. Apply the same guard:
```tsx
{product.reviewCount > 0 && (
  <>
    <StarRating rating={product.rating} />
    <span>...{product.rating} ({product.reviewCount} Reviews)</span>
  </>
)}
```

For the tab label `REVIEWS (${product.reviewCount})`, change to:
```tsx
{tab === "REVIEWS" ? `REVIEWS${product.reviewCount > 0 ? ` (${product.reviewCount})` : ''}` : tab}
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Expected: zero errors related to the changed files.

- [ ] **Step 4: Run tests for regressions**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: same pass count as before.

---

### Task 2: Map `hasFreeShipping` from product tags in `ShopifyQuickAddButton.toCardData`

**Files:**
- Modify: `components/store/ShopifyQuickAddButton.tsx` (function `toCardData`)

#### Background

`components/store/ShopifyQuickAddButton.tsx` contains a `toCardData(product: CollectionProduct)` function that maps Shopify collection product data to `ProductCardData`. The `hasFreeShipping` field is never set, so the Free Shipping badge in `ProductBadges` never appears.

`CollectionProduct` already has `tags: string[]` from the Shopify query (check `lib/shopify/types.ts` line 230). The fix: add `hasFreeShipping: product.tags.includes('free-shipping')` to the returned object.

- [ ] **Step 1: Read `components/store/ShopifyQuickAddButton.tsx`**

Locate the `toCardData` function. Confirm `product.tags` exists on the input type (it's `CollectionProduct` which has `tags: string[]`).

- [ ] **Step 2: Add `hasFreeShipping` mapping**

In the return object of `toCardData`, add:
```typescript
hasFreeShipping: product.tags.includes('free-shipping'),
```

- [ ] **Step 3: Check `components/product/ProductCard.tsx` — same fix if needed**

Read `components/product/ProductCard.tsx`. If it also has a `toCardData`-style mapper that omits `hasFreeShipping`, apply the same fix.

- [ ] **Step 4: TypeScript check + test run**

```bash
npx tsc --noEmit 2>&1 | grep error | head -10
npx vitest run 2>&1 | tail -10
```

Expected: zero errors, same pass count.

---

### Task 3: Produce QA deliverables

**Files:**
- Create: `docs/t5-qa-table.md`
- Create: `docs/t5-post-launch-removal.md`

This task is documentation only — no code changes.

- [ ] **Step 1: Create `docs/t5-qa-table.md`**

```markdown
# T5 · Shopify App QA — Pass/Fail Table

Last updated: 2026-06-12
Tester: (fill in)

| App | Check | Result | Notes |
|-----|-------|--------|-------|
| **Meteor Mega Menu** | `main-menu` has 26 approved categories | MANUAL | Check Shopify admin → Navigation |
| **Meteor Mega Menu** | No item points at a removed/renamed collection (e.g. `brands/*`) | MANUAL | Look for any `brands` URLs in menu items |
| **Meteor Mega Menu** | Menu renders correctly on frontend | MANUAL | Visit homepage, open nav |
| **Fordeer Product Labels** | Star rating + review count NOT shown when reviewCount = 0 (code fix Task 1) | ✅ FIXED | Guarded with `reviewCount > 0` |
| **Fordeer Product Labels** | Free Shipping badge shows only when product has `free-shipping` tag (Task 1 + 2) | ✅ FIXED | Mapped from `product.tags.includes('free-shipping')` |
| **Fordeer Product Labels** | RX label renders only when RX condition exists | MANUAL | Test on an RX product page |
| **Fordeer Product Labels** | Backorder/leadTime badge driven by live data | ✅ PASS | `leadTime` prop comes from Shopify metafield |
| **Fordeer Product Labels** | `customBadge1/2/3` metafields render when set | MANUAL | Load a product with custom badges set in Shopify admin |
| **TrustShop Reviews** | No external review script in `layout.tsx` | ✅ PASS | Confirmed: zero external scripts in root layout |
| **TrustShop Reviews** | No `aggregateRating` schema injected by app | MANUAL | Check page source / DevTools for `aggregateRating` JSON-LD |
| **TrustShop Reviews** | Review widget does not break layout | MANUAL | Visit PDP, check for layout shift |
| **Shopify Forms** | Contact form submits successfully (success state shows) | MANUAL | `/contact` — fill and submit |
| **Shopify Forms** | B2B form submits successfully | MANUAL | `/b2b` — fill and submit |
| **Shopify Forms** | General inquiry form submits successfully | MANUAL | Find general inquiry embed location |
| **Shopify Forms** | Error/validation state is clean | MANUAL | Submit with empty required fields |
| **Upload-Lift RX** | RX upload flow works on RX product path | MANUAL | Find an RX product, test upload |
| **Upload-Lift RX** | Non-RX product paths unblocked by Upload-Lift | MANUAL | Visit standard product, confirm no upload prompt |
| **Search & Discovery** | No conflict with `app/api/search/predictive/route.ts` | ✅ PASS | Route uses Storefront API directly, self-contained |
| **Search & Discovery** | No duplicate results in predictive search | MANUAL | Type in search bar, verify result count is reasonable |
| **Search & Discovery** | Category filters work without double-handling | MANUAL | Apply a filter on a category page |
| **Sitemap NoIndex Pro** | T2 owns robots.txt (`/robots.txt` served by Next.js) | ✅ PASS | `app/robots.ts` exists and is authoritative |
| **Sitemap NoIndex Pro** | T2 owns sitemap.xml (`/sitemap.xml` served by Next.js) | ✅ PASS | `app/sitemap.ts` exists and is authoritative |
| **Sitemap NoIndex Pro** | App does not override/conflict with Next.js sitemap | MANUAL | `curl -sI https://<domain>/sitemap.xml` — confirm Next.js serves it |
| **Messaging widget** | No chat/messaging script in `layout.tsx` | ✅ PASS | Zero external scripts confirmed in root layout |
| **Messaging widget** | No widget visible on storefront | MANUAL | Visit homepage in browser, confirm no chat bubble |
```

- [ ] **Step 2: Create `docs/t5-post-launch-removal.md`**

```markdown
# T5 · Post-Launch App Removal Flag List

Apps flagged for removal after launch. Do NOT remove before launch unless the app
actively breaks the build or blocks checkout/compliance.

| Priority | App | Reason to remove | Replacement | Remove after |
|----------|-----|-----------------|-------------|-------------|
| P1 | **Sitemap NoIndex Pro** | T2 (Next.js) is now the authoritative sitemap/robots owner. The app's output is redundant and could produce duplicate or conflicting sitemap entries if it intercepts the headless domain. | T2 sitemap already in place | DNS cutover confirmed + 2 weeks stable |
| P2 | **Fordeer Product Labels** | Headless frontend renders its own `ProductBadges` from live Shopify tags/metafields (Task 1 + 2 fixes). Fordeer's theme-injection approach has no effect on the headless frontend. | `ProductBadges` component (already in place) | After confirming all badge types render correctly from tags |
| P3 | **Meteor Mega Menu** | Menu is fetched live via `GET_MENU` → `main-menu` handle. Meteor's visual editor is useful for content team but the app itself adds no runtime value to the headless frontend. | Manage menu directly in Shopify Navigation | After content team confirms they can manage menu without the app's UI |
| — | **TrustShop Reviews** | Keep — provides social proof if reviews exist. Remove only if it injects `aggregateRating` schema (verified MANUAL above). | N/A | Only if schema conflict confirmed |
| — | **Shopify Forms** | Keep — no native headless replacement. Forms are P0 for B2B + contact. | N/A | Never (or until custom form infra built) |
| — | **Upload-Lift RX** | Keep — required for RX/prescription compliance flow. | N/A | Never (or until RX compliance is restructured) |
| — | **Search & Discovery** | Keep — powers Storefront API `predictiveSearch`. Removing it breaks the search API. | N/A | Never |
| — | **Messaging widget** | Already effectively invisible on headless frontend (no script in layout). Remove from Shopify admin to clean up the app list. | N/A | Any time |
```

- [ ] **Step 3: Verify files exist and are readable**

```bash
cat /Users/munistursunov/Projects/APPFLOW_STUDIO/md-supplies/docs/t5-qa-table.md | wc -l
cat /Users/munistursunov/Projects/APPFLOW_STUDIO/md-supplies/docs/t5-post-launch-removal.md | wc -l
```

Expected: both files have content (non-zero line count).

---

## Manual QA checklist (human-required, not automatable from code)

After the three code tasks are done, the tester should:

1. **Menu** — Open Shopify admin → Online Store → Navigation → `main-menu`. Confirm 26 approved category handles. Flag any item pointing at `brands/*`, `brands`, or any removed collection.

2. **Forms** — Visit `/contact` and `/b2b` in browser. Submit each form with valid data → confirm success state. Submit with empty required fields → confirm error state is clean.

3. **TrustShop** — Visit a PDP in browser. Right-click → View Page Source → search for `aggregateRating`. Should find zero instances (our `ProductSchema` emits none, and TrustShop shouldn't inject any).

4. **Labels** — Find a product in Shopify admin with the `free-shipping` tag. Load its `/product/<handle>` page. Confirm the Free Shipping badge appears.

5. **Messaging widget** — Visit homepage in browser with no ad-blocker. Confirm no chat bubble/widget is visible in any corner of the screen.

Fill results into `docs/t5-qa-table.md` MANUAL rows.

---

## Self-Review

### Spec coverage

| T5 spec task | Covered by |
|---|---|
| Meteor Mega Menu — confirm menu matches 26-category structure | Task 3 (QA table MANUAL row) + manual checklist step 1 |
| Fordeer Labels — no fake/hardcoded badges, live source | Task 1 (fix) + Task 2 (fix) + Task 3 (QA table) |
| TrustShop — no aggregateRating schema injection | Task 3 (QA table MANUAL row) + manual checklist step 3 |
| Shopify Forms — end-to-end submit | Task 3 (QA table MANUAL rows) + manual checklist step 2 |
| Upload-Lift RX flow | Task 3 (QA table MANUAL rows) |
| Search & Discovery — no conflict | Pre-plan audit ✅ + Task 3 (QA table) |
| Sitemap NoIndex Pro — flag for removal | Task 3 (removal flag list — P1) |
| Messaging widget — not publicly visible | Pre-plan audit ✅ + Task 3 (QA table) |
| Deliverable: per-app QA table | Task 3 |
| Deliverable: post-launch removal flag list | Task 3 |

### Placeholder scan

- MANUAL rows in QA table are intentional — they require a running browser + Shopify admin access, not code.
- All code steps have exact file paths, exact code snippets, exact commands.

### Type consistency

- `ProductDetailData.rating` and `reviewCount` remain `number` (not made optional) — just set to 0 and guarded at render time. No type change needed.
- `hasFreeShipping: product.tags.includes('free-shipping')` returns `boolean`, matches `ProductCardData.hasFreeShipping?: boolean`.
