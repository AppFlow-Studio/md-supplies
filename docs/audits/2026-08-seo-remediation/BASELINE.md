# Phase 0 — Baseline (P0 remediation pass)

**Captured:** 2026-08-24
**Branch:** `catalog-cro-review-sardor-dev`
**Starting SHA:** `e21205ccdf1bda800e69a4c00d2f710a3d840603`
**Working tree:** clean at capture time
**Deployment target:** Vercel (domains `mdsupplies.com` / `www.mdsupplies.com`, DNS on Cloudflare per `docs/launch/2026-07-19-cutover-rollback-runbook.md:9-10,78-81`)
**Source evidence:** `mdsupplies_21-aug-2026_all-issues_2026-08-21_08-06-40.zip` (89 CSVs), crawled 2026-08-21 08:06. Extracted copy used for this pass:
`C:\Users\sarik\AppData\Local\Temp\claude\...\scratchpad\ahrefs\` (not committed — raw export, regenerate from the original ZIP if needed).

This baseline builds directly on `docs/audits/2026-08-21-seo-audit-triage.md` (prior session, same CSV export) rather than re-deriving it. That triage is **root-cause-verified against this repo's source**, not just CSV-sampled. Its six findings, cross-checked again on this session's `HEAD`:

## Findings carried forward, re-verified at `e21205c`

| # | Finding | Status at this baseline | Owner |
|---|---|---|---|
| 1 | Apex `mdsupplies.com` redirects **to** `www` (308) — backwards from `lib/seo/constants.ts`'s assumption that apex is canonical | Unchanged. Not fixable in this repo — lives in Vercel Domains / Cloudflare. | Infra (Bilal) — see `BILAL-HANDOFF.md` |
| 2 | `www.mdsupplies.com` serves `noindex,nofollow` sitewide — `IS_STAGING`/`VERCEL_ENV` bound wrong for the domain serving real traffic | Unchanged. Code (`lib/seo/robots.ts`, `lib/site-config.ts`) is correct; the binding is infra. | Infra (Bilal) — see `BILAL-HANDOFF.md` |
| 3 | No blanket `/collections/<handle>` → `/category/<slug>` redirect (only `trocars-trocar-kits` was hand-written) | **Regressed further since the triage was written.** See "New finding" below — a full 25-category registry-driven version existed at commit `213a1b6` and was reverted by merge `e21205c`. Current `HEAD` has only 2 of 25 L1 categories covered (`trocars-trocar-kits`, `surgery-procedure`). | This plan, Tasks 2–3 |
| 4 | 3,984/4,286 orphan-page notices are Shopify-legacy-sitemap-only URLs, need a set-diff decision against `docs/redirects-ready.json` | Unchanged, not yet actioned. Out of scope for this P0 pass (P1 territory) — flagged for the next plan. | Next plan (P1) |
| 5 | Real content-level SEO issues (552 long meta descriptions, 260 long titles, 12 structured-data errors, etc.) on live indexable apex pages | Unchanged, Shopify content data, not app code. Out of scope here. | Content ops / Shopify Admin |
| 6 | Everything else (redirected CSS/JS/image warnings, nofollow-outgoing-link volume, IndexNow submissions) is downstream noise from #1–#4 | Unchanged. | — |

## New finding this session: merge regression on `proxy.ts`

Commit `213a1b6` (2026-08-21, this branch) shipped a **registry-driven** `/collections/<handle>` → `/category/<slug>` redirect: a `L1_BY_LEGACY_COLLECTION_HANDLE` map built from all 25 `CATEGORY_TREE_L1` entries (keyed by both `tag` and `collectionHandle` — 50 keys total), plus a nested `/collections/<collection>/products/<handle>` → `/product/<handle>` resolver, plus an inline `/collections/occ` → `/solutions/occ` rule. Commit `546a284` added a full registry-sweep regression test for it.

Merge commit `e21205c` (`Merge remote-tracking branch 'origin/catalog-cro-review' into catalog-cro-review-sardor-dev`) has two parents: `213a1b6` (this branch, with the registry-driven redirect above) and `e07af24` (`origin/catalog-cro-review`, carrying an **older**, hand-written 2-entry `LEGACY_COLLECTION_HANDLES` Set dated "P0.7, 2026-08-20"). The merge resolution kept `e07af24`'s older `proxy.ts` content wholesale instead of reconciling the two — silently dropping the newer, broader, already-tested implementation. Confirmed via:

```
git diff 213a1b6 HEAD -- proxy.ts
```

which shows the full `L1_BY_LEGACY_COLLECTION_HANDLE` map, `redirectLegacyCollectionUrl()`, and the nested products-under-collection resolver being removed and replaced by the narrower `LEGACY_COLLECTION_HANDLES` Set + `redirectLegacyCollection()` still present at `HEAD`.

Also confirmed: at `213a1b6`, `L1_BY_LEGACY_COLLECTION_HANDLE` was built only from `CATEGORY_TREE_L1` — it would **not** have matched `trocars-trocar-kits`, which is a `FEATURED_SUBCATEGORIES` entry, not an L1 (`lib/category-tree.ts:169-184`). Whether that specific case was actually passing at `213a1b6` wasn't re-derived here; Task 2 below treats it as a fresh requirement (TDD from scratch) rather than assuming the historical commit was fully correct, so it is not blindly restored — it is rebuilt and driven by tests that cover the case history missed.

## Not attempted this session

Live `curl` verification against `mdsupplies.com` / `www.mdsupplies.com` was not attempted — the prior triage session documented Vercel's bot-protection challenge blocking every attempt (`HTTP 429`, `X-Vercel-Mitigated: challenge`), including with a Googlebot user-agent. This baseline, like the triage it builds on, rests on CSV evidence + source cross-reference, not a fresh live probe. Re-verify with `curl -sIL https://mdsupplies.com/` from an unblocked network before signing off Finding 1/2's live state.

## Resolved this plan (Tasks 1–3 completed, 2026-08-24)

Tasks 1–3 of the P0 remediation plan landed and resolved the **merge regression on Finding 3** documented above:

- **Task 1 (commit `5aef490`):** Restored the registry-driven `/collections/<handle>` → `/category/<slug>` redirect, covering all 25 L1 categories plus featured subcategories (`CATEGORY_TREE_L1` + `FEATURED_SUBCATEGORIES` via `lib/category-tree.ts`), keyed by both `tag` and `collectionHandle` forms (50+ keys total).
- **Task 2 (commit `536f76c`):** Fixed the `/bariatricproducts` vanity URL redirect loop (now 301 to `/category/bariatric`, routed through the existing registry).
- **Task 3 (commit `6c155f8`):** Added global no-chain/no-loop regression guardrail test covering all static entries and both category registries, plus a per-rule proxy test suite.

**Result:** Finding 3 (missing `/collections/<handle>` coverage) now shows:
- Before: 2 of 25 categories (hardcoded Set, plus merge regression)
- After: All 25 categories + featured subcategories, via registry-driven redirect with TDD-validated coverage and regression guardrails

**Out of scope for this plan:**
- Finding 1 (apex ↔ www redirect direction): Infra, documented in `BILAL-HANDOFF.md`
- Finding 2 (sitewide `www` noindex): Infra, documented in `BILAL-HANDOFF.md`
- Finding 4 (sitemap-only orphan URLs): P1 scope
- Finding 5 (content-level SEO): Content ops / Shopify Admin
- Finding 6 (downstream noise): Resolved by 1–5

## Resolved this plan (P1, 2026-08-25)

The P1 remediation plan (`docs/superpowers/plans/2026-08-25-seo-p1-remediation.md`) landed Tasks 1–4 on this branch, `190a089..aa20f49`:

- **Task 1 (commit `6dd0a49`):** Collapsed the 7 self-titled duplicate `/category/<x>/<x>` pages (e.g. `/category/hygiene/hygiene`) by excluding any subcategory tag equal to its own resolved parent tag from `buildL2Tree` (`lib/category-tree.ts`) — fixing nav, the footer subcategory list, and the sitemap in one place, since all three consume that function's output — plus an explicit URL-level redirect in `app/category/[slug]/[product]/page.tsx` so the URL itself resolves cleanly instead of 404ing.
- **Task 2 (commit `d7b084b`):** Added two new legacy redirects: `/collections/all` → `/categories` and `/a/sitemap-tools/sitemap` → `/sitemap.xml` (the latter had 8,128 inlinks per the 2026-08-21 Ahrefs export).
- **Task 3 (commits `3286b5c`..`1669f04`):** Replaced the single flat sitemap (`getSitemapUrls()`) with a sitemap index (`/sitemap.xml`) plus sharded children (`content` shard + product shards at 2,000 URLs/file) via Next's native `generateSitemaps()`.
- **Task 4 (commit `aa20f49`):** Implemented IndexNow — submits the affected product/category URL on real `products/*`/`collections/*` Shopify webhook topics, fire-and-forget, never blocking the webhook response. Previously not implemented anywhere in the repo.

**Result:** Full verification recorded in `FINAL-RESULTS-P1.md` — `npm test` (151 files / 1627 tests passing), `tsc --noEmit` clean, `npm run build` clean (one pre-existing, unrelated Turbopack warning), and live dev-server checks. The two Task 2 redirects and the Task 3 sitemap index were confirmed working exactly as designed. **One gap found during this verification pass, not yet fixed:** the Task 1 URL-level redirect for `/category/hygiene/hygiene` does not issue an HTTP 301 (or any 3xx) — it degrades to a client-side `<meta http-equiv="refresh">` tag because `redirect()` in this Next.js fork emits a meta-refresh instead of an HTTP redirect header when called in a streaming context (this route streams via the root `Suspense` boundary; see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md:12`). The registry-level exclusion (nav/footer/sitemap) works correctly; only the URL's own redirect signal is weaker than intended. See `FINAL-RESULTS-P1.md`'s Verification section for the full trace and a suggested fix direction.

**Out of scope for this plan (P1):**
- Finding 4 (sitemap-only orphan URLs) is **still NOT resolved** by this plan. P1-01 (orphan/one-inlink pages) and the P1-02 singular/plural taxonomy consolidation list both require a live post-P0 Ahrefs re-crawl to know what's still actually live — the existing CSVs predate the P0 redirect/collection fixes and were never committed to this repo, so scoping either item from stale data risks "fixing" a pair P0 already collapsed. See this plan's own "What this plan does NOT do" section (`docs/superpowers/plans/2026-08-25-seo-p1-remediation.md`) for the full reasoning. Left for the next plan, after a re-crawl.
- robots.txt filter/sort/param disallow rules and the `/checkout` disallow suggestion: not implemented, would be regressions or are moot — see the plan's own header section.
- Structured-data fix for the 12 pharmacy/HRT-clinic Rich Results errors: the prior session's hypothesis doesn't hold against current code; needs a live Rich Results Test or fresh Ahrefs export, not a guess-fix.
- Master plan P2 (metadata/images/performance) and P3 (remaining designer feedback items): untouched, per the original P0 handoff's own sequencing (P1 before P2/P3).
