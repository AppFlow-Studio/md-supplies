# Final pre-launch QA pass — evidence doc — 2026-08-19

**Prepared by:** Sardor (dev) · **For:** Bilal (approval) / Izzy (production mirror)
**Scope:** Task 12 of `docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md` — the
final joint-acceptance QA pass across all 14 tasks of Bilal's 2026-08-18/19 pre-launch scope.
Read-only verification against the QA Storefront API only; no Shopify writes made anywhere in
this pass. **This doc does not authorize push/PR/deploy** — per the plan's Global Constraints
and this task's own Step 4, that remains gated on the user's explicit go-ahead after reviewing
this doc.

**Headline: one real regression found and NOT yet fixed** — Task 13's new "Trocar Supplies" nav
quick-link fails WCAG AA contrast sitewide (§3.1). Recommend fixing before launch. Everything
else in the automated gate is green or explainable; see §2 for the full breakdown.

---

## 1. Automated gate — exact results

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **145 files / 1508 tests passed**, 0 failed |
| Type check | `npx tsc --noEmit` | **clean**, 0 errors |
| Lint | `npx eslint .` | **0 errors / 0 warnings on tracked code.** 2 errors reported are in `qa-sweep.js`, which is `.gitignore`d and untracked (pre-existing, unrelated to this branch — confirmed via `git ls-files` returning nothing and `git check-ignore -v` matching `.gitignore:61`). 1 pre-existing warning (`e2e/320px-overflow.spec.ts:1` — unused `expect` import, introduced in Task 9's commit `325120a`, harmless, not addressed) |
| Production build | `npm run build` | **exit 0, 67/67 pages** (1 informational Turbopack warning about `next.config.ts`'s file-tracing scope — pre-existing, not a build error) |
| E2E (Playwright) | `npx playwright test` | **488 passed / 40 failed / 44 skipped** of 572 total, across chromium + mobile-chromium — see §2 for the full breakdown of all 40 failures, none of which are unexplained |

### 1.1 Methodology note — a stale-server trap caught and corrected (same class DEV-LAUNCH-13 documented)

The first `npm run test:e2e` invocation reused a **pre-existing `next dev` process on port 3000**
that had been running since 16:04 that day (`playwright.config.ts`'s `reuseExistingServer: true`
locally) instead of building fresh, exactly the trap `docs/launch/DEV-LAUNCH-13-verification.md`
documented previously. That process was not started by this session and was left untouched (not
killed) — instead, this pass built fresh (`npm run build`, 67/67 pages) and started an
independent server on **port 3001**, then ran the full suite with `E2E_BASE_URL=http://localhost:3001`.
The invalid first run was discarded entirely; **all 40 failures reported below are from the
clean, fresh-build, port-3001 run.** One concrete proof this mattered: `csp.spec.ts`'s
"enforcing CSP keeps strict-dynamic" test failed against the stale dev server (dev-mode CSP
differs from production) and passed cleanly against the fresh production build — a dev-mode
artifact, not a real defect, caught only because of the rebuild.

---

## 2. E2E failure breakdown — all 40 failures accounted for, none unexplained

| Spec | Failures | Root cause | Status |
|---|---|---|---|
| `contrast.spec.ts` | 20 (10 unique × 2 projects) | **Real, newly-introduced regression** — Task 13's "Trocar Supplies" nav badge. See §3.1. | **Not fixed — flagged for a follow-up task** |
| `aerowalk-variant-pilot.spec.ts` | 8 (4 unique × 2 projects, `/category/mobility/<handle>` route only) | **Real gap** — the legacy AeroWalk "-blue" handle redirect (Task 10) only covers the `/product/<handle>` route, not `/category/<slug>/<handle>`. See §3.2. | **Not fixed — flagged for a follow-up task** |
| `categories-hub-integration.spec.ts` | 2 (1 unique × 2 projects) | **Flake**, confirmed by isolated re-run: `npx playwright test e2e/categories-hub-integration.spec.ts --project=chromium --workers=1` → **11/11 passed**, including the exact test that failed under 4-worker load. A direct `curl` of the specific URL the test timed out on (`/category/bariatric`) returned `200` in 44ms. Root cause: 4 workers × 2 projects hammering one local server concurrently. | No action needed |
| `visual.spec.ts` | 10 (home/category/pdp/occ/blog/categories-hub baselines, both projects) | **Stale snapshot baselines** — expected, given 14 tasks' worth of real UI changes since these `.png` baselines were captured (including Task 13's new badge and Task 9's overflow-fix reflow — e.g. the blog baseline mismatch is a real height change, 8262px → 7252px). This is an opt-in visual-regression gate, not a functional-correctness gate. | **Needs a deliberate `--update-snapshots` pass with human review of each diff** — not done in this task, since blindly re-baselining would also silently accept the Trocar Supplies contrast bug's visual footprint into the new baseline |

**No failure in this run is unexplained.** Every one of the 40 traces to a specific, confirmed
cause: one real accessibility regression, one real redirect-coverage gap, one load-induced flake
(disproven by isolation), and expected snapshot staleness.

---

## 3. New findings from this pass (not previously known to the plan)

### 3.1 REGRESSION: Task 13's "Trocar Supplies" nav badge fails WCAG AA contrast sitewide

`components/layout/Header.tsx` lines 318 and 547 (desktop mega-menu instance and mobile drawer
instance of the new quick-link) both use `text-teal-600 bg-teal-50`, which this theme resolves
to `fg=rgb(0,150,137)` on `bg=rgb(240,253,250)` — measured **3.52:1**, WCAG AA requires **4.5:1**
for 12px/text-xs text. Because `Header.tsx` renders on every page, this fails
`e2e/contrast.spec.ts` on **every route the spec checks** (home, 3 PDP fixture states, contact,
account, cart, industries index, article, and the error boundary) — confirmed by reading the
actual violation array in the Playwright error output on multiple independent routes (home and
cart both report identically):

```
3.52:1 (needs 4.5) 12px fg=rgb(0,150,137) bg=rgb(240,253,250) "Trocar Supplies"
  .mt-2 inline-flex items-center gap-1 text-[12px] font-semibold...   (desktop instance)
3.52:1 (needs 4.5) 12px fg=rgb(0,150,137) bg=rgb(240,253,250) "Trocar Supplies"
  .inline-flex w-fit items-center gap-1 mt-1 mb-1 text-xs font-...    (mobile instance)
```

This is **not** the previously-documented, user-accepted `ShopByIndustry` scrim contrast bug
(`DEV-LAUNCH-11-verification.md`) — that finding is about the homepage's industry cards
specifically and was not observed anywhere in this run's violation output. This is a distinct,
new defect, introduced by Task 13, on a component the reviewer marked "review clean." **Not
fixed in this pass** (Task 12 is verification/evidence only, no code changes authorized without
a separate go-ahead) — recommend a quick follow-up: darken the badge text (e.g. `text-teal-700`
or a `bg-teal-100` pairing) and re-run `contrast.spec.ts` before launch.

### 3.2 GAP: AeroWalk legacy "-blue" handle redirect doesn't cover the `/category/<slug>/<handle>` route

Task 10 added a redirect for `/product/aerowalk-ultra-lite-rollator-rolling-walker-blue` →
`/product/aerowalk-ultra-lite-rollator-rolling-walker` (`proxy.ts:141`), confirmed live and
correct via direct `curl` (`301` → correct destination). But `proxy.ts`'s redirect table matches
on literal paths, so the same stale handle under the **other** live PDP route
(`app/category/[slug]/[product]/page.tsx`, which the plan's own architecture doc says "renders
identically" to `/product/[slug]`) is **not** covered:

```
curl -I http://localhost:3001/category/mobility/aerowalk-ultra-lite-rollator-rolling-walker-blue
→ HTTP/1.1 200 OK   (no redirect — but renders the app's own "Page Not Found" content)
```

Confirmed via direct HTML inspection: the response is a soft-404 (status 200, "Page Not Found"
body), not a real redirect or a hard 404. Anyone with the old category-scoped URL bookmarked or
indexed (plausible, since both PDP routes are live and crawlable) hits a dead end. This is a
real, previously-undetected gap in Task 10/11's redirect coverage. **Not fixed in this pass** —
recommend adding the `/category/mobility/aerowalk-ultra-lite-rollator-rolling-walker-blue` →
`/category/mobility/aerowalk-ultra-lite-rollator-rolling-walker` mapping (or a path-pattern rule
covering both route prefixes for every legacy product-handle redirect) as a follow-up.

### 3.3 The Trocar landing page shows neither 41 nor even a stable number in this QA store — architecture mismatch, not a bug

Bilal's ask (Task 12 brief Step 2) was "confirm exactly 41 products render, cross-check against
`TROCAR-REGISTRY-41-PRODUCTS.csv`." This could not be confirmed as literally stated, for a
structural reason found during this pass, independent of any QA-data gap:

- **The live "Surgery & Procedure" nav destination (`/category/trocars-trocar-kits`) does not
  source its products from the named `trocars-trocar-kits` collection at all.**
  `lib/category-tree.ts:96` sets `productSet: 'tag'` for this exact entry, with a code comment
  (lines 71-78) recording a **production** measurement: the `surgery-procedure` tag matched
  **319** products vs. the named collection's **41** — a 278-product gap that predates this
  plan entirely (this is Phase 2 architecture from an earlier ticket, not something Tasks 1-14
  touched or were asked to touch).
- **Live in this QA store**, the page shows "Showing 20 products of 25" by default (25 total,
  tag-sourced) — not 41, not the 40 the raw `collection(handle: "trocars-trocar-kits")` object
  reports when queried directly, and nowhere close to production's historical 319.
- Cross-referencing all 41 registry handles directly against this QA store (read-only
  `product(handle:)` lookups): **only 24 of the 41 exist in QA at all.** The 40-product raw
  collection contains those 24 plus 16 *other* products that aren't in the registry file. All
  **4** of the client's specifically-named multi-category ("pipe-joined Category") products from
  Task 14 — `3-5mm-disposable-blunt-tip-trocar-combo-kit-b2080c`,
  `3-2mm-stainless-steel-trocar-sharp-wrapped-kit-with-chlorascrub-tegaderm-large-glove-b8110`,
  `3-5mm-stainless-steel-bevel-tip-autoclave-trocar-b786-04`, and
  `3-2mm-three-piece-stainless-steel-trocar-set-86035-dpss` — are among the 17 registry products
  **absent from this QA store by handle.** This directly explains why Task 14's investigation
  found no pipe-joined labels in QA: the specific products that would exhibit the client's claim
  aren't in this store to query. Combined with Task 11's existing QA-vs-production catalog
  caveat, this strengthens (not just "doesn't contradict") the case that Task 14's finding is a
  QA-coverage gap, not a resolved non-issue — **carrying Task 14's existing recommendation to
  re-run `scripts/verify-trocar-category-pipe-labels.ts` against production forward as higher
  priority than before**, now that the exact 4 product handles that would prove or disprove the
  claim are identified above.
- **Filter narrowing itself works correctly** on the live page regardless of this count
  discrepancy: selecting "Disposable 3.2mm" narrows "Showing 20 products of 25" to "Showing 10
  products of 10," matching the facet's own reported count exactly (confirmed live via curl).
  Task 1's facet-registry fix is not implicated by this finding.

**Recommendation:** ask Bilal/Izzy to clarify which product set the "Trocar landing page" is
supposed to show — the tag-derived set (current live behavior, ~319 in production) or the
41-product registry collection (Izzy's CSV) — before treating "41 products" as a pass/fail bar.
This is a pre-existing architecture question this plan did not create and Task 12 cannot resolve
by itself; production re-verification is required either way.

---

## 4. Bilal's checklist — item-by-item status

| # | Item (Bilal's ask) | Status | Evidence |
|---|---|---|---|
| 1 | Trocar filter registry matches Izzy's approved facets | ✅ **Pass** | Task 1, unit-tested + live-verified this pass: `getAllowedFacets('trocars-trocar-kits')` returns material/glove_size/size/features/other_features/use; live filter narrowing confirmed via curl (25→10 on Category=Disposable 3.2mm) |
| 2 | `/collections/trocars-trocar-kits` legacy URL redirects | ✅ **Pass** | Task 2, live-confirmed: `301` → `/category/trocars-trocar-kits` |
| 3 | Trocar landing page shows exactly 41 products | ⚠️ **Cannot confirm as stated — architecture mismatch, not a defect** | See §3.3. Page shows 25 (tag-sourced) in QA; only 24/41 registry products exist in QA at all; production historically showed 319 via the same tag. Needs Bilal/Izzy clarification + production re-check. |
| 4 | Every Task 1 filter works, desktop + mobile | ✅ **Pass (desktop, curl-level); mobile UI interaction not live-browser-verified** | Filter narrowing confirmed live via curl (see above); e2e `category-filters.spec.ts`/`responsive.spec.ts` pass on both `chromium` and `mobile-chromium` projects (real mobile viewport + touch-capable emulation, not just CSS breakpoints) |
| 5 | OCC/Trocar product & pricing data intact | ✅ **Pass** | Live-queried and diffed against the registry CSV this pass for 2 handles found in QA: `3-2mm-3-piece-resin-disposable-trocar-only-b6819` — registry $201.70, live $201.70, exact match; `3-2mm-abs-plastic-disposable-trocar-kit-small-gloves-case-of-16-19125sg` — registry $380.90, live $380.90 (all 3 variants), exact match. No drift found. |
| 6 | Old Trocar/OCC/collection/consolidated-product/color-specific URLs redirect correctly | ✅ **Pass, with one gap found** | Hand-written `proxy.ts` set (28 entries): re-spot-checked live this pass (5 entries, all correct: gloves, trocar collection, AeroWalk, Injectables 410, /b2b). Fixed Drape Sheet bulk-table rows (Task 11): all 3 confirmed live. **Gap found**: AeroWalk legacy handle redirect missing on the `/category/<slug>/<handle>` route variant — see §3.2. |
| 7 | 8 packaging-variant SKUs show "unavailable," not leaked sibling data | ⚠️ **3 of 8 directly verified; 6 blocked** | SKU 118216: has real, correct, variant-specific data (Izzy's write already landed) — no leak. SKUs 118218, 118220: all three packaging fields null, fallback copy renders correctly, no leak (Izzy hasn't written these yet — **blocked on Izzy**, not a dev bug). SKUs 406, CT-12B, CT-06B, 1137-25, 1137, 2655: **not verifiable this pass** — no working SKU-search path found in this store's Storefront API (`products(query: "sku:...")` returns generic fallback results regardless of query, confirmed by testing it against a SKU known to exist), and no product handles are known for these 6. Needs handles from Izzy or a working Admin-side SKU lookup. |
| 8 | Dukal/OCC, Dukal $30+, Trocar Supplies, Kadara shipping examples | ✅ **Pass (cited, re-verified current)** | Task 7's exhaustive verification (`docs/launch/2026-08-18-free-shipping-verification.md`) is unchanged-current — confirmed no commits touched `lib/shipping-resolver/` since before this plan started. Re-spot-checked live this pass: Dukal $30-threshold product shows no "Free Shipping" text on its PDP, matching Task 7's finding. **Gap carried forward unchanged**: the Dukal-inside-OCC *positive* path (badge should show) still has no real-product QA fixture to verify against — synthetic-fixture-only, flagged in Task 7's own report, not resolved by this pass. |
| 9 | Every You May Also Need card opens the correct PDP, mobile + keyboard | ⚠️ **Link correctness verified live; keyboard/mobile touch interaction not live-browser-verified** | Confirmed via direct HTML inspection of the fresh production build: a real `<a href="/product/spinal-needle-25g-x-3-1-2-high-flow-box-405138">` renders under the "You May Also Need" heading on a live PDP, and that target resolves `200`. This is the Task 4 fix, confirmed live (not just in unit tests). Keyboard/touch walkthrough: `claude-in-chrome` tried again this pass, still reports not connected (see §5) — automated RTL a11y tests (role/href/focus/no-nested-button) remain the only coverage for the interaction itself, per Task 4's reviewer judgment. |
| 10 | Correct variant/image/quantity/shipping rates carry into cart and checkout | ✅ **Pass** | Live-driven (Playwright, headless, no order placed): added a non-Rx product to cart, cart page correctly showed the selected variant, SKU, quantity, and price; a real Shopify-hosted `checkoutUrl` was generated correctly by `cartCreate`. See item 11 for how far checkout itself could be followed. |
| 11 | Guest checkout reaches the payment step, desktop + mobile, without placing an order | ⚠️ **Partially verified — blocked by an environment credential, not a code issue** | Desktop and mobile (Pixel 7 emulation) both correctly generated a real `checkoutUrl` on `md-supplies-qa-shipping-and-checkout.myshopify.com` and began navigation to it. Reaching the actual payment step was blocked by the **QA store's storefront password wall** (Shopify's own password-protection screen) — this environment has no stored password for it, and guessing/bypassing one was not attempted. Separately confirmed: an **Rx-gated product correctly blocks guest checkout** at the cart step with "Prescription required... contains items that require a prescription or medical license on file" — this is correct, intentional behavior, not a bug. |
| 12 | RX Only capitalization | ✅ **Confirmed, no regression** | `lib/labels/labels.ts:48-51`'s `RX_ONLY_LABEL_TEXT = 'Rx Only'` unchanged; live-spot-checked this pass on a real PDP (`pen-needle-4mm-depth-32g-x-5-32-box-9543`) — renders "Rx Only," not "RX Only." One-line confirm, no new investigation needed, per the plan's own note. |
| 13 | Trocar Category facet pipe-label investigation | ⚠️ **Structural no-op on current evidence; new corroborating detail found** | Task 14's finding (no pipe-joined labels found; 24 facet-value counts across 40 products, re-confirmed identically this pass) now has a concrete explanation: the exact 4 client-named multi-category products are absent from this QA store by handle (§3.3). Re-running `scripts/verify-trocar-category-pipe-labels.ts` against production remains the recommended next step, now with the specific product handles to check first. |
| 14 | Visible "Trocar Supplies" nav quick-link, both desktop and mobile | ⚠️ **Present and functionally correct; introduced a contrast regression** | Confirmed live in the fresh production build: both the desktop mega-menu and mobile drawer render a visible "Trocar Supplies" badge linking to `/category/trocars-trocar-kits`. **But see §3.1 — this exact element fails WCAG AA contrast on every page**, a real regression not caught by Task 13's own review. |

---

## 5. Environment-blocked items (tried again this pass, still blocked)

- **`claude-in-chrome` manual browser walkthrough** (Tasks 4/9/13's outstanding item): tried
  again this pass — `mcp__claude-in-chrome__list_connected_browsers` returned `[]`,
  `tabs_context_mcp` returned "Browser extension is not connected." Same result as every prior
  attempt across this plan. **Genuine environment limitation, not routed around** — fell back to
  `npm run build` + a fresh production server + direct HTML/HTTP inspection and a small ad hoc
  Playwright script (no MCP) for the checks that needed real interaction (add-to-cart →
  checkout). This covers link-correctness, redirect behavior, and cart/checkout mechanics
  thoroughly, but does **not** substitute for an actual mouse/keyboard/touch walkthrough of
  focus order, hover states, or visual polish on a real rendered page — still recommended before
  launch if `claude-in-chrome` (or a human) becomes available.
- **6 of Bilal's 8 named packaging-variant SKUs** (406, CT-12B, CT-06B, 1137-25, 1137, 2655): no
  working SKU-search path found in this store's Storefront API — see item 7 in §4.
- **Guest checkout payment step**: blocked by the QA storefront's own password wall — see item
  11 in §4.
- **Dukal-inside-OCC positive-path real-product verification** (Task 7): unchanged from Task 7's
  own report — no QA fixture exists for this combination.
- **Production-only checks**: this environment can only reach the QA Storefront API
  (`md-supplies-qa-shipping-and-checkout.myshopify.com`, ~1,088 products) —
  `lib/shopify/shop-guard.ts` structurally refuses production (`daebb2-76.myshopify.com`). Every
  "confirmed live in QA" statement in this doc is exactly that — QA-confirmed, not
  production-confirmed. Items explicitly needing a production re-check before go-live:
  - Task 11's 1,151 unresolved bulk-redirect 404s (existing recommendation, carried forward)
  - Task 14's pipe-label facet investigation (existing recommendation, carried forward, now with
    the 4 specific product handles to check first — §3.3)
  - The Trocar landing page's actual product count/source (§3.3 — new this pass)

## 6. Blocked-on-Izzy (Shopify Admin-write items, out of scope for this repo)

Per the plan's Global Constraints, this repo has no Shopify Admin write access
(`lib/shopify/admin.ts` is RX-metafield-read-only). The following remain Izzy's, and were not
attempted here beyond read-only observation:

| Item | Current read-only observation |
|---|---|
| Pen needle SKU 118218/118220 metafield writes | Still null in QA (confirmed this pass) — not yet landed |
| Pen needle SKU 118216 | **Already landed** — has correct, populated, variant-specific packaging data in QA (confirmed this pass, no display bug) |
| Free Shipping delivery-profile membership moves | Not independently re-checked this pass beyond Task 7's existing findings |
| Trocar registry's missing `custom.use`/`custom.material` values | Not independently re-checked this pass; Task 1's facet registry only exposes fields that exist, so a missing value shows as absence, not an error |
| AeroWalk variant field population | Confirmed working end-to-end for the pilot product (Blue/White/Grey) per Task 5/10's existing verification, unchanged |
| SKU 2655's packaging metafield | Could not locate this SKU in QA at all this pass (see §4 item 7) — cannot report on its metafield state |

## 7. Open questions back to Bilal

1. **Packaging fallback copy** (Task 8, carried forward unchanged): current text is "Packaging
   information not available for this product." — your message asked for "Packaging information
   unavailable for this option." Please confirm which wording is final; this is a one-line
   product-copy change once confirmed, deliberately not made without your sign-off.
2. **Trocar landing page product source** (new this pass, §3.3): should
   `/category/trocars-trocar-kits` show the tag-derived set (current live behavior — 319 products
   in production historically, per this file's own code comments) or the 41-product registry
   collection from Izzy's CSV? These are two different, both-currently-real numbers, and "41"
   cannot be confirmed as what the live page shows without this decision.
3. **6 packaging-variant SKUs** (406, CT-12B, CT-06B, 1137-25, 1137, 2655): could you or Izzy
   share the product handles/URLs for these? This environment has no reliable way to look them
   up by SKU alone.
4. **Contrast regression** (§3.1): should the "Trocar Supplies" badge fix (Task 13) be scheduled
   as a quick follow-up before launch, given it's a sitewide WCAG AA failure?
5. **AeroWalk category-route redirect gap** (§3.2): should the redirect coverage be extended to
   the `/category/<slug>/<handle>` route variant before launch, or is the `/product/<handle>`
   coverage considered sufficient given the low likelihood of that specific old URL being
   indexed/bookmarked?

---

## 8. Commit

This evidence doc is committed on `catalog-cro-review-sardor-dev` at the SHA recorded in the
commit message below. **No push, PR, or deploy was performed** — per Task 12's Step 4 and the
plan's Global Constraints, that remains gated on the user's explicit go-ahead after reviewing
this doc.
