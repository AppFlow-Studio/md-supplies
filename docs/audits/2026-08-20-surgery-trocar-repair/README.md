# Surgery & Procedure / Trocar repair pass — 2026-08-20

Local repair and verification pass on `catalog-cro-review` after Sardor's PR #64.
**Nothing was committed, pushed, merged, PR'd or deployed.** Visual-regression
baselines are untouched, pending Bilal's approval of the new appearance.

- Branch: `catalog-cro-review`
- Starting HEAD: `50ed163` — ending HEAD: `50ed163` (working tree only)
- Preview: **http://localhost:3100** (fresh `npm run build` + `next start`)

---

## The one defect underneath P0.5, P0.6, P0.2 and P0.3

`lib/category-tree.ts` carried a single registry row:

```ts
{ tag: 'surgery-procedure', displayName: 'Surgery & Procedure',
  collectionHandle: 'trocars-trocar-kits', … }
```

`collectionHandle` is simultaneously **the route slug, the hero artwork key and
the product source**. One field doing three jobs meant one row could only ever
produce one page, so:

- `/category/surgery-procedure` **did not exist** (404).
- `/category/trocars-trocar-kits` served the 41-product Trocar collection under
  the H1, description and breadcrumb **"Surgery & Procedure"**.
- The Categories dropdown compensated with a detached "Trocar Supplies" badge
  pointing at the *same* URL as the Surgery & Procedure tile — one page under
  two names.

The fix splits them: the L1 row points at its own `surgery-procedure`
collection, and Trocars becomes a **featured subcategory** — a new, reusable
registry (`FEATURED_SUBCATEGORIES`) for collection-backed pages that sit under
an L1 parent. It is deliberately *not* a 26th L1: `CATEGORY_TREE_L1` membership
is `category:`-tag-derived and there is no `category:trocars-trocar-kits` tag
(every Trocar product carries `category:surgery-procedure`).

One registry now feeds the route, the nav, the hub strip and the sitemap.

---

## Verified live (production Storefront API, read-only, 2026-08-20)

| | Surgery & Procedure | Trocars & Trocar Kits |
|---|---|---|
| Route | `/category/surgery-procedure` | `/category/trocars-trocar-kits` |
| Source | `surgery-procedure` collection | `trocars-trocar-kits` collection |
| **Products (dynamic)** | **323** | **41** |
| H1 | Surgery & Procedure | Trocars & Trocar Kits |
| Breadcrumb | Home › Surgery & Procedure | Home › Surgery & Procedure › Trocars & Trocar Kits |
| Facet groups | 13 | 10 |

Both totals are read from Shopify at request time. **No count is hardcoded**
anywhere; the tests assert the two routes *disagree*, not that they equal 323
and 41.

Trocar Category values match the reference exactly: Disposable 3.2mm / 3.5mm /
4.5mm, Kit without Trocar, Reusable 3.2mm / 3.5mm / 4.5mm. Brand Name separates
**Trocar Supplies** (32) from **Kadara Medical** (9).

---

## Redirects (measured on the fresh build)

| From | Code | To | Hops | Final |
|---|---|---|---|---|
| `/collections/surgery-procedure` | 301 | `/category/surgery-procedure` | 1 | 200 |
| `/collections/trocars-trocar-kits` | 301 | `/category/trocars-trocar-kits` | 1 | 200 |
| `…?sort=PRICE_ASC` / `?variant=…` | 301 | query preserved | 1 | 200 |
| `/product/aerowalk-…-blue` | 301 | `/product/aerowalk-…` | 1 | 200 |
| `/category/<any-slug>/aerowalk-…-blue` | 301 | `/product/aerowalk-…` | 1 | 200 |
| `/collections/not-a-real-collection` | 404 | — | — | — |

No chains, no loops, no soft 404s. The two collection rules were generalised
into one `LEGACY_COLLECTION_HANDLES` matcher rather than a second hand-copied
if-block. CSP is stamped on every redirect response.

---

## Desktop dropdown layout (Bilal, 2026-08-20 follow-up)

Nesting Trocars under Surgery & Procedure makes that one cell taller than a
plain one, and in a row-major 2-column grid a taller cell mid-list strands the
cell beside it. Two rounds of that:

1. First attempt gave the parent `col-span-2` → it took a full-width row of its
   own and left the cell next to Patient Therapy & Rehab empty: **the blank
   block between Mobility and Hygiene.**
2. Removing the span fixed that one but simply moved the hole down — the taller
   cell then stranded the space **between Patient Therapy & Rehab and Apparel.**

Settled shape, per Bilal: the group that owns a subcategory is ordered **last**
(`primaryDesktopOrder`) and pinned to column 1 (`col-start-1`), so its extra
height lands at the end of the list where nothing follows it. Twelve plain
categories fill six tight rows, then Surgery & Procedure with Trocars beneath it
at the bottom-left.

Also in this pass: `truncate` dropped from both columns (it was clipping
"Housekeeping & Jani…" and "Patient Therapy & Re…" mid-word), panel widened
680 → 800px, and the panel anchored to its trigger (`left-0`) instead of
centred — at 760px centred it already reached within 8px of the viewport's left
edge, so it could not be widened without clipping off-screen.

Guarded by `e2e/surgery-trocar-split.spec.ts`: no `col-span-2` cell, the nested
group is last, no column-1 vertical gap >8px, no clipped labels, and the panel
stays fully on screen at 1300 / 1440 / 1920.

**Mobile is deliberately unchanged** — a single-column drawer has no gap to
create, so it keeps registry order.

## Screenshots

`screenshots/` — regenerate with:

```
CAPTURE_EVIDENCE=1 E2E_BASE_URL=http://localhost:3100 \
  npx playwright test e2e/evidence-capture.spec.ts --project=chromium --workers=1
```

| # | What to look at |
|---|---|
| 01–02 | Categories hub desktop / mobile — 12 cards, Surgery **and** Trocars both present |
| 03–04 | Mega-menu desktop / mobile drawer — Trocars indented under Surgery, no badge |
| 05–06 | Surgery page desktop / mobile |
| 07–08 | Trocar page desktop / mobile |
| 09–10 | **You May Also Need** — card gutters restored |
| 11–13 | Category search before / after query, plus a **close-up proving one X** |
| 14–15 | Trocar filters — desktop rail / mobile drawer |
| 16–17 | Surgery filters — desktop rail / mobile drawer |
| 18–19 | Surgery subcategory strip — Trocars pinned first |

---

## Manual visual-audit checklist

1. **`/categories`** — Popular Categories is 12 cards, three full rows of four.
   Surgery & Procedure and Trocars & Trocar Kits sit side by side. No orphan card
   at 320/375/390/768/1024/1440.
2. **Header → Categories** — "Trocars & Trocar Kits" is indented beneath
   "Surgery & Procedure" behind a rule, and that pair sits at the **bottom of
   the first column** with no gap anywhere above it. No "Trocar Supplies" pill.
   Check the mobile drawer matches. (The Trocar Supplies **brand** logo in the
   homepage marquee is a different thing and should still be there.)
3. **`/category/surgery-procedure`** — H1 and hero read Surgery & Procedure,
   count ≈323, the subcategory strip starts `All Surgery & Procedure` →
   `Trocars & Trocar Kits` → Cherry Sponges → … with Scalpels etc. still present.
4. **`/category/trocars-trocar-kits`** — H1 reads Trocars & Trocar Kits, count 41,
   breadcrumb shows the Surgery parent, filter rail has **no** Type / Sterility /
   Color / Needle Gauge.
5. **Search inside either category** — type a term: exactly one X inside the
   field, and no "Search: …" chip below. The result line still shows the term.
6. **A PDP with "You May Also Need"** — cards are clearly separated with even
   gutters and equal heights.

### Two judgement calls for you

- **Card panel contrast.** `RelatedProductCard` is `bg-neutral-50` (#fafafa) and
  the "You May Also Need" / "Frequently Bought With" sections are `#f9faf9`, so
  the card *panel* edge is invisible — you read the gutter, not a card border.
  That matches "You May Also Like" (the reference row), so I did **not** restyle
  the shared card. Say the word if you want a border/radius on all three rows.
- **Trocar SEO title.** Shopify's own `seo.title` for that collection is
  `Trocars & Trocar Kits - 3.2mm, 3.5mm, 4.5mm - FDA Registered`. The scope is
  now correct, but the **FDA-registration claim is unverifiable from this
  codebase**, so the page uses the registry name and approved description
  instead — in the title, meta description, About block *and* CollectionPage
  JSON-LD. Reversible if you have sign-off on the claim.

---

## Pre-existing issues found, NOT fixed (out of scope)

1. **`/categories` was silently dropping 9 live categories.** It gated the
   Popular strip on a single 250-row `GET_COLLECTIONS` page while the store has
   **695** collections, so needles-syringes, surgical-sutures, respiratory,
   disinfectants, iv-therapy, urology-ostomy, sterilization, pharmacy-products
   *and* surgery-procedure all read as "not live". This one **was** fixed
   (it blocked P0.3) by switching to the paginated `fetchAllCollectionHandles()`
   — the same fix DEV-NAV-01 already applied to the header.
2. **Homepage industry cards fail contrast locally.** `/api/bunny/industries/*`
   returns **404** on this machine, so `ShopByIndustry.tsx` renders white text on
   a near-white panel (measured 1.05:1). Untouched by this pass; needs the
   BunnyCDN industry assets checked.
3. **`e2e/contrast.spec.ts` hardcoded the QA shop's menu title** (`'Catalog'`),
   which does not exist on production. Retargeted to `aria-controls` so it works
   on either shop.
4. **Canonical URLs render the ngrok host locally** because `.env.local` sets
   `NEXT_PUBLIC_SITE_URL` to the tunnel. Correct in production; ignore locally.
