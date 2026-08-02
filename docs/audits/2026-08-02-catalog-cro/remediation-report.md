# Catalog / CRO Remediation — Final Report (2026-08-02)

Branch `fix/catalog-cro-remediation-2026-08-02`
Base `8ce74a5` → Head `88fa5aa` · 72 files, +2381 / −714 · **not pushed, no PR**

Preserved before starting: `backup/pre-clean-fix-completion-2026-07-30` (@ `739125c`),
all three stashes, and 97 untracked audit/evidence files. No `reset --hard`, no `clean`.

## Commits

| SHA | What |
|---|---|
| `aada15b` | Catalog baseline reproduced; RX detection widened to the store's own flag |
| `54b897f` | PR #55 vendor hard-deny ported; vendor-as-brand leak closed |
| `7241bf7` | Logo served locally; CDN auth diagnostics; empty heroes collapse |
| `6c32a98` | Category results update in place (twin route + rewrite removed) |
| `9271460` | SubcategoryNavigator, discovery toolbar, denser headers |
| `057d33f` | OCC copy constant; zero-price items blocked from checkout |
| `88fa5aa` | OCC restructured as a category page; Shopify-native label path |

## PR #55 reconciliation

- **Ported** `5f3f26c` — `filter.p.vendor` hard-denied in `isBlockedFacetId`, VENDOR
  removed from universal/default/search/allowed sets, plus its package-lock
  correction (`npm ci` reproducible again).
- **Rejected** `08b8aea` — CI-trigger only, no functional code.
- **Not needed** — the rest of `pull/55/head` is already in `origin/main`
  (`git log origin/main..upstream/pr-55-head` is empty). Only the two
  post-merge commits on `izzy-qa-shipping-checkout` were outstanding.

The facet deny alone was insufficient: the **rendering** layer still fell back to
`vendor` when `custom.brand_name` was empty, leaking fulfillers (MedPlus,
Medchain) through cards, PDP, the PDP "Vendor" spec row, GA4 `item_brand`,
Product structured data and the meta description. `lib/brand.ts` is now the only
resolver and has **no vendor parameter at all**.

## Catalog baseline — all 12 known values reproduced exactly

13,281 variant rows · 10,326 products · 7,384 active · 10,292 active variants ·
445 gloves · 173 testing · 3,790 brand≠vendor · 41 missing brand · 41 zero-price ·
870 filter values · 1,393 product types. Status split active 7,384 / archived
2,923 / draft 19.

**New findings:**
- **RX indicator mismatch** — `custom.is_rx_only` true on 501 products, RX tag on
  461; the tag set is a strict subset. 40 ACTIVE prescription items (Xylocaine
  w/ Epinephrine, Bupivacaine, Bacteriostatic Water "Physician's License
  Required") had the metafield and no tag, so the gate could not see them.
  Detection now UNIONs both signals — it can only widen the RX set.
- **3,166 duplicate SKU values** across 6,587 rows, every one spanning more than
  one product. SKU is not a unique key.
- **Subcategory density** — 97 exam-room, 72 home-care, 56 hygiene, 51
  needles-syringes, 47 testing. This is what made the old button wall unusable.
- `mf_free_shipping` populated on 217 products; verified the storefront never
  reads it.

The export has **no image columns**, so it cannot support any image claim.

## CDN root cause

Reproduced, not inferred. Every `/api/bunny/*` path 404'd — including objects
that must exist. Probing Bunny Storage directly returned **401 Unauthorized on
every request, including a bare zone listing**: the storage AccessKey is
rejected. The proxy mapped *every* upstream status to a bare 404, so a
store-wide credential failure looked identical to one missing file.

Fixed: logo served from the bundled `public/images/logo.png` (verified 200,
image/png, 66,178 bytes); 401/403 now log an explicit AUTH FAILURE naming the
zone/host and whether a key is configured — **never the key**; heroes collapse
instead of reserving a blank panel. **The credential itself still needs rotating
— that is an Izzy/ops action.**

## Reload root cause

`/category/[slug]` refused `searchParams`, so `proxy.ts` rewrote every query
variant onto a duplicate route at `/category-browse/[slug]`. Clean and filtered
views were therefore **different route segments**, so each interaction crossed a
route boundary and remounted the page. `proxy.ts` already noted the rewrite was
"no longer load-bearing" since the CSP nonce made every route dynamic.

Fixed: one canonical route reading `searchParams`; twin route and rewrite
deleted; shared `CatalogTransition` keeps current results on screen while the
next load; only the grid dims (`aria-busy`); header/hero/nav/toolbar stay
mounted. Verified live — `?sort`, `?q`, `?page` all 200 from the canonical route
with **no `x-middleware-rewrite` header**.

## Verification

| Check | Result |
|---|---|
| `npm test` | **1117 passed / 118 files** |
| `npx tsc --noEmit` | pass |
| `npx eslint --max-warnings 0` | pass, exit 0 |
| `npm run build` | pass, exit 0 |
| `npm ci` | reproducible |
| Secret scan (all 3 CI patterns) | clean |
| `npm audit` | 4 high + 1 moderate — **identical on the baseline lockfile**, so zero introduced; all transitive via `next` (postcss/sharp have no upstream fix) |

**Live route checks:** `/solutions/occ` 200 · `/solutions/occ?q=backpack` → 9
results · `/category/occ` → **301 → /solutions/occ** · `/category/gloves` 200 ·
`/category/testing-screening` 200 with **55 crawlable subcategory `<a>` links** ·
header renders `href="/category/needles-syringes"` · PDP has 0 "In Stock"
occurrences · homepage/about/industries render no unsourced claims.

**Search scoping** (two independent code paths):

| Query | needles-syringes | OCC |
|---|---|---|
| tuberculin | 9 | 0 |
| backpack | 0 | 9 |
| toothbrush | 0 | 9 |

## Not verified

- **Hosted CI** — nothing was pushed, so no hosted run exists.
- **Cross-browser matrix and viewport screenshots** — the browser automation
  hung during capture; rendered-HTML assertions were used instead. Layout
  changes are structural (conditional rendering, class changes), but the
  375/390/768/1024/1280/1440/1920 sweep still needs a human pass.
- **Playwright/axe suites** — not executed in this session.
- OCC count reconciliation, partial-shipment fixture, Fordeer round-trip.

## Remaining decisions

**Client:** unconditional OCC free-shipping wording (`lib/occ-copy.ts` documents
the exact swap); evidence for the suppressed claims (`lib/claims.ts`); the RX
compliance package before `RX_CHECKOUT_ENFORCEMENT` can be enabled.

**Bilal/product:** whether the now-hidden header/account stat bars should stay
hidden; whether `Rx Only` remains display-only.

**Shopify change package (needs approval — no writes were made):**
1. Rotate/replace the BunnyCDN storage AccessKey.
2. Reconcile RX tag vs `custom.is_rx_only` (40 active products).
3. Confirm the canonical OCC collection GID + count; supply the intended
   gifts/toys handle.
4. Create the `product_label` metaobject + `custom.product_labels` metafield
   (steps in `docs/fordeer-replacement.md`).
5. Review 3,166 cross-product duplicate SKUs and 41 zero-price active variants.

## Rollback

`git checkout main`, or reset to `backup/pre-clean-fix-completion-2026-07-30`.
No migrations, no data backfills, no Shopify writes. All new flags default off.
