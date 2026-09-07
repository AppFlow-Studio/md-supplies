# 8-ticket completion review — 2026-09-07

Branch checked: `catalog-cro-review`. This document answers two things for each
ticket: **(1) is it actually done**, based on what exists in the repo (code,
tests, docs) — not on commit messages alone — and **(2) exactly how to
generate the screenshot/evidence set the ticket asks for**, using the
evidence-capture pattern this repo already has.

Only `DEV-REVIEWS-01` was pasted with its full ticket body; the other seven
were pasted as titles only. For those seven, status is inferred from the
matching code/commits/docs — treat it as a strong best-effort read, not a
line-by-line DoD check against text I never saw. If any of those tickets have
a hidden checklist (like the Reviews one does), re-run this review against
the real text.

## Site-wide fact that touches every ticket below

Per `docs/audits/2026-08-seo-remediation/STATUS-REPORT-2026-08-27.md`,
production (`www.mdsupplies.com`) is currently serving `noindex,nofollow`
sitewide with `robots.txt: Disallow: /`, and **~201 commits on this branch are
unmerged/undeployed**. Nothing below is live for real customers or crawlable
by Google yet, regardless of code state. That's an infra/deploy blocker, not
a defect in any individual ticket — but it means "verified in the deployed
preview" (several tickets' own completion bar) still needs a real Vercel
preview URL, separate from this production blocker.

---

## Summary table

| Ticket | Status | Blocking item |
|---|---|---|
| DEV-REVIEWS-01 | 🟡 Code complete, **not Done** | No TrustShop key ever provisioned in this environment; zero evidence/screenshots exist; no completion report posted |
| DEV-FAVORITES-01 | 🟡 Code complete, unverified | No screenshots/evidence attached anywhere in repo |
| SEO-CATEGORY-01 | 🔴 Not started | No research doc, no Trocars Tier-1 plan exists anywhere |
| DEV-PARTNERS-01 | 🟢 Done, evidence exists as data (not screenshots) | 19 brands still on text-fallback pending real logo re-upload (tracked, not a defect) |
| DEV-NAV-01 | 🟡 Code complete, unverified visually | No screenshots attached; "stable" behavior needs a human/visual check |
| SEO-OCC-01 | 🟢 Done (research + fixes shipped) | 2 of 9 checklist items structurally blocked on GSC/Shopify Admin access (not dev's to close) |
| DEV-BACKLINK-01 | 🟡 Code complete, explicitly not fully closed | 8 rows in `EXCEPTIONS.md` await Izzy's sign-off; only verified against QA store, not production |
| DEV-SEO-CATEGORY-01 | 🔴 Not started | Depends on SEO-CATEGORY-01's approval, which doesn't exist yet; `categorySeo.ts` has no Trocars/Surgery entry |

---

## 1. DEV-REVIEWS-01 — TrustShop reviews

**What exists:** This is real, substantial work — `lib/trustshop/{client,product,store,schemas,types,product-id,normalize,collection-summaries,observability,write-schema,store-write-schema}.ts`, all 12 components the ticket's architecture diagram names under `components/reviews/`, `app/api/reviews/{product,store}/route.ts`, `app/reviews/page.tsx`, JSON-LD wired for `aggregateRating`, N+1-safe bounded-concurrency summary batching for cards, and `e2e/product-reviews.spec.ts` + `e2e/store-reviews.spec.ts`. 376 unit/integration tests pass repo-wide including everything under `lib/trustshop` and `app/api/reviews`.

**Why it is not Done:** The ticket's own hard rule is explicit: *"not Done until the implementation works in the deployed preview, automated tests pass, and the required screenshots/evidence are attached."* The commit itself (`0b8a2a6`) states plainly: *"No live TrustShop key was available this session — everything is built and tested against the documented contract; the real key still needs to be provisioned server-side."* Confirmed: no `TRUSTSHOP_API_BASE_URL`/`TRUSTSHOP_INTEGRATION_KEY` anywhere in `.env.local` or `.env.example`. That means:
- Nothing has ever round-tripped against the real TrustShop API.
- None of the 18 required screenshots exist (no `screenshots/` folder for this ticket anywhere in the repo).
- The "Developer handoff / completion report" (branch/SHA, preview URL, tested product IDs, etc.) has not been posted.
- The P0 security rotation step can't be confirmed done from code alone — it requires the actual Vercel env config, which this session cannot see.

**How to get the evidence, once a real key exists:**
1. Get the rotated `TRUSTSHOP_INTEGRATION_KEY` from whoever owns the TrustShop account, set it server-side only (Vercel Project Settings → Environment Variables → Production/Preview, **never** `NEXT_PUBLIC_*`).
2. Deploy/redeploy the Vercel preview for this branch so the key is live there.
3. Pick 2–3 real Shopify product IDs that have TrustShop reviews (ask whoever seeded TrustShop data) plus one with zero reviews.
4. Run the existing suites and keep the terminal output as evidence:
   ```
   npx vitest run lib/trustshop components/reviews app/api/reviews
   npx playwright test e2e/product-reviews.spec.ts e2e/store-reviews.spec.ts --reporter=list
   ```
5. Write a new capture spec modeled on `e2e/evidence-capture.spec.ts` (see §"Evidence-capture pattern" below) that visits: a reviewed PDP, a zero-review PDP, `#reviews` with `?filter=5_star`, a sort change, page 2 / Load More, a review with `buyer_verification: true`, one with a merchant reply, the media gallery/lightbox, `/category/<any>` and `/search` (mixed reviewed/unreviewed cards), the write-review form (empty + invalid + success states), and `/reviews` (store reviews).
6. For the bearer-token proof: open Chrome DevTools → Network tab on the PDP, filter by `trustshop`/`XHR`, confirm all TrustShop calls originate from `/api/*` (server) not the browser directly, and confirm none of the request/response bodies visible client-side contain an `Authorization` header. Screenshot the Network panel with the request headers of one such call expanded, and also run `npx next build` then `grep -r "TRUSTSHOP_INTEGRATION_KEY\|Bearer " .next/static .next/server 2>/dev/null` — a clean (empty) result is the evidence.
7. For JSON-LD: paste the reviewed and zero-review PDP URLs into Google's Rich Results Test, screenshot both results.
8. For performance: run Lighthouse (Chrome DevTools → Lighthouse tab, or `npx lighthouse <preview-url>/product/<slug> --view`) on a reviewed PDP before/after this branch, or against `main` vs. this branch, and screenshot the score comparison.
9. Compile all of the above into the ticket's "Developer handoff" section before moving Status to Done.

---

## 2. DEV-FAVORITES-01 — Persistent account-based saved products

**What exists:** `app/actions/favorites.ts`, `components/product/FavoriteButton.tsx`, `components/account/AccountFavoritesGrid.tsx`, `app/(noindex)/account/favorites/`, `lib/shopify/favorites-admin.ts` (Shopify Admin metafield-backed persistence, reusing the RX-gate's client/token architecture). Guest-to-login handoff via a short-lived cookie is implemented per the commit message. All related unit tests pass.

**Gap:** No screenshots or evidence of any kind exist in the repo for this ticket. I don't have the original ticket's DoD/checklist text, so I can't confirm every acceptance line — only that the described feature is implemented and tested.

**How to capture evidence:**
1. As a logged-out visitor: click the heart on a PDP card, then log in / create an account, and confirm the favorite survived the handoff. Screenshot before login (heart filled, cookie-only) and after login (heart still filled, now persisted).
2. As a logged-in customer: favorite products from a PDP, a category grid, and search results; screenshot each surface with the heart in its "favorited" state.
3. Visit `/account/favorites`, screenshot the grid (desktop + mobile, e.g. 390×844 and 1440×900 like the existing evidence-capture pattern uses).
4. Un-favorite one item from the account page and screenshot it disappearing/updating.
5. Run `npx vitest run app/actions/__tests__/favorites.test.ts lib/shopify/__tests__/favorites-admin.test.ts` and keep the pass-count output.

---

## 3. SEO-CATEGORY-01 — Category opportunity research, metadata + Trocars Tier-1 plan

**Status: not started.** I searched the whole `docs/` tree and `lib/seo/categorySeo.ts` for any Trocars/Tier-1 research artifact — none exists. `categorySeo.ts` currently only has on-page SEO entries for 9 categories: `wound-care`, `gloves`, `surgical-sutures`, `mobility`, `needles-syringes`, `face-masks`, `pharmacy-products`, `surgical-sutures-absorbable-sutures`, `pharmacy-products-pharmacy-labels`. Neither `surgery-procedure` nor `trocars-trocar-kits` is in that list. The closest related note is a "judgement call" flagged for Bilal in `docs/audits/2026-08-20-surgery-trocar-repair/README.md` about the Trocar collection's Shopify `seo.title` containing an unverifiable "FDA Registered" claim — that's a caution, not a completed plan, and it predates this ticket.

**This ticket has no code output, so there is no evidence to capture yet.** When it's picked up, use `docs/audits/2026-09-06-occ-seo-strategy/OCC-SEO-STRATEGY.md` as the structural template (it's the most recent, complete example of this exact deliverable shape in this repo: existing-asset audit → SERP/keyword evidence → competitor gaps → architecture recommendation → metadata before/after log → a scoped "Sardor brief" → measurement plan). The eventual evidence for *this* ticket is the research doc itself plus a before/after metadata diff for whichever categories it recommends (most likely `surgery-procedure` and `trocars-trocar-kits`, given the ticket name) — screenshots aren't really the right medium for a research ticket; a Rich Results Test screenshot only becomes relevant once `DEV-SEO-CATEGORY-01` implements what this one approves.

---

## 4. DEV-PARTNERS-01 — Repair Partners/Brands imagery and asset fallbacks

**Status: done**, and unusually well-evidenced already — just not as literal screenshots.

**What exists:** Commit `76feafe` fixed a broken `figma.com` asset URL shipped as a production `<img src>` on the Partners hero, added a regression test banning any `figma.com` reference from `app/`/`components/`, and fixed 19 brand logos that were technically loading (HTTP 200, valid image) but invisible-on-white. `docs/audits/2026-09-04-partners-brand-logo-audit.md` (generated by `scripts/audit-brand-logos.ts`) is a full machine-verified audit: 98 brand records, 79 with configured logos, all 79 resolving `200` with a valid image content-type, **zero** invisible-on-white, **zero** broken destinations. The 19 "no logo configured" brands are an intentional, tracked fallback state (text label), not a defect.

**Gap:** the audit doc is data (a table), not screenshots, so it satisfies "what's broken" but not necessarily a literal "attach a screenshot" requirement if the ticket has one.

**How to capture evidence:**
1. Re-run the audit fresh: `npx tsx scripts/audit-brand-logos.ts` (check the script for its exact invocation/flags) and keep the regenerated `.md`/`.json` as the primary evidence — it already proves 0 broken images.
2. Screenshot `/partners` directory page and the homepage "Trusted Brands"/brand marquee at desktop and mobile widths, including at least one image-logo card and one text-fallback card side by side.
3. Screenshot one individual `/partners/<slug>` detail page (e.g. `/partners/dukal`) to show the working hero image (the one that replaced the broken Figma URL).
4. Run `npx vitest run lib/__tests__/partners.test.ts` and keep the output (this includes the new figma.com-ban regression test).

---

## 5. DEV-NAV-01 — Parent category navigation + stable side-panel dropdown expansion

**What exists:** Commit `7794a83` splits each mega-menu/mobile-drawer category row into a direct name link (to the category page) plus a separate disclosure chevron (opens the subcategory side panel), matching the pattern `Header.tsx`'s top-level "Categories" trigger already used, and fixes "hover never switches the active panel" (the "stable" part of the ticket title). Touches `CategoryMegaMenu.tsx`, `Header.tsx`, `MobileCategoryNav.tsx`, plus their unit tests, and extends `e2e/responsive.spec.ts` and `e2e/surgery-trocar-split.spec.ts`.

**Gap:** No screenshots attached anywhere in the repo for this specific change. "Stable" (doesn't jump/flicker/switch on hover) is inherently a visual/interaction claim best proven with a short recording, not a single screenshot.

**How to capture evidence:**
1. Run the existing e2e coverage first: `npx playwright test e2e/responsive.spec.ts e2e/surgery-trocar-split.spec.ts e2e/keyboard-nav.spec.ts --reporter=list`.
2. Use the repo's own evidence-capture pattern (see below) to grab: mega-menu open desktop, mobile drawer open, a close-up on one row showing the name link and chevron as two distinct hit targets, and the nested Trocars-under-Surgery panel state.
3. For the "stability" claim specifically, record a short screen capture (Chrome DevTools' built-in screen recorder, or `mcp__claude-in-chrome__gif_creator` if using this session's browser tools) hovering across multiple rows without clicking, to show the panel does not switch — a GIF is much stronger evidence here than a still.

---

## 6. SEO-OCC-01 — OCC / shoebox / charity hygiene organic growth research

**Status: done.** `docs/audits/2026-09-06-occ-seo-strategy/OCC-SEO-STRATEGY.md` is a complete, dated research deliverable covering all the phases this kind of ticket implies: existing-asset audit, keyword/SERP-intent evidence for 5 distinct clusters (OCC/shoebox, "what to pack," bulk hygiene product, Orphan Grain Train-style kits, institutional/rehab kits), competitor-gap analysis, a scoped architecture recommendation (enhance `/solutions/occ`, no new page), a before/after metadata log, a small scoped dev brief for Sardor, and a measurement plan. Two real bugs were found and fixed in the same pass (commit `85f5460`): `lib/seo/solutionSeo.ts` was silently overriding the real OCC page's title/meta with copy for a fictional "Organized Customer Care" program, and the OCC FAQ recommended a now-banned shoebox item (soap). 164 tests pass per the doc's own verification note; `tsc --noEmit` clean.

**What's not closed, and correctly so:** the doc's own checklist marks 2 of 9 deliverables blocked — GSC query/impression data and full commercial/SKU-level mapping — because this environment has no Google Search Console or Shopify Admin sales-data access. That's a data-access dependency on Izzy, not unfinished dev work.

**How to capture evidence:**
1. The research doc itself is the primary evidence — attach it directly.
2. Screenshot the corrected `<title>`/meta description on `/solutions/occ` via "View Page Source" or DevTools' Elements panel (`<head>`), to show the fix from §7 of the doc actually renders.
3. Run `npx vitest run lib/__tests__/occ.test.ts lib/seo` and screenshot/paste the pass count as confirmation the doc's own verification step still holds.
4. If/when Izzy provides GSC access, re-open this ticket's Phase 2 gap rather than treating today's version as final.

---

## 7. DEV-BACKLINK-01 — Harden legacy backlink + image-asset preservation

**What exists:** Commit `5f99233` fixed a real encoding bug in `proxy.ts` (it normalized `+` to a space but never percent-decoded, so legacy URLs using `%20` 404'd), added an order-sensitive decoder, a 410 for one unrecoverable page, 410s for 9 confidently-retired historic image backlinks, one verified 301 image recovery to a live Shopify CDN asset, and 69 new regression tests. Full supporting audit trail lives in `docs/audits/2026-09-04-p0-seo-migration-integrity/` (`README.md`, `unified-inventory.md`/`.json`, `EXCEPTIONS.md`, plus the two raw Ahrefs CSV exports and `image-search-results.json`).

**Why it's not fully closed:** `EXCEPTIONS.md` explicitly lists 8 legacy image targets as "Needs Izzy SEO review" — plausible candidates that were deliberately **not** implemented because they couldn't be confidently identity-matched (or, for one life-jacket case, because it touches a USCG compliance claim). The doc also flags that everything was checked against the **QA** Shopify store, not production, and says to "re-run against the production Storefront API before treating any 'no match' below as final." Both are real, tracked open items — not oversights.

**How to capture evidence** (this ticket is redirect/HTTP-behavior evidence, not UI screenshots):
1. Run the regression suite and keep the output: `npx vitest run __tests__/proxy.test.ts`.
2. For each row in `unified-inventory.md`, curl it against a running local server and capture the status code/Location header, e.g.:
   ```
   npm run build && npm run start &
   curl -sI "http://localhost:3000/sup/images/productImages/<legacy-path>.gif"
   ```
   Save the terminal output (redirect chain, final status) as the evidence artifact — screenshot the terminal or pipe to a text file attached to the ticket.
3. Re-run `scripts/seo-migration/match-images.mts` (or whatever it's actually called — check `docs/audits/2026-09-04-p0-seo-migration-integrity/README.md` for the exact command) against the **production** Storefront API once credentials allow, to close the QA-vs-production gap the doc itself flags.
4. Send `EXCEPTIONS.md`'s 8-row table to Izzy for sign-off; only after her review can this ticket be marked fully Done.

---

## 8. DEV-SEO-CATEGORY-01 — Implement Izzy-approved category on-page SEO

**Status: not started**, and structurally can't start yet. This ticket's name ("Izzy-approved") implies it consumes an approval that would come out of `SEO-CATEGORY-01` — which, per item 3 above, hasn't produced a plan for Izzy to approve yet. Confirmed in code: `lib/seo/categorySeo.ts` has no entry for `surgery-procedure` or `trocars-trocar-kits` (the categories `SEO-CATEGORY-01`'s title suggests this is about), and no commit in this branch's history touches `categorySeo.ts` for either of them.

**No evidence to capture yet.** Once `SEO-CATEGORY-01` produces an approved plan, implementation here should follow the same before/after metadata log + Rich Results Test screenshot pattern used for the OCC fix (§6 above and `OCC-SEO-STRATEGY.md` §7).

---

## Evidence-capture pattern already used in this repo

For any ticket needing UI screenshots, don't hand-drive the browser each time — this repo has a working, reusable Playwright pattern for exactly this. See `e2e/evidence-capture.spec.ts` (written for the 2026-08-20 Surgery/Trocar pass, still functional):

- It's gated behind an env var so it never runs in normal CI/`npm run test:e2e`:
  ```ts
  test.skip(!process.env.CAPTURE_EVIDENCE, 'evidence capture — run with CAPTURE_EVIDENCE=1')
  ```
- It writes numbered PNGs to a `docs/audits/<date>-<topic>/screenshots/` folder via a tiny `shot(page, name, fullPage)` helper.
- It defines `DESKTOP = 1440×900` and `MOBILE = 390×844` viewports and takes both for every surface.
- Run it against a real local build (not `next dev`, so timing/animations match production):
  ```
  npm run build
  npm run start                                   # serves on :3000 by default
  CAPTURE_EVIDENCE=1 E2E_BASE_URL=http://localhost:3000 \
    npx playwright test e2e/evidence-capture.spec.ts --project=chromium --workers=1
  ```

**To reuse this for any of the 8 tickets above:** copy `e2e/evidence-capture.spec.ts` to something like `e2e/evidence-capture-reviews.spec.ts`, point `OUT` at a new `docs/audits/2026-09-07-<ticket-slug>/screenshots` folder, and replace the `test(...)` blocks with the routes/interactions that ticket's checklist calls for (the per-ticket sections above already list exactly which routes/states each one needs). Keep the `CAPTURE_EVIDENCE` guard — it's what stops these specs from being mistaken for real regression tests or from silently overwriting evidence in CI.

For anything that isn't a full-page shot (a DevTools Network panel, a Rich Results Test result, a Lighthouse report, a terminal `curl`/test-run output), there's no existing automation — take those manually as described in each ticket's section above.
