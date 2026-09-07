# Category opportunity research, metadata + Trocars Tier-1 plan

**Ticket:** MDSUPPLIES · SEO-CATEGORY-01 (P0/P1 organic-growth workstream)
**Prepared:** 2026-09-07
**Branch:** `catalog-cro-review`
**Scope actually completed this session:** Phase 0 (canonical category universe — see companion `CANONICAL-CATEGORY-UNIVERSE.md`), the mandatory Trocars & Trocar Kits Tier-1 deep dive end-to-end, and the metadata implementation + before/after log for that page. See "Data-access gaps" for what could **not** be done from this environment, and "What's next" for the honest state of the broader 25-category opportunity model.

---

## 0. Read this first — the same site-wide blocker that gated the OCC ticket applies here

Per `docs/audits/2026-08-seo-remediation/STATUS-REPORT-2026-08-27.md` (still the latest status as of this writing): production (`www.mdsupplies.com`) currently serves `noindex,nofollow` sitewide with `robots.txt: Disallow: /`, and ~201 commits on this branch are unmerged/undeployed. **No metadata change here — Trocars included — can move rankings until that infra fix ships.** Everything below is queued for the moment the site is crawlable again, exactly as the OCC ticket's equivalent note said. This also means the cannibalization finding in §4 below (an old `/collections/trocars-trocar-kits` URL still independently indexed) will not resolve itself just because the redirect exists in code — it needs the same deploy.

---

## 1. Evidence sources actually available — and what's blocked

| Source | Ticket asks for | What this environment has |
|---|---|---|
| Google Search Console | clicks/impressions/CTR/position, query lists, page-two opportunities | **Blocked.** No GSC seat from this environment. Same gap the OCC ticket hit. |
| Ahrefs / SEO platform | keyword volume, KD, traffic potential, ranking history, referring domains | **Blocked** for volume/KD (no Ahrefs seat). **Partially available**: this repo already carries two in-repo Ahrefs backlink exports from a prior ticket (`docs/audits/2026-09-04-p0-seo-migration-integrity/*.csv`) — checked for Trocar-relevant rows, see §4. |
| Google Keyword Planner | search-demand validation, CPC/commercial signal | **Blocked.** No Ads account access. |
| Shopify / catalog | active products, assortment breadth, current metadata | **Available.** Queried live against the QA Storefront API (`scripts/verify-trocar-category-pipe-labels.ts`, `scripts/audit-category-tree.ts`) and cross-checked against a tracked production-scale snapshot (`audit/category-tree-audit-report.md`, 7,385 products, 2026-07-17). See §3. |
| Live custom site | H1, headings, breadcrumbs, internal links, indexability, schema | **Available.** Read directly from `components/category/CategoryPageView.tsx`, `lib/category-tree.ts`, `lib/filter-registry.ts`. See §2 and §5. |
| Live SERP | what actually ranks today for the real query set | **Available**, directionally. Ran the actual queries via web search (not a rank tracker) — see §4. This is SERP-intent evidence, the same caveat the OCC doc used: not a quantified keyword universe, not volume/difficulty-scored. |

Where a conclusion below rests only on SERP-observation or code-reading rather than a measured GSC/Ahrefs number, it's labeled **Observed** (directly read/measured), **Inference** (interpretation), or **Recommendation** (proposed action) — per the ticket's own evidence-discipline rule.

---

## 2. Existing-asset audit — Trocars & Trocar Kits and its parent

**Observed**, from `lib/category-tree.ts` and `components/category/CategoryPageView.tsx`:

- Canonical route: `/category/trocars-trocar-kits`, a `FEATURED_SUBCATEGORIES` entry (collection-backed page nested under the `surgery-procedure` L1, not a 26th top-level category — there is no `category:trocars-trocar-kits` product tag; every Trocar product carries `category:surgery-procedure`).
- Until this session, the route had **no `categorySeo.ts` entry**. Its title/meta/H1 fell back to a bare-bones registry record (`shortDescription` only, no primary/secondary keywords, no search-intent classification, no FAQ, no internal-link plan) — the same tier of "unresearched" as 16 of the 25 L1 categories (see companion universe doc).
- Its parent, `surgery-procedure`, has **no controlled metadata at all** — it directly inherits whatever Shopify's own collection `seo.title`/`seo.description` happen to be (currently both `null` on the QA store; historically, per `docs/audits/2026-08-20-surgery-trocar-repair/README.md`, production's Shopify `seo.title` for the *Trocar* collection specifically was `"Trocars & Trocar Kits - 3.2mm, 3.5mm, 4.5mm - FDA Registered"` — already flagged in that prior pass as an unverifiable regulatory claim this codebase should not restate, and correctly excluded from the Trocar route's title even before this session via the `useRegistryCopy` rule in `CategoryPageView.tsx`).
- **Observed, live QA Storefront API query (2026-09-07):** the `surgery-procedure` collection's own body description (not the SEO field) reads: *"Shop a complete range of surgery and procedure supplies at MDSupplies, including trocar kits, sterile drapes, packing rolls, prep kits, scalpels, forceps, syringes, and gauze sponges..."* — and the `trocars-trocar-kits` collection's own body description reads: *"Shop FDA-registered Trocars and Trocar Kits designed for hormone pellet insertion, laparoscopic procedures, minor surgeries, and outpatient surgical centers. Our selection includes 3.2mm, 3.5mm, and 4.5mm sizes, available in both disposable resin and reusable stainless steel options. Each sterile kit includes essential surgical components such as cannulas, obturators, gloves, antiseptic prep, syringes, and drapes..."* This is real, useful merchandising-team content — the procedure/use-case detail (hormone pellet insertion, laparoscopic access, minor surgery, outpatient centers; kit contents) is factual product information safe to restate; the "FDA-registered" claim is the one clause that stays excluded, same as before.
- **Observed**, Header/nav: per `docs/audits/2026-08-20-surgery-trocar-repair/README.md` and confirmed still true in current `lib/category-tree.ts` (`artworkFallbackHandles` on the `surgery-procedure` L1 row lists the four Trocar sub-collections first), Trocars is pinned as the first item in the Surgery & Procedure subcategory strip and mega-menu nesting. The parent-to-child internal link already exists and works.
- **Observed**, the reverse direction does not: `needles-syringes`' own `categorySeo.ts` entry carries a `croNotes` field that says *"HRT clinic buyers are high-LTV; surface pellet and trocar supplies in related links"* — but its `internalLinks` array (the field that's actually meant to drive a related-links section) does **not** include `/category/trocars-trocar-kits`. That's a real, evidence-backed one-directional link gap — see §6.

---

## 3. Catalog / inventory-readiness check (Shopify evidence)

**Observed, tracked production-scale snapshot** (`audit/category-tree-audit-report.md`, 7,385 products scanned, 2026-07-17): Surgery & Procedure carries 319 active products; a prior read-only production Storefront API check on 2026-08-20 (`docs/audits/2026-08-20-surgery-trocar-repair/README.md`) measured the Trocar sub-collection at 41 products specifically.

**Observed, live QA-store query, 2026-09-07** (`scripts/verify-trocar-category-pipe-labels.ts` against `trocars-trocar-kits`): 57 total products in the QA store's version of this collection, with a `Category` facet (`custom.customer_filter_category`) breaking down as:

| Category facet value | QA count |
|---|---:|
| Disposable 4.5mm | 15 |
| Disposable 3.2mm | 11 |
| Disposable 3.5mm | 10 |
| Reusable 4.5mm | 3 |
| Kit without Trocar | 3 |
| Reusable 3.2mm | 2 |
| Reusable 3.5mm | 1 |

Brand facet: 2 values (Trocar Supplies, Kadara Medical — matching `docs/audits/2026-09-04-partners-brand-logo-audit.md`'s brand records, both of which MDSupplies carries as B2B partner brands with their own `/partners/<slug>` pages).

**Inference:** the QA-store count (57) and the historical production count (41, measured 2026-08-20) are both real but not the same number at the same point in time — QA is a smaller, separately-maintained fixture store (see the companion universe doc's method note), so neither figure should be read as "today's exact production Trocar SKU count." What both agree on, and what matters for the readiness question the ticket asks ("can a searcher landing on this page actually buy what the query implies"): **disposable trocars/kits dominate assortment (roughly 3x the reusable line), sizes span the full 3.2/3.5/4.5mm range on both disposable and reusable lines, and a "kit without trocar" component-only option exists** — assortment depth is real and multi-dimensional, not a thin single-SKU page.

**Recommendation:** re-run `scripts/verify-trocar-category-pipe-labels.ts` (or an equivalent Admin API pull) against production before the next content decision, to get one trustworthy current count rather than reconciling two historical snapshots.

---

## 4. Keyword landscape, SERP intent, and competitor landscape (Trocars)

No Ahrefs/GSC/Keyword-Planner volume or KD figures are available — the table below is **SERP-intent evidence from actually running these queries**, not a scored keyword universe. Pair with a real Ahrefs/GSC/Keyword-Planner pull before finalizing volume-based targets.

| Query run | What the live SERP actually shows | Intent | Implication |
|---|---|---|---|
| `trocar kit wholesale bulk buy` | **MDSupplies' own `/category/trocars-trocar-kits` and its legacy `/collections/trocars-trocar-kits` URL both appear**, alongside CIA Medical (ciamedical.com — dedicated `/trocars`, `/trocar-kits` category pages) and Trocar Supplies' own direct-to-buyer site (trocarsupplies.com — dedicated collection pages per size/kit type) | Commercial, category-page-tolerant | MDSupplies already has a real, confirmed foothold in this cluster today — the page format (a filterable category grid) is exactly right, matching the OCC ticket's finding for its own cluster |
| `disposable trocar 5mm buy online medical supply` | CIA Medical, McKesson, Amazon/eBay listings, laparoscopic-instrument manufacturers (Mindray, Geyi Medical, Victor Medical) | Commercial/product | A broader, more genericized competitive set than the branded cluster above — MDSupplies does not carry a dedicated 5mm line per the facet data in §3 (only 3.2/3.5/4.5mm), so this specific query is a partial-fit opportunity at best, not a priority target |
| `reusable trocar surgical supplier` | Mindray, Aesculap, Rumex, **Kadara Medical's own site** (kadaramedical.com — sells its 3.2mm stainless reusable trocar direct), **Trocar Supplies' own site** (autoclave/reusable collection) | Commercial | Direct channel-conflict finding, not a keyword gap: two of MDSupplies' own carried brands (Kadara Medical, Trocar Supplies) compete for the exact same searches on their own direct-to-buyer sites. Not something on-page copy can fix — flagging for Izzy/business awareness, not a dev action. |
| `trocar for hormone pellet insertion kit` | Carie Boyd Pharmaceuticals, Therapellet, trocarsets.com, and (again) Trocar Supplies' own dedicated hormone-pellet-insertion pages/FAQ | Informational + commercial, mixed | **Real, distinct secondary cluster.** Confirms the collection's own body copy (§2) is not marketing filler — hormone pellet insertion is an established, separately-searched use case with dedicated competitor content (procedure pages, FAQs). This is exactly the audience `needles-syringes`' own `croNotes` already flagged as high-LTV (HRT clinics) — see the link gap in §6. |
| `mdsupplies.com trocar` | Confirms MDSupplies already ranks for its own brand+trocar query with **both** the canonical `/category/trocars-trocar-kits` route and the legacy `/collections/trocars-trocar-kits` URL independently indexed, plus multiple individual product pages (e.g. "4.5mm Stainless Steel Short Shaft Single Use Individual Trocar") | Navigational/commercial | **Cannibalization, confirmed** — same pattern the OCC ticket found for `/collections/occ` vs `/solutions/occ`. The 301 from `/collections/trocars-trocar-kits` to the canonical route already exists in code (`a1e5ae2`, per git history) but isn't live per §0's deploy blocker, so Google is still indexing the pre-redirect URL directly. No new dev work needed here — it's the same already-tracked "merge and deploy this branch" item, just confirmed to have a Trocar-specific cost. |

### Backlink check (in-repo Ahrefs exports)

Checked both exports under `docs/audits/2026-09-04-p0-seo-migration-integrity/` (from `DEV-BACKLINK-01`'s prior work, ~50 rows each, not a full referring-domains crawl). **Result: no row directly names Trocars/Trocar Kits as a backlink target.** The one Trocar-adjacent finding in that dataset is structural, not a backlink: `docs/audits/2026-08-seo-remediation/MASTER-PLAN.md` §3.4 notes the legacy Trocars/Trocar Kits collection URL is one of a small set of **shared-template internal links** responsible for a large share of the "8,107 pages link to redirects" finding — i.e., a large number of MDSupplies' own pages (likely nav/footer) already link to this URL, which is real internal-link equity worth preserving through the redirect, not external backlink evidence. **Per the ticket's own instruction** ("don't request restoration solely because a spam backlink exists" — and by the same logic, don't claim external backlink strength without a real referring-domains pull), this document does not assert an external-backlink advantage for Trocars. **Recommendation:** a fresh, full referring-domains export filtered for "trocar" anchors/pages, once an Ahrefs seat is available, the same follow-up the OCC doc recommended for its own cluster.

---

## 5. Trocar-specific audit checklist (from the ticket)

- [x] Current GSC query footprint — **blocked**, no access (§1)
- [x] Current ranking positions/history — SERP-evidence only, not a rank-tracker history (§4)
- [x] Current backlinks/referring domains — checked in-repo exports, none found; internal-link-equity note only (§4)
- [x] Current title/meta/H1 — audited (§2); before/after logged (§7)
- [x] Product depth and actual size/type offerings — audited against both a production snapshot and a live QA query (§3)
- [x] SERP competitor page types and copy depth — audited (§4)
- [x] Internal links from Surgery & Procedure and relevant surgical pages — audited; parent→child link exists, Needles & Syringes→Trocars does not (§2, §6)
- [x] Possible cannibalization with broader Surgery & Procedure pages — checked; no cannibalization between the two *canonical* routes (title/H1 are already correctly split per the 2026-08-20 repair pass and its regression tests), but a **different** cannibalization exists between the canonical Trocar route and its own un-redirected-in-production legacy URL (§4)
- [x] Schema/canonical/indexability — audited (§2, and confirmed via `components/category/__tests__/buildCategoryMetadata.test.tsx`'s existing canonicalization tests, which pass unchanged after this session's `categorySeo.ts` addition)
- [x] Useful FAQ/PAA topics only if supported by actual SERP/query data — added 5 FAQ items, each traceable to a specific finding above (§7)

---

## 6. Cross-cutting finding: `internalLinks` is a data field with no renderer

**Observed:** all 9 previously-"complete" `categorySeo.ts` entries (and the new Trocars entry) populate an `internalLinks: string[]` array, but a full-repo search confirms **no `.tsx` file ever reads `.internalLinks`** — the field is documented intent, not a rendered related-links section. The same is true of `contentSections` (always `[]` across all entries) and, per the OCC session's separate finding, `croNotes` (used only as an in-code comment for humans, never rendered).

**This means:** adding `/category/trocars-trocar-kits` to `needles-syringes`' `internalLinks` array (the "fix" a naive reading of this ticket might suggest) would silently do nothing on the live page — it would just be more unused data, the same as the other 9 entries' arrays are today. **Recommendation, not implemented in this pass:** either (a) build a small "Related categories" render block that consumes `internalLinks` generically across all `categorySeo.ts`-backed pages — a one-time investment that would retroactively activate this data for all 10 categories at once, or (b) add one explicit, hand-placed link in the Needles & Syringes page copy/FAQ answer pointing to Trocars, as a narrower fix scoped to just this pair. Sending both options to Sardor below rather than picking one, since (a) is a bigger, cross-cutting decision than this one page pair.

---

## 7. Metadata implementation — before/after log

Per the ticket, Shopify-side title/meta edits belong to Izzy where the site has a real Shopify-side SEO control. **This site does not have one for category pages** — the actual control is the hardcoded `lib/seo/categorySeo.ts` TypeScript registry (confirmed by reading `components/category/CategoryPageView.tsx`'s `buildCategoryMetadata`, which prefers `getCategorySeo(slug)` over Shopify's own `seo.title`/`seo.description` fields whenever a registry entry exists). This is the exact same fact the OCC ticket discovered for `lib/seo/solutionSeo.ts` — implemented directly in code this session for the same reason: there is no separate Shopify field for Izzy to edit herself.

| Field | Before | After |
|---|---|---|
| Title (`<title>`/OG/schema) | *(no registry entry — fell back to registry `displayName`, "Trocars & Trocar Kits", ignoring Shopify's own uncontrolled `seo.title` which historically read `"Trocars & Trocar Kits - 3.2mm, 3.5mm, 4.5mm - FDA Registered"`)* | **`Trocars & Trocar Kits \| 3.2mm, 3.5mm & 4.5mm \| MDSupplies`** |
| Meta description | *(fell back to the bare registry `shortDescription`: "Disposable and reusable trocars in 3.2mm, 3.5mm, and 4.5mm, plus trocar kits and kit-without-trocar options for clinical and procedural use.")* | **`Shop trocars and trocar kits — 3.2mm to 4.5mm, disposable and reusable, for hormone pellet insertion and minor procedures. Wholesale case pricing.`** |
| H1 | `Trocars & Trocar Kits` | **Kept — no change.** Already accurate, matches nav/breadcrumb/Shopify collection title; changing it would create a mismatch, not fix one. |
| Above-grid answer block | *(none — this field did not exist for this route before)* | Added: names the specific procedural use cases (hormone pellet insertion, laparoscopic access, minor procedures) and audiences (HRT clinics, urgent care, outpatient surgical centers) — sourced from Shopify's own collection body copy (§2), not invented |
| FAQ | *(none)* | Added 5 items (sizing, disposable-vs-reusable, hormone-pellet use, kit contents, bulk ordering) — see `lib/seo/faqSeo.ts` `CATEGORY_FAQS['trocars-trocar-kits']`, each traceable to a finding in §2–§4 |
| Internal links (data field) | *(none)* | Added `/category/surgery-procedure`, `/category/needles-syringes`, `/industries/hrt-clinics`, `/partners/kadara` — see §6 caveat: this field does not yet render anywhere |

**Implementation:** `lib/seo/categorySeo.ts` (new `'trocars-trocar-kits'` entry in `CATEGORY_SEO_DB`) and `lib/seo/faqSeo.ts` (new `CATEGORY_FAQS['trocars-trocar-kits']`). No claim restated that this codebase cannot verify (no "FDA Registered," no shipping/regulatory superlatives) — same compliance posture the 2026-08-20 repair pass and the OCC ticket both established.

**Verification run after the edit:**
```
npx vitest run components/category lib/seo   → 231/231 passing
npx tsc --noEmit                              → clean
npx vitest run                                → 2013/2013 passing (full suite, no regressions)
```
The existing regression tests in `components/category/__tests__/buildCategoryMetadata.test.tsx` (which specifically assert the Trocar route's title contains "Trocars & Trocar Kits," never restates "FDA," and its description matches `/3\.2mm/` and `/trocar kits/i`) pass unchanged against the new copy — confirming the new title/description satisfy the same constraints the 2026-08-20 pass encoded into tests, not just this document's own claims.

**Not done in this pass, flagged rather than skipped silently:**
- Live Rich Results / SERP-preview screenshot of the new title/description — needs a deployed preview URL (see §0's deploy blocker) or a local `next build && next start` screenshot; not captured in this text-only research pass.
- `surgery-procedure`'s own metadata remains uncontrolled (Shopify-sourced) — out of this session's mandatory scope (Trocars only), but it's the most obvious Tier-2 candidate given it's the direct parent page and already has 319+ live products (see companion universe doc).

---

## 8. Sardor developer brief

Per the ticket, metadata alone doesn't finish this — this is the one item that needs a code/content decision beyond what's already shipped this session.

> **Page:** `/category/needles-syringes` (source) → `/category/trocars-trocar-kits` (destination)
> **Search intent this serves:** an HRT/hormone-pellet buyer or clinic-supply generalist who lands on Needles & Syringes (a much bigger, more general page — 592 products per the production snapshot) has no path from there to the curated Trocar assortment, despite Needles & Syringes' own `categorySeo.ts` `croNotes` field already flagging this exact buyer segment as high-LTV and explicitly recommending the link.
> **Primary target/topic:** cross-sell from general injection/needle buyers to the pellet-insertion-specific Trocar assortment.
> **Supporting evidence:** §4's SERP research confirms hormone pellet insertion is a real, separately-searched cluster with dedicated competitor content; §2/§6 confirm the link is documented as intended (`croNotes`) but never implemented, and that the underlying `internalLinks` data field has no renderer anywhere in the codebase today.
> **Current defect:** not a missing idea — a documented-but-never-wired intent, compounded by a codebase-wide gap (no component reads `PageSEO.internalLinks` for any of the 10 now-researched category pages, not just this pair).
> **Two options, not pre-decided:**
> 1. **Narrow fix:** add one explicit, hand-authored link/mention to Needles & Syringes' page (e.g., in its answer block or as a FAQ item: "Looking for trocars for pellet insertion? See our Trocars & Trocar Kits.") — smallest possible change, fixes only this one pair.
> 2. **Systemic fix:** build a small, generic "Related categories" section in `CategoryPageView.tsx` that renders `seoData.internalLinks` for any page that has a `categorySeo.ts` entry — retroactively activates this data for all 10 currently-researched categories (the 9 prior + Trocars), not just this pair. Bigger scope, but stops the same "documented, never rendered" gap from recurring on every future `categorySeo.ts` addition.
> **H1:** No change requested, either page.
> **Above-grid/below-grid content:** No new content block requested — this is a link-only gap, not a content gap.
> **FAQ:** No new FAQ needed on the Needles & Syringes side specifically (unless Sardor picks option 1's FAQ-item approach).
> **UX/CRO constraint:** Whichever option is chosen, keep it below the fold / secondary — Needles & Syringes' own product grid must stay the priority, per the ticket's ecommerce-first rule.
> **Compliance:** none — no regulatory/claim language involved in this particular change.

No other Tier-1-blocking Sardor work identified this pass — the Trocar page's own title/H1/answer/FAQ changes were all achievable directly in `categorySeo.ts`/`faqSeo.ts` data (see §7), because the existing rendering plumbing (`CategoryPageView.tsx`) already generically consumes those three fields for every category with a registry entry.

---

## 9. Measurement plan

Same starting-point caveat as the OCC ticket: no baseline can be pulled yet (§1's GSC gap), and nothing will move until the site-wide noindex/deploy blocker (§0) clears. Once both are resolved:

1. **GSC:** pull a baseline now (even under the current noindex state, to have a true "before") for `/category/trocars-trocar-kits`, `/category/surgery-procedure`, and any URL matching `trocar` — then re-check monthly.
2. **Cannibalization:** confirm in GSC's Coverage/URL Inspection that `/collections/trocars-trocar-kits` drops out of the index once the deploy ships and the canonical route becomes the sole indexed URL for this cluster (§4).
3. **Rankings:** track position for the exact query set tested in §4 (not invented queries) via whatever rank tracker is in use.
4. **Commerce:** organic-landing sessions to `/category/trocars-trocar-kits`, plus add-to-cart/checkout completion on that collection, once GA/Shopify analytics access is available.
5. Do not judge the change after only a few days — the ticket's own instruction, repeated here because the deploy-gap timeline makes it especially easy to misread "no movement yet" as "the change didn't work" when the real cause is "not live yet."

---

## 10. What's next — honest state of the broader opportunity model

The ticket's Phase 0–5 ask spans all ~25 L1 categories plus their subcategories, scored on demonstrated demand, ranking foothold, achievable competition, commercial intent, catalog depth, business importance, page quality, link leverage, and cannibalization risk — reproducibly documented. **That full scoring exercise is not done, and this document does not pretend it is.** Doing it honestly requires the GSC/Ahrefs/Keyword Planner access this environment doesn't have (§1) — inventing volume/KD numbers for 24 more categories to fill out a table would violate the ticket's own evidence-discipline rule worse than leaving it explicitly open.

What *is* defensible without that data, per the companion `CANONICAL-CATEGORY-UNIVERSE.md`:
- The 9 already-"complete" categories plus Trocars (this session) are Tier 1 by definition (already researched and approved, or the client's own named priority).
- The 16 categories with zero `categorySeo.ts` entry are the real Tier-2/candidate pool. `surgery-procedure` (Trocar's own direct parent, 319 live products, currently fully uncontrolled metadata) is the most obviously-motivated next pick given it's already half-audited by this session — but that's a **recommendation**, not a scored Tier assignment, and it's called out as such rather than smuggled in as Tier 2 without the volume/KD/GSC evidence the ticket requires for a real tier call.

**Action needed from Izzy (or whoever holds the GSC/Ahrefs/Keyword-Planner seats):** the same ask the OCC ticket made — pull query-level GSC data (12–16 months where available) and an Ahrefs volume/KD/referring-domains export for the candidate list above, so the next pass can build the reproducible priority model the ticket actually asks for, rather than a second directional-only pass.

---

## Deliverables checklist

- [x] Canonical category-universe sheet/report (`CANONICAL-CATEGORY-UNIVERSE.md`)
- [ ] Evidence-backed opportunity model across all 25 categories — **blocked**, no GSC/Ahrefs/Keyword-Planner access (§1, §10); Trocars itself is fully evidence-backed
- [ ] Keyword-to-URL map and cannibalization check, site-wide — Trocars' own cannibalization checked and documented (§4); not extended to the other 24 categories this pass
- [x] Tier 1/2/3/Not-ready classification — done for Trocars (Tier 1, implemented) and directionally for the rest (§10); not a scored, reproducible model for all 25 yet
- [x] Dedicated Trocars & Trocar Kits deep dive (§2–§8)
- [x] Before/after metadata log (§7)
- [x] Implemented metadata for the approved page (§7, `lib/seo/categorySeo.ts` + `lib/seo/faqSeo.ts`, tests passing)
- [x] Sardor developer brief for the one identified code/content need (§8)
- [x] Measurement baseline and monitoring plan (§9)

## Acceptance criteria

- [x] Category universe reflects the current live canonical site, not a stale spreadsheet — built from `lib/category-tree.ts`/`lib/seo/categorySeo.ts` plus a live Storefront API cross-check
- [x] Trocars & Trocar Kits recommendations use multiple evidence sources (live catalog/facet data, SERP research, in-repo backlink exports, existing code/test history) — not volume/KD in isolation, because none was available
- [x] Catalog/business reality incorporated — assortment depth and mix checked before writing any copy (§3)
- [x] Cannibalization checked before finalizing the Trocar page's targets (§4)
- [x] Trocars & Trocar Kits receives a complete Tier-1 plan
- [ ] "Izzy implements approved Shopify title/meta changes and logs them" — **implemented directly in this session's code** instead, because this site has no separate Shopify-side SEO field for category pages to implement into (§7); the before/after log itself is in place
- [x] The one Sardor handoff produced is URL-specific, evidence-backed, and implementation-ready (§8), including two clearly-scoped options rather than a vague ask
- [x] No mass templated metadata, no thin keyword pages, no unsupported claims (no "FDA Registered" restated, no invented volume figures)
