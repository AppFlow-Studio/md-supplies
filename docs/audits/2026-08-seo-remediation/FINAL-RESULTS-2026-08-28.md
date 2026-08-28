# Private Practice + Structured Data + Designer Polish — Results

**Branch:** `catalog-cro-review`
**Starting SHA:** `2ce405f` (Merge pull request #70 from BilalA99/nav-filter-ui-polish)
**Final SHA:** `9a86736`


## What was fixed (code)

| Item | Before | After | Commit |
|---|---|---|---|
| `/industries/private-practice` | Live thin `noindex,follow` page, competing with Clinics | 301 → `/industries/clinics-doctors-offices` | `232bb1e` |
| `/Medical-Supplies-for-Doctors.html` | 301 → `/industries/private-practice` (the thin page) | 301 → `/industries/clinics-doctors-offices` directly (no chain) | `232bb1e` |
| Account "Clinics" shortcut | `href="/industries/private-practice"` | `href="/industries/clinics-doctors-offices"` | `232bb1e` |
| Surgical-sutures "Shop by Need" strip + SEO internal links | Linked `/industries/private-practice` | Linked `/industries/clinics-doctors-offices` directly | `232bb1e` |
| `lib/industries.ts` Private Practice entry | Dead, never-indexable entry (no `tag`, no `faq`) still in the array | Removed | `232bb1e` |
| Clinics & Doctor's Offices page copy | No "private practice" intent | `description`/`buyerType` updated + new FAQ entry, H1 untouched | `232bb1e` |
| `/category/private-practice` | 404 | Still 404 — confirmed zero internal links anywhere in the repo | no change (verified) |
| 12 pharmacy/HRT Rich Results errors | `ProductSchema.tsx` correctly omitted `offers` for zero-price items, but never emits `review`/`aggregateRating` either → a quote-only product's Product node had none of the three Google requires | `ProductSchema` returns `null` (skips the whole block) when price isn't usable, instead of submitting an incomplete node | `05e0d63` |
| PDP recommendation sections (DESIGN-01) | Order: Frequently Bought With → You May Also Like → You May Also Need (overflow) | Order: Frequently Bought With → You May Also Need → **Similar Products** (relabeled from "You May Also Like"); background stripe re-alternated to match | `111b73a` |
| Trusted Brands spacing (DESIGN-03) | `mr-[22px]` | `mr-[40px]` | `02ea6f7` |
| Mobile PDP variant/option control (DESIGN-02) | Desktop button grid only, no distinct mobile presentation | Native dropdown/select on mobile (`sm:hidden`), desktop grid unchanged (`hidden sm:flex`); both read one shared `valueMeta()` computation so purchasability/price logic can't drift between them | `9a86736` |

## Verification (this session, on `9a86736`)

### `npx vitest run`
```
Test Files  158 passed (158)
     Tests  1720 passed (1720)
```
(9 net-new tests: `components/product/__tests__/VariantSelector.test.tsx`, DESIGN-02's regression matrix.)

### `npx tsc --noEmit`
Clean, zero errors.

### `npx eslint . --max-warnings 0`
Clean, zero errors/warnings.

### `npm run build`
`✓ Compiled successfully`, TypeScript pass clean, 70/70 static pages generated including the sitemap index/shards.

## Root-cause note: structured data (12 pharmacy/HRT errors)

`FINAL-RESULTS-P1.md` left this open, having ruled out the "zero-price Offer" theory and correctly declined to guess further. This session's evidence:

- The 2026-08-21 audit's 12-row notice is entirely on `/category/pharmacy-products/<handle>` nested PDP pages, flagged on `Product`/`BreadcrumbList`/`OnlineStore` (`docs/audits/2026-08-21-seo-audit-triage.md:208`).
- A representative handle, `precision-dose-phentermine-37-5mg-...` (a Schedule IV controlled substance), is confirmed both zero-price (`docs/audits/2026-08-02-catalog-cro/zero-price-active-variants.csv:38`) and RX-flagged.
- `ProductSchema.tsx` already correctly omits `offers` for an unusable price (the ruled-out theory), but the component never emits `review` or `aggregateRating` under any circumstances. Google's Product rich result requires at least one of `offers`/`review`/`aggregateRating` — a quote-only pharmacy product had none of the three, a genuine "missing required field" error distinct from what was already checked.
- Fix: skip the `<script>` block entirely for unusable-price products rather than submit an incomplete `Product` node.

**Not independently confirmed against Google's actual Rich Results Test tool** — see Blocked, below.

## Blocked / needs your action

These are the parts of Bilal's approval this session could not do, either because they're outside what a code change can accomplish, or because this environment had no working credentials/browser access:

1. **P0 infra (apex↔www redirect direction, sitewide `noindex,nofollow`, robots.txt `Disallow: /`).** All three trace to Vercel/Cloudflare domain and environment-variable configuration, not app code — confirmed by re-reading `lib/seo/robots-config.ts`, `lib/seo/robots.ts`, `lib/site-config.ts`, `lib/seo/constants.ts` directly; all four are already correct. The drafted message is at `BILAL-HANDOFF.md`. **Please confirm whether Bilal has actually flipped these settings** — nothing in this repo can verify that.
2. **Preview deploy, smoke test, and the merge/deploy of `catalog-cro-review-sardor-dev` to production.** Investigation found `catalog-cro-review` (this branch, pre-existing) and `origin/main` already have an identical tree — the P0+P1 sardor-dev work is already fully incorporated into both, so there was nothing left to reconcile. The commits in this session's work (`232bb1e`..`9a86736`) are **not pushed or merged anywhere** — this repo/session has no Vercel deploy access, and merge/deploy to production is a separate, explicitly-confirmed action per your instructions.
3. **Live confirmation of the structured-data root cause via Google's Rich Results Test.** No browser extension was connected in this environment, and a direct HTTP fetch of the live site was blocked by Vercel's bot-mitigation challenge (429, `X-Vercel-Mitigated: challenge`) rather than serving HTML. The fix above is grounded in Google's documented Product structured-data requirements plus repo evidence, not a live-tool confirmation. **Recommend running the Rich Results Test against a real `/category/pharmacy-products/<handle>` URL** before and after this deploys.
4. **Fresh Ahrefs re-crawl** and everything gated on it (P1 orphan/one-inlink analysis, singular/plural taxonomy review, filter/facet crawl-control decision). Needs your Ahrefs account access.


