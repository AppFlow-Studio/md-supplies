# OCC / Shoebox-Hygiene Organic Search Strategy

**Ticket:** P1 client-priority organic growth — OCC (Operation Christmas Child) supplies & adjacent charity/institutional hygiene demand
**Owner:** Izzy / SEO Department
**Prepared:** 2026-09-06
**Branch:** `catalog-cro-review`
**Scope:** Phases 1–8 of the ticket, against the current codebase, in-repo audit data, and external search research. See "Data-access gaps" below for what could **not** be verified from this environment.

---

## 0. Read this first — a site-wide blocker sits in front of every recommendation here

Per `docs/audits/2026-08-seo-remediation/STATUS-REPORT-2026-08-27.md` (verified 2026-08-27, still the latest status as of this writing): production (`www.mdsupplies.com`) is currently serving `noindex,nofollow` sitewide and `robots.txt: Disallow: /`. **No metadata or content change — on the OCC page or anywhere else — can affect Google rankings until that infra fix ships.** The fix exists in code on this branch but is unmerged/undeployed. This doesn't change what to build, but it does change what "done" means: everything below should be treated as **queued for the moment the site is crawlable again**, not as work that will move rankings this week. Flagging this explicitly so OCC work isn't mistaken for a standalone fix to a problem that's actually upstream.

---

## 1. Phase 1 — Existing-asset audit

### 1.1 Route inventory
- **`/solutions/occ`** — the canonical OCC route (`app/solutions/occ/page.tsx`). Renders as a category page: breadcrumb → H1 + intro → subcategory tiles (Hygiene Kits, School Supplies, Backpacks) → filterable product grid (via the shared `CategoryResults` engine) → "About the OCC Collection" copy block → FAQ.
- **`/category/occ`** and **`/collections/occ`** (legacy Shopify collection URL) both 301 to `/solutions/occ` in `proxy.ts:116` / `proxy.ts:472`. This is correct in code.
- **Confirmed live cannibalization, evidence-backed:** a web search for `Operation Christmas Child shoebox supplies wholesale bulk` returned `mdsupplies.com/collections/occ` as an independently-indexed result with its own title ("OCC Shoebox Supplies | Bulk Donation Kits & Gifts for Missions – MDSupplies") — not `/solutions/occ`. This is exactly what the STATUS-REPORT describes: the redirect fix is real in code but not live, so Google is still indexing the old `/collections/occ` URL directly instead of following a 301 to the canonical route. **No new dev work needed here** — it's already covered by the existing "merge and deploy this branch" blocker in the STATUS-REPORT. Flagging it here as confirmation that the deploy gap has a measurable OCC-specific cost, not just a theoretical one.

### 1.2 Critical bug found and fixed: title/meta tag did not describe the page

`app/solutions/occ/page.tsx` builds its `<title>`, meta description, and `WebPageSchema` name/description from `getSolutionSeo('occ')` (in `lib/seo/solutionSeo.ts`) **when that entry exists, overriding the correct copy in `lib/occ.ts`**. It existed, and it was wrong:

| Field | What `lib/occ.ts` (`OCC_HUB`, the real page content) says | What `lib/seo/solutionSeo.ts` was actually shipping in `<title>`/meta |
|---|---|---|
| Title | `OCC Shoebox Supplies — Bulk Kits, Hygiene & Gifts \| MDSupplies` | `Charity & Nonprofit Medical Supply Program \| MDSupplies OCC` |
| Meta description | Shoebox/hygiene-kit/school-supply/backpack bulk supplies for churches, nonprofits, mission groups | "MDSupplies OCC program supports nonprofits, free clinics, food banks... preferred pricing... dedicated account management" |

The `solutionSeo.ts` entry described a fictional B2B "Organized Customer Care" nonprofit tiered-pricing program — not Operation Christmas Child, not shoebox supplies, and not anything MDSupplies actually offers (no such account-tier program exists elsewhere in the codebase). Git history confirms how this happened: `docs/superpowers/plans/2026-06-17-priority-11-implementation.md` (2026-06-17) invented "Organized Customer Care" as a backronym and wrote `lib/occ.ts` around it; a later restructure (`88fa5aa feat(occ): restructure OCC as a category page`, `b805ba0`) correctly rewrote `lib/occ.ts` to the client's actual meaning (shoebox supplies), but nobody went back and fixed the earlier, separately-added `lib/seo/solutionSeo.ts` entry that silently overrides the `<title>`/meta tag. It's been shipping the wrong program description in search results this whole time — a direct hit on both **Phase 8** ("whether the route name/title/H1 are aligned") and the ticket's compliance rule against unverified program/affiliation claims (a "dedicated account management, tiered nonprofit pricing" program that doesn't exist is its own liability, independent of the OCC/Samaritan's Purse question).

**Fixed in this session** (see §7, before/after log). `answerBlock`/`faqs` on that same stale entry were unused by any page (verified via full-repo grep) — dead weight carrying the same wrong story, removed with it rather than left as a landmine for the next person who wires it up.

### 1.3 Secondary content-accuracy bug found and fixed

`OCC_HUB.faq` (`lib/occ.ts`) told buyers popular shoebox items include "toothbrushes, soap, washcloths." Per Samaritan's Purse's current official guidance (verified directly against `samaritanspurse.org/operation-christmas-child/what-goes-in-my-shoebox-suggestions/`, fetched 2026-09-06): **soap and toothpaste are both explicitly on the "do not include" list** ("Soap is no longer allowed in shoebox gifts because of the complications it causes in customs in some nations."). Comb/brush, toothbrush, washcloth, adhesive bandages, and nail clippers are the current accepted hygiene items — which lines up closely with the client's own product list (toothbrushes, combs, hairbrushes, toothbrush holders). The FAQ was telling buyers to pack a now-banned item. Fixed to drop "soap," add "combs," and add a generic pointer to check current official guidance before packing — satisfying the ticket's "defer to official guidance, don't copy their list, don't act as the authority on program rules" instruction without reproducing Samaritan's Purse's actual list verbatim.

### 1.4 What the existing page already does well (don't rebuild it)
- Category tiles/filters/product grid already exist and share the same battle-tested `CategoryResults`/`SubcategoryNavigator` engine as every other category page — this is the "item 11, P1" UX work the ticket references, already in code. **Do not design a second, competing product-navigation pattern for OCC** — coordinate any UX changes through that existing surface.
- `programExplanation` copy is genuinely useful (explains what shoebox drives are, what MDSupplies stocks, invites both small and large orders) — not generic "we care about giving back" filler. Meets the ticket's content-quality bar as-is.
- FAQ already explains "What is Operation Christmas Child?" accurately and without any partnership/endorsement claim — compliant with the entity rule as written.
- Title/intro/H1 deliberately avoid branding the page *around* the Operation Christmas Child name (there's a standing regression test, `lib/__tests__/occ.test.ts`, asserting the H1/intro don't reduce the page to that one program name) while the FAQ still explains the term accurately. That's the right shape for the compliance rule — keep it.

### 1.5 `gifts-toys` gap (pre-existing, not new)
`OCC_HUB.eligibleCategories` has a comment noting a `gifts-toys` collection handle was removed because it 404'd, pending Izzy confirming the real handle. Toys/stuffed-animal shoebox items (explicitly called out in the FAQ copy) currently have no corresponding tile. Not something I can resolve without Shopify Admin access — flagging as a live gap Izzy already owns (see `lib/occ.ts:12-14`).

---

## 2. Phase 2 — First-party search evidence: **blocked, data-access gap**

This environment has no Google Search Console or Shopify Admin/sales API access. I could not pull query/page-level impressions, clicks, CTR, or position for OCC/shoebox/hygiene terms, and could not pull live sales-by-SKU data for toothbrushes/combs/hairbrushes/toothbrush holders. What I checked instead:
- **In-repo backlink/audit exports** (`docs/audits/2026-09-04-p0-seo-migration-integrity/*.csv`, 51–53 rows total) — no GSC data, but see §6 for what they do contain.
- **Static catalog registries** (`lib/filter-registry.ts`, `lib/category-tree.ts`) — confirm the `hygiene-kits`, `school-supplies`, and `backpacks` collections exist and are wired to OCC, but individual product-level data (is there a bulk toothbrush-holder SKU, at what price/case-pack) lives only in live Shopify and isn't in this repo.

**Action needed from Izzy (or whoever holds the GSC/Shopify seats):** export GSC query data filtered to `/solutions/occ`, `/category/hygiene`, and any URL containing "occ"/"shoebox"/"hygiene" for the last 12–16 months (covering last year's OCC season, Sept–Dec), plus a Shopify sales report by product tag for the hygiene-kit/toothbrush/comb/hairbrush/toothbrush-holder SKUs. Until then, the "proven customer segment" claim rests on the client's word (which the ticket explicitly says to trust as business evidence) but is not yet cross-checked against MDSupplies' own search/sales data. I'd treat that as the single highest-value follow-up before spending more effort on this cluster.

---

## 3–5. Phases 3–5 — Keyword clusters, SERP intent, competitor landscape

No keyword-volume tool (Ahrefs/SEMrush/Keyword Planner) is available in this environment, so figures below are **not** volume/difficulty estimates — they're what I could verify directly by running the actual queries and reading what Google currently returns. Treat this as directional SERP-intent evidence, not a quantified keyword universe; pair it with a real Ahrefs/GSC pull before finalizing page-level targets.

| Cluster | What the live SERP actually looks like | Dominant intent | Implication |
|---|---|---|---|
| **A. Operation Christmas Child / OCC supplies** (`operation christmas child shoebox supplies wholesale bulk`) | Mix of Amazon listings, Samaritan's Purse's own pre-printed-box ordering page, gift-idea blog posts, wholesale suppliers (Lion Wholesale, WOW, H&J Closeouts, Oriental Trading) — **and MDSupplies' own `/collections/occ` already ranks here today** | Commercial, tolerant of ecommerce category pages | A well-optimized `/solutions/occ` is the right format — MDSupplies already has a foothold once the cannibalization/deploy gap (§1.1) clears |
| **B. Shoebox packing ("what to pack")** (`what to pack in an Operation Christmas Child shoebox`) | 100% informational: Samaritan's Purse official page, Billy Graham Library, Lifeway, mom-blogs, a Samaritan's-Purse-hosted PDF — **zero ecommerce results in the visible set** | Informational / official-guidance, exactly the pattern the ticket warned about | Confirms the ticket's own hypothesis: don't try to rank a product grid for "what to pack" queries. `/solutions/occ` should *link to* official guidance for packing rules (already partially true — see §1.3 fix) rather than compete to own that query itself. No standalone "what to pack" article is justified by this evidence. |
| **C. Bulk hygiene product intent** (`bulk toothbrushes for donation charity`) | Amazon, Walmart, DollarDays, and dedicated wholesale-oral-care sites (toothbrushexpress.com, toothbrushi.com) | Pure commercial/product | Straightforward category/product-page intent — this is what `/category/hygiene` and the OCC hygiene-kit tile already serve. No new page needed; strengthening existing category copy is enough. |
| **D. Charity/nonprofit hygiene kits, Orphan Grain Train** (`Orphan Grain Train hygiene kits supplies`) | ogt.org's own program pages dominate; kit spec is explicit (towel, washcloth, **bar soap**, soap dish, comb, toothbrush, nail clipper, bandages, tissue) | Informational/organizational, low commercial competition | OGT's kit spec **includes bar soap** — the opposite of OCC's current rule. This is concrete, sourced proof that "shoebox terminology" (OCC) and general "charity hygiene kit" terminology (OGT and others) are **not interchangeable specs**, exactly as the ticket instructed to verify rather than assume. Any broader "charity hygiene kit" copy must not imply OCC's rules apply to OGT-style kits or vice versa. |
| **E. Institutional/rehab hygiene kits** (`rehab facility hygiene kits bulk supplier intake`) | A distinct set of wholesale suppliers — DollarDays, BagsInBulk, Backpacks USA (explicitly markets to "hotels, Airbnbs, prisons, inmate care, corrections facilities"), Kit U Safe (schools, rehab centers, health departments, shelters), HDI Wholesale | Commercial, but a **different competitive set** than clusters A–D — no OCC/charity branding, no Samaritan's Purse presence at all | Confirms the ticket's instruction to treat this as separate B2B intent, not folded into the OCC page. The competitive landscape and buyer language (facility "intake," "corrections," "shelters") are materially different from shoebox/charity language. Real candidate for a distinct page **once Phase 2's sales-data gap is closed** — building it now would be speculating on assortment fit the same way the ticket told us not to for keywords. |

### Competitor/content-gap notes (Phase 5)
- Dedicated wholesale-hygiene-kit competitors (Backpacks USA, Kit U Safe, HDI Wholesale, BagsInBulk) sell case-packs of 12/24 *pre-assembled* kits, not just loose bulk components. If MDSupplies' Shopify catalog has (or could tag) actual pre-assembled hygiene-kit SKUs rather than only loose toothbrush/comb/hairbrush units, that's a concrete assortment gap worth checking against live inventory (blocked by the Phase 2 data gap).
- None of the OCC/shoebox-cluster competitors present themselves as an official Samaritan's Purse vendor/partner — the framing is uniformly "supplies useful for shoebox packing," which matches the compliance posture this ticket requires and that `/solutions/occ` already uses.
- The one live MDSupplies result that already surfaces (`/collections/occ`) uses a title ("Bulk Donation Kits & Gifts for Missions") that's reasonably on-target — further evidence that the underlying page concept is sound and the blocker is technical (deploy gap + the metadata bug fixed in §1.2), not conceptual.

---

## 6. Phase 6 — Historical backlink / lost-content research

Checked both in-repo Ahrefs-style exports under `docs/audits/2026-09-04-p0-seo-migration-integrity/`:
- `mdsupplies.com-broken-backlinks-subdomains_2026-04-26_19-10-19(3).csv` (53 rows)
- `mdsupplies.com-backlinks-subdomains_2026-09-01_13-28-23.csv` (51 rows)

**Result: zero rows referencing Operation Christmas Child, OCC, shoebox, Samaritan's Purse, Orphan Grain Train, or charity/donation terms** (checked both files case-insensitively). The one hygiene-adjacent legacy backlink in these exports (`/medical-supply-store/Hygiene-WQ2ENW7KU6.html` → `/category/hygiene`) is a generic hygiene-category link, not OCC/charity-specific, and is already 301'd and marked "Recovered" in the existing inventory.

**This is not strong evidence that no historical OCC-ecosystem backlinks exist.** Both files are narrow, ~50-row exports scoped to a specific prior redirect-integrity ticket (`DEV-BACKLINK-01`/P0 migration work), not a full referring-domains crawl. The client's recollection of historical blogs/links from the OCC/Samaritan's Purse/Orphan Grain Train ecosystem may well be accurate and simply outside what these two exports happen to cover.

**Per the ticket's own instruction ("don't request restoration solely because a spam backlink exists"), I'm not adding anything to `DEV-BACKLINK-01` from this check** — there's nothing here that clears the bar. What I'd recommend instead: whoever holds the Ahrefs seat runs one fresh full referring-domains export filtered/sorted for anchors or referring pages containing "shoebox," "OCC," "Christmas Child," "Samaritan," "Orphan Grain Train," or "charity kit." If that turns up a legitimate lost URL, send it to `DEV-BACKLINK-01` with source context and recommended destination at that point — not before.

---

## 7. Metadata implementation — before/after log

| Location | Field | Before | After |
|---|---|---|---|
| `lib/seo/solutionSeo.ts` → `SOLUTION_SEO_DB['occ']` | `title` (drove live `<title>` + OG title + WebPage schema name) | `Charity & Nonprofit Medical Supply Program \| MDSupplies OCC` | *(entry removed — falls through to `OCC_HUB.seoTitle`)* → **`OCC Shoebox Supplies — Bulk Kits, Hygiene & Gifts \| MDSupplies`** |
| `lib/seo/solutionSeo.ts` → `SOLUTION_SEO_DB['occ']` | `metaDescription` (drove live meta description + OG description + WebPage schema description) | `MDSupplies OCC program supports nonprofits, free clinics, food banks, and community organizations with preferred pricing on bulk medical supplies, hygiene kits, and care products.` | *(entry removed — falls through to `OCC_HUB.seoDescription`)* → **`Shop bulk Operation Christmas Child (OCC) shoebox supplies — hygiene kits, school supply kits, backpacks, crayons, coloring books, and gifts for churches, nonprofits, and mission groups.`** |
| `lib/seo/solutionSeo.ts` → `SOLUTION_SEO_DB['occ']` | `answerBlock`, `faqs` (5 Q&As) | Fictional "Organized Customer Care" nonprofit-pricing program copy, unused by any rendered page | Removed (dead code carrying an inaccurate, unverified business-program claim) |
| `lib/occ.ts` → `OCC_HUB.faq[2].answer` | Shoebox-item example list | `...hygiene kits (toothbrushes, soap, washcloths)...` | `...hygiene items (toothbrushes, combs, washcloths)... Accepted and restricted items can change from year to year, so check the current official packing guidelines before you shop.` |

Verification run after both edits: `npx vitest run lib/__tests__/occ.test.ts lib/seo` → 9 test files / 164 tests passing; `npx tsc --noEmit` → clean. No other page consumes the removed `solutionSeo.ts` fields (verified by repo-wide grep before deleting).

**This is routine, code-level metadata correction — implemented directly rather than queued for Izzy**, since the actual controls here are hardcoded TypeScript, not a Shopify-side SEO field Izzy can edit himself. Recommend Izzy spot-check the new title/description read naturally in a SERP preview tool before this branch ships.

---

## 8. Architecture decision (Phase 7)

- **Enhance the existing `/solutions/occ` route.** Do not create a new OCC/shoebox landing page. The route, category-tile pattern, and product engine are correct; the two real defects were a metadata bug and a stale-content bug, both fixed above (§1.2, §1.3), plus a deploy gap that's someone else's already-tracked blocker (§1.1).
- **Strengthen `/category/hygiene` copy incrementally, not urgently.** Cluster C evidence (§3–5) shows this is pure commercial/product intent already served by the category+filter pattern; no page-type change needed.
- **No standalone "what to pack" informational article.** Cluster B evidence shows that SERP is dominated by Samaritan's Purse's own official content and established blogs — MDSupplies competing to *own* that query with thin content would fail the "no thin keyword pages" acceptance criterion and wouldn't outrank official guidance anyway. Deferring to official sources (as the fixed FAQ answer now does) is the correct posture, not a missed opportunity.
- **Institutional/rehab hygiene-kit page: candidate, not yet justified.** Cluster E evidence shows a real, distinct competitive/intent landscape. But building it now would repeat the exact mistake the ticket warns against for keywords — speculating on a page without sales/assortment evidence. **Recommendation: hold until the Phase 2 data gap closes** (does MDSupplies' live catalog and sales data actually support this — pre-assembled kits vs. loose components, existing "rehab" or "facility" query traffic on any current URL). If that comes back positive, it's a `Sardor` brief on its own, separate from OCC.
- **Charity/nonprofit hygiene kits (Orphan Grain Train-style, non-OCC):** no separate page justified by current evidence. `/solutions/occ`'s existing broad charity/nonprofit framing (already deliberately not locked to the Operation Christmas Child name alone — see the standing test in `lib/__tests__/occ.test.ts`) already covers this without a second competing URL, provided copy doesn't imply OCC's item rules (no soap) apply universally to every charity kit — worth a light copy pass but not a new page.

---

## 9. Sardor brief

One item below the "routine metadata" bar that's still worth a small, scoped dev task — everything else in this ticket was either already-tracked (the deploy gap, §1.1) or fixed directly in this session (§1.2, §1.3).

> **Canonical URL:** `/category/hygiene`
> **Target intent/cluster:** Cluster C (bulk hygiene product intent) and cross-traffic from Cluster A/OCC visitors who land on the general Hygiene category instead of `/solutions/occ`
> **Current problem:** `/solutions/occ` already links out to Hygiene-adjacent subcategories (`hygiene-kits`, `school-supplies`, `backpacks` — see `SubcategoryNavigator` in `app/solutions/occ/page.tsx`), but there is no reciprocal link from `/category/hygiene` back to `/solutions/occ` for shoebox/charity-drive buyers who arrive on the general hygiene category first. This is a one-directional internal-link gap, not a new content type.
> **Exact H1 recommendation:** none — no H1 change requested.
> **Above-grid content purpose/topics:** none requested.
> **Below-grid H2/topics if needed:** optionally, one sentence in the existing Hygiene category description/answer block (`lib/seo/categorySeo.ts`) noting that bulk case-pack hygiene items are also available pre-organized for shoebox/charity-drive packing, linking to `/solutions/occ`.
> **Internal links:** source `/category/hygiene` (and/or its `answerBlock`/copy) → destination `/solutions/occ` → reason: currently a one-way link exists in the other direction only; buyers researching bulk toothbrushes/combs generically have no path to the curated shoebox-drive assortment.
> **FAQ:** none — no new PAA/query evidence supports adding one here.
> **Legacy redirect needed:** none.
> **Compliance language/claims to avoid:** do not describe MDSupplies as an official Operation Christmas Child, Samaritan's Purse, or Orphan Grain Train supplier/partner/vendor; do not restate a specific packing-rules list as MDSupplies' own claim (link to official guidance instead, per the fix in §1.3).
>
> **Note:** this should route through whatever surface owns the existing category-tiles/filters UX ticket (item 11, P1) rather than as an independent change to `CategoryPageView`/`categorySeo.ts`, per the ticket's instruction not to create a second, conflicting product-navigation design.

---

## 10. Measurement plan

Baseline can't be established yet (Phase 2 gap — no GSC access from this environment). Once access exists:
1. **GSC:** query-level impressions/clicks/CTR/position for `/solutions/occ`, `/category/hygiene`, and any URL matching `occ|shoebox|christmas child|hygiene kit` — pull a baseline snapshot now (even under the current noindex/disallow state, to have a true "before" number) and re-check monthly once the crawlability fix ships.
2. **Cannibalization check:** confirm in GSC's URL inspection / Coverage report that `/collections/occ` drops out of the index and `/solutions/occ` becomes the sole indexed URL for this cluster within a few weeks of deploy — this is the direct, measurable payoff of the already-tracked deploy fix (§1.1).
3. **Rankings:** track position for the Cluster A/C query set in §3–5 (the actual queries tested here, not invented ones) via whatever rank tracker is in use.
4. **Commerce:** organic-landing sessions to `/solutions/occ` and `/category/hygiene`, plus add-to-cart/checkout completion on the `hygiene-kits`/`school-supplies`/`backpacks`/hygiene collections, once GA/Shopify analytics access is available from this environment or reported by Izzy.

---

## Deliverables checklist

- [x] Existing OCC/related-page audit (§1)
- [ ] GSC findings — **blocked**, no access from this environment (§2)
- [x] Keyword universe — SERP-evidence-based, explicitly not volume/difficulty-scored (§3–5); pair with a real Ahrefs/GSC/Keyword-Planner pull before finalizing targets
- [x] SERP-intent analysis (§3–5)
- [x] Competitor/content-gap analysis (§5)
- [x] Historical backlink/lost-content findings (§6) — none found in available data; follow-up export recommended
- [ ] Commercial product/category mapping — **partially blocked**: category/collection wiring confirmed in code (§1.4), but product/SKU-level and sales data need live Shopify access (§2)
- [x] Recommended page/content architecture (§8)
- [x] Before/after metadata log + implemented approved metadata (§7)
- [x] Sardor brief where needed (§9)
- [x] Post-change measurement plan (§10)
