# Category Tree Ticket — QA / Verification Checklist

How to check the "Category Tree — Tag-Derived Registry" ticket yourself, item by
item. Each row names the exact file/command/URL to check and what a pass looks
like. Phase 1 (`docs/superpowers/plans/2026-07-16-category-tree-registry-phase1.md`,
final HEAD `de6add2`) and Phase 2 (`docs/superpowers/plans/2026-07-16-category-tree-registry-phase2.md`,
final HEAD `5cb6c0a`, per `.superpowers/sdd/progress.md`) are both shipped —
every row formerly marked ⏳ is now ✅, re-verified against the current
codebase. Phase 3 (attribute facets) is partially shipped — see the Task 4
findings doc referenced below. Nav wiring (E1,
`docs/superpowers/plans/2026-07-17-nav-wiring-e1.md`) and the sitemap rebuild
(`docs/superpowers/plans/2026-07-17-attribute-subcategory-exclusion-sitemap-rebuild.md`)
are also shipped and close two gaps this checklist's Phase 1 version flagged
(nav/sitemap not yet consuming the registry).

Legend: ✅ shipped & verifiable now · ⏸ Phase 3 / out of this ticket's
front-end scope (partially shipped — see the relevant row).

---

## 1. Tasks checklist

### ✅ "Build the tree as ONE registry/module sourced from category:/subcategory: tags — not the collection list."

Check:
```bash
git log --oneline 46f76df..de6add2   # Phase 1 commit range on sardor-dev
```
Open `lib/category-tree.ts` and confirm:
- No import of `lib/category-nav.ts`'s `ROADMAP_CATEGORIES` or any Shopify collection query for *membership* (a `collectionHandle` field exists on `L1CategoryDef` but is documented as artwork/link-target only, never existence).
- `CATEGORY_TREE_L1`, `buildL1Tiles`, `buildL2Tree` all derive purely from `ProductTagSummary[]` (parsed `category:`/`subcategory:` tags), not from any `collections(...)` GraphQL query.

Run the registry's own tests:
```bash
npx vitest run lib/__tests__/category-tree.test.ts
```
Expect: all passing (18 as of Phase 1; 39 now that Phase 2's registry helpers have landed).

**✅ Now single-source-of-truth for nav/breadcrumbs/sitemap.** Verify:
```bash
grep -rn "buildCategoryNav(\|buildCategoryTreeNav(" app/ components/ --include=*.tsx
```
Expect: all 3 live call sites (`app/categories/page.tsx`, `components/layout/Footer.tsx`,
`components/layout/Header.tsx`) use `buildCategoryTreeNav` (tag-registry-sourced,
added by `docs/superpowers/plans/2026-07-17-nav-wiring-e1.md`) — none use the
old `ROADMAP_CATEGORIES`-based `buildCategoryNav` from `lib/category-nav.ts`
(that function still exists, still tested, but its only remaining caller is
`lib/category-nav-audit.ts`, an offline audit script, not a live page).
`lib/seo/sitemap.ts` imports `CATEGORY_TREE_L1`/`buildL2Tree` from
`@/lib/category-tree` directly (see `grep -n "from '@/lib/category-tree'" lib/seo/sitemap.ts`).
Breadcrumbs are Phase 2 Task 7 — see the "Emit BreadcrumbList" row below.

### ✅ "Rebuild app/categories from that registry — 26 L1 tiles, zero trocar-size/attribute tiles at top level."

Check: `npm run dev`, visit `http://localhost:3000/categories`. Count tiles in
"Browse All Categories" — **expect 25, not 26** (documented, verified
discrepancy; see `lib/category-tree.ts`'s comment above `CATEGORY_TREE_L1` and
the Global Constraints section of the Phase 1 plan). Confirm none of these 4
appear as their own tile: Disposable 3.2mm/3.5mm Trocars, Disposable 4.5mm
Trocars, Reusable 3.2mm/3.5mm Trocars, Reusable 4.5mm Trocars.

Or without a browser:
```bash
curl -s http://localhost:3000/categories | grep -o 'Browse All Categories.*Shop by Industry' | grep -oE '<p class="text-navy-900 text-\[14px\][^<]*>[^<]+' | sed 's/.*>//'
```
(prints the 25 tile labels — sanity check the count and that no trocar-size
label appears).

### ✅ "Match on handle or ID only, never title."

```bash
grep -n "\.title ===" lib/category-tree.ts lib/category-results-source.ts app/categories/page.tsx
grep -n "collection.title" lib/category-tree.ts
```
Expect: no matches (title is only ever used for *display*, e.g.
`col?.description`/tile labels — never compared against to decide identity).
Re-checked across Phase 2's new files
(`app/category/[slug]/[product]/page.tsx`, `lib/category-results-source.ts`) —
no matches there either.

### ✅ "Verify + document whether the stale page renders from the custom 'Categories' collection."

Read the comment block in `app/categories/page.tsx` right above the data
fetch (search for "Verified 2026-07-16"). It documents: the page never read
from the custom "Categories" collection (live handle
`categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays`)
or "Home page" (`frontpage`) — the actual bug was `getAllowedHandles()`
flattening synthesized sub-handles into the grid. Confirm those two handles
still aren't referenced anywhere:
```bash
grep -rn "categories-categories-surgery-procedure\|frontpage" app/ lib/ components/
```
Expect: no matches (aside from unrelated Next.js internals).

### ✅ "Do NOT use publication state as a tree signal."

```bash
grep -n "publishedAt\|published\b\|isPublished" lib/category-tree.ts
```
Expect: no matches — the registry's queries (`GET_ALL_PRODUCT_TAGS`) don't
even fetch a publication field.

### ⏸/✅ "Render the ~114 attribute collections + 80 attribute subcategory: values as facets."

**Tag-side: partially done.** `docs/superpowers/plans/2026-07-17-attribute-facet-audit.md`
wired Dental and IV Therapy's needle-gauge attribute tags to live metafields
(`lib/filter-registry.ts`). Mobility and Needles & Syringes' gauge families were
already wired. Surgical Sutures' gauge and Needles & Syringes' volume family are
flagged for a new Shopify metafield — see
`docs/superpowers/specs/2026-07-17-attribute-facets-audit-findings.md`.

**Collection-side: still ⏸, not started.** The ~114 attribute collections need a
name-pattern classification pass (see the findings doc's last section) before any
wiring — not attempted yet.

Today's baseline behavior (already correct and pre-existing, not something this
ticket broke): `lib/filter-registry.ts`'s `BLOCKED_TAG_PATTERNS` already
hard-blocks raw `category:`/`subcategory:` tag facets everywhere. Confirm that
guard is still intact:
```bash
grep -n "BLOCKED_TAG_PATTERNS" -A 12 lib/filter-registry.ts
```

### ✅ "Boundary values: one shared page per subcategory under one parent, cross-linked from the other. Hardcode the 3 real splits."

**Data/logic layer — ✅ done in Phase 1.** Check:
```bash
npx vitest run lib/__tests__/category-tree.test.ts -t "buildL2Tree"
```
And read `BOUNDARY_L1_OVERRIDES` in `lib/category-tree.ts` — confirm exactly:
```
barrier-sleeves       -> canonical: exam-room,       crossLink: dental
vital-sign-monitors   -> canonical: testing,         crossLink: exam-room
exam-tables           -> canonical: room-furniture,  crossLink: exam-room
```

**Page/route layer — ✅ shipped in Phase 2 Task 6** (`e4b91da`). Verify:
```bash
npm run dev
```
- Visit `http://localhost:3000/category/seating/exam-tables` (canonical URL —
  `seating` is Room Furniture's collection handle). Expect: a real product
  listing page with pagination/filters, plus an "Also relevant to Exam Room"
  callout.
- Visit `http://localhost:3000/category/exam-room/exam-tables` (the
  non-canonical combination). Expect: a 301 redirect to the URL above —
  check with `curl -sI http://localhost:3000/category/exam-room/exam-tables`
  and confirm `HTTP/1.1 301` + `location: /category/seating/exam-tables`.
- Repeat for `barrier-sleeves` (canonical `/category/exam-room/barrier-sleeves`,
  cross-link redirect from `/category/dental/barrier-sleeves`) and
  `vital-sign-monitors` (canonical `/category/testing-screening/vital-sign-monitors`,
  redirect from `/category/exam-room/vital-sign-monitors`).
Confirmed live via `.superpowers/sdd/task8-boundary-page.png` and
`task8-redirect-result.png` (Phase 2 Task 8 QA screenshots).

### ✅ "Dual-category override table."

```bash
grep -n "PRODUCT_CATEGORY_OVERRIDES" -A 10 lib/category-tree.ts
```
Expect exactly:
```
dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs -> mobility
iv-catheter-20g-x-2-box-sr-ox2051ca-3sr-ox2051ca -> iv-therapy
surgical-aspirator-tips-1-4-green -> dental
```
plus a comment explaining the two Universal Mattress Cover products are
intentionally *not* in the table (still single-tagged `category:room-furniture`
live; catalog-team decision on home-care vs. housekeeping-janitorial still
pending — this matches the ticket's own "BLOCKED" note, not a gap in the
implementation).

### ✅ "Place Beds under Room Furniture, not Home Care."

No special-case code needed — confirm with a live tag pull that Beds already
carry `category:room-furniture` (they do; see
`audit/category-tree-audit-report.md`, `room-furniture` row, or re-run):
```bash
NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts
```
and check the `room-furniture` L1 tile count is non-trivial (hundreds).

### ⏸ "Don't render the 4 standalone trocar collections."

Front-end doesn't render them as tiles today (they were never in
`CATEGORY_TREE_L1`). Full closure (unpublishing them in Shopify, merging their
facets onto one Trocars page) is Izzy's parallel Shopify-side track + Phase 3
front-end work — not expected yet.

### ✅ "Exclude from the L1 tree: OCC, Pharmaceuticals, the 68 out-of-tree products."

```bash
grep -n "'occ'\|pharmaceutical" lib/category-tree.ts
```
Expect: no matches in `CATEGORY_TREE_L1` (OCC and "Pharmaceuticals" — distinct
from the already-approved "Pharmacy Products" — have no `category:` tag of
their own live today, so they're naturally excluded by the allowlist). Confirm
in the audit report that `pharmacy-products` (approved) has a real count and
no `occ`/`pharmaceuticals` row exists.

### ✅ "Don't build routes for not-yet-approved collections."

```bash
git diff --stat 46f76df..de6add2
```
Confirm no new `app/` routes were added in Phase 1 beyond the modified
`app/categories/page.tsx` (Phase 1 only touches that one page).

### ✅ "Emit BreadcrumbList from each product's own category:→subcategory: path; not from the cross-linked branch. Emit CollectionPage/ProductCollection on L1 + L2."

**L1 CollectionPage — ✅ already present** (pre-existing, unrelated to this
ticket):
```bash
grep -n "buildCollectionPageSchema" components/category/CategoryPageView.tsx
```

**L2 CollectionPage + breadcrumb re-sourcing — ✅ shipped in Phase 2 Task 7**
(`9937b1f`, dedup fix `d8e296d`). Verify:
1. Find a product tagged both `category:room-furniture` and
   `subcategory:exam-tables` — reuse the live-pull technique:
   ```bash
   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts
   ```
   or query the Storefront API directly for `tag:"subcategory:exam-tables"`.
2. Visit that product's `/product/<handle>` page. Expect the breadcrumb to
   read **"Room Furniture › Exam Tables"** — the canonical branch — even
   though `exam-tables` is cross-linked from Exam Room.
3. Visit `http://localhost:3000/category/seating/exam-tables` and view source
   (`curl -s ... | grep -A 3 '"@type":"CollectionPage"'`) to confirm a
   `CollectionPage` JSON-LD block is present.

---

## 2. Acceptance criteria

| Criterion | Status | How to check |
|---|---|---|
| All-Categories renders 26 L1 from tag backbone, no trocar/attribute tiles | ✅ (25, documented) | See task 2 above |
| No title-based matching anywhere in the derivation | ✅ | `grep` checks above, re-run against Phase 2's new files |
| Attribute collections + 80 attribute subcats render as facets only | ⏸/✅ Phase 3 partial (Dental+IV Therapy wired, rest flagged) | See findings doc |
| Each boundary subcategory = exactly one URL; cross-links resolve; no duplicate-content twins | ✅ Phase 2 shipped | curl/redirect checks above |
| The 5 dual-category products each resolve to one canonical breadcrumb | ✅ Phase 2 shipped | `resolveCanonicalCategory` tests pass; breadcrumb visual check confirmed live (`task8-breadcrumb.png`) |
| Beds under Room Furniture; 4 trocar collections + section-9 items don't render | ✅ Beds / ⏸ trocar unpublish | See tasks above |
| BreadcrumbList follows product's own category: path, verified via cross-linked branch | ✅ Phase 2 shipped | Product breadcrumb check above |
| Counts sanity-checked vs. post-backbone sizes (Exam Room 845, Dental 149) | ✅ verified exactly | `audit/category-tree-audit-report.md`, or re-run the audit script |

---

## 3. Baseline health checks (run these regardless of phase)

```bash
npm run test          # expect 686+ passed; only the 3 pre-existing unrelated
                       # files should fail (app/api/sourcing/__tests__/route.test.ts,
                       # __tests__/route-revalidate.test.ts,
                       # lib/seo/__tests__/route-guardrails.test.ts) — anything
                       # else failing is a real regression
npx tsc --noEmit       # expect clean
npm run build          # expect success, all routes present
```

## 4. Where to look if something seems off

- `lib/category-tree.ts` — the registry itself (L1 allowlist, overrides, L2 nesting, fetch).
- `app/categories/page.tsx` — All-Categories grid consumer.
- `scripts/audit-category-tree.ts` / `audit/category-tree-audit-report.md` — live-data sanity check, re-runnable anytime.
- `docs/superpowers/plans/2026-07-16-category-tree-registry-phase1.md` — Global Constraints section has every hardcoded value with its rationale.
- `docs/superpowers/plans/2026-07-16-category-tree-registry-phase2.md` — the plan for the boundary-page-route and breadcrumb rows above (now shipped); each task's own "Step 5/6" manual-verification instructions double as a re-check for that piece.
- `docs/superpowers/plans/2026-07-17-nav-wiring-e1.md` — nav wiring (Header/Footer/`/categories` Popular strip onto the tag registry).
- `docs/superpowers/plans/2026-07-17-attribute-subcategory-exclusion-sitemap-rebuild.md` — sitemap rebuild onto the tag registry.
- `docs/superpowers/plans/2026-07-17-attribute-facet-audit.md` — Phase 3 attribute-facet work (partial; see `docs/superpowers/specs/2026-07-17-attribute-facets-audit-findings.md`).
- `.superpowers/sdd/progress.md` — full task-by-task review history (what was checked, by whom, and any Minor findings left on record) for Phase 1.
