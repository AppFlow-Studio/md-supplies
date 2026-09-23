# SEO & Crawlability Remediation — Status Report

**Branch:** `catalog-cro-review-sardor-dev`
**Head SHA:** `ca310f6`
**Checked against:** `MDSupplies_Full_SEO_Crawlability_Designer_Execution_Plan_2026-08-22.md` (reconstructed in-repo at `docs/audits/2026-08-seo-remediation/MASTER-PLAN.md`)
**Verified:** 2026-08-27 — fresh `npm test`/`tsc`/`lint`/`build` run plus a live check of `mdsupplies.com` / `www.mdsupplies.com`

---

## The short version

**The code work is real and substantial, and I've verified it fresh — but none of it is live.** This branch is 201 commits ahead of `main` and unmerged. Production (`mdsupplies.com`) is still running a pre-remediation build.

Worse: production right now is *more* broken than the original Ahrefs audit described. As of this check, `mdsupplies.com` still redirects backwards into `www`, every page still serves `noindex,nofollow`, and `robots.txt` returns a blanket `Disallow: /` — the entire site is currently telling every search engine not to crawl it at all.

---

## What's actually done

I've landed two completed plans (P0 and P1 of the master plan) on this branch. I re-verified everything fresh just now rather than relying on the prior docs.

### Fresh verification run — 2026-08-27

```
npm test         → 153 test files, 1644 tests — all passing
npx tsc --noEmit → clean, zero output
npm run lint     → clean, 0 errors, 0 warnings
npm run build    → succeeded, 69 routes (incl. sitemap index + 2 shard children)
```

### Landed in code (P0 + P1)

| Fix | Status | Evidence |
|---|---|---|
| Full `/collections/<handle>` category-redirect coverage (was 2 of 25 categories) | Done | Registry-driven via `lib/category-tree.ts` |
| `/collections/<c>/products/<handle>` → one-hop 301 to `/product/<handle>` | Done | Routed through existing product-redirect maps |
| `/bariatricproducts` redirect loop | Done | One-hop 301 to `/category/bariatric` |
| `/category/hygiene/hygiene`-style self-titled duplicates (7 pairs) | Done | Real server-side 301 in `proxy.ts` — fixed from an earlier meta-refresh-only version, 9 dedicated tests |
| `/collections/all`, `/a/sitemap-tools/sitemap` legacy Shopify routes | Done | 301 to `/categories` and `/sitemap.xml` |
| Sitemap architecture: index + sharded children | Done | Next `generateSitemaps()`; index↔shard invariant now under test |
| IndexNow submission on product/collection webhooks | Done | Fire-and-forget via `after()`, non-prod guarded |
| L1 category resolution bug (slug/handle divergence) | Done | Resolves via `getShopifyHandle` before collection-handle lookup |
| General no-chain / no-loop redirect regression guardrail | Done | Sweeps all static entries + both category registries |

---

## Why none of it matters to Google yet

I ran live checks against `mdsupplies.com` and `www.mdsupplies.com` on 2026-08-27:

**Hostname direction**
```
GET https://mdsupplies.com/
→ redirects to https://www.mdsupplies.com/
```
Backwards. Every canonical, OG tag, and sitemap URL this branch emits assumes the apex is primary.

**Robots meta, live homepage**
```html
<meta name="robots" content="noindex,nofollow">
```
Present on `www.mdsupplies.com/` right now, despite a correct `canonical` pointing to the apex.

**robots.txt, live**
```
User-Agent: *
Disallow: /
```
Blocks the entire site from every crawler. This isn't what this branch's `lib/seo/robots-config.ts` would ever generate — it doesn't match this branch's code at all.

**sitemap.xml, live**
```xml
<urlset ...>
  <url><loc>...</loc>
  <priority>1</priority>...
```
Old flat format. The index + sharded-children structure built and tested on this branch has not shipped.

---

## P0 gate — master plan §32

| Item | Status | Evidence |
|---|---|---|
| One production canonical hostname | Blocked · infra | Live apex still redirects into `www` |
| Zero host redirect loops | Fixed in code, not live | Branch unmerged/undeployed |
| No public global `noindex,nofollow` | Blocked · infra | Live `www` still serves it sitewide |
| Canonicals don't redirect | Done in code | `lib/seo/canonical.ts` |
| Internal nav avoids redirects | Done in code | All known shared-template offenders resolved |
| Legacy product/collection redirects, relevant & direct | Done in code | Documented exception classes |
| Sitemap: only canonical, indexable, 200 URLs | Done in code | Not yet live (see above) |
| New-site structured-data errors fixed | Not done | 12 pharmacy/HRT Rich-Results errors — zero-price-Offer theory checked and ruled out, no replacement fix landed |
| `/category/private-practice` resolved | Not done | Route still doesn't exist; live 200 with empty/no-content page; needs a business decision on correct destination |
| Privacy / terms no longer blank | Not done | Live copy: *"Full details are being finalized."* — needs real legal text from the business |
| Checkout / RX / pricing behavior unchanged | Done | Full 1,644-test suite green; no commerce-path files touched |

## P1 gate — master plan §32

| Item | Status | Evidence |
|---|---|---|
| Duplicate taxonomy consolidated (7 self-titled pairs) | Done | Excluded from registry + real 301 |
| Sitemap index + shards, `lastmod` strategy | Done | Under test, correct at code level |
| IndexNow implemented | Done | 3 follow-up gaps logged (no dedup/throttle yet, `priority`/`changefreq` still emitted, shards not stable-sorted) |
| Orphan / one-inlink page discovery | Not started | Needs a fresh post-infra-fix Ahrefs crawl — the existing CSVs predate every fix on this branch |
| Singular/plural taxonomy audit | Not started | Same — depends on a fresh crawl |
| Filter/facet crawl-space control | Not addressed | Deliberately deferred — team chose the existing noindex-meta approach over new `robots.txt` disallow rules; no decision recorded on whether that's final |

---

## P2 and designer feedback (P3)

`git log --grep="DESIGN-0"` and `--grep="P2-0"` across the full history return zero commits. Nothing here has moved since the 2026-08-24 handoff.

| Item | Status | Evidence |
|---|---|---|
| P2 — metadata, images, Core Web Vitals | Untouched | No commits, no doc updates since original triage |
| DESIGN-01 — recommendation section reorder/relabel | Not done | `components/product/ProductView.tsx` order/labels unchanged |
| DESIGN-02 — mobile PDP option dropdown | Not attempted | Highest-risk item — touches variant-matching logic directly |
| DESIGN-03 — Trusted Brands 40px spacing | Not done | `components/home/TrustedBrands.tsx:82` still `mr-[22px]` |
| DESIGN-04 — distinct Shop By Industry imagery | Needs assets | Code already renders distinct images per card; complaint is about the photos themselves |
| DESIGN-05 — `/category/private-practice` 404 | Needs decision | Real route `/industries/private-practice` exists but has no product tag, so it's excluded from nav/sitemap too |
| DESIGN-06 — privacy/terms content | Needs content | Placeholder copy remains by design, pending real legal text |

---

## Recommended order from here

1. **Confirm and land the Bilal infra fixes.** Apex↔www redirect direction, and whatever is forcing `IS_STAGING`-style behavior (sitewide noindex + full robots disallow) on the live `www` domain. Draft already exists at `BILAL-HANDOFF.md`. *Owner: Bilal / infra.*
2. **Merge and deploy this branch.** 201 commits of tested, green P0+P1 work are sitting unmerged. None of it helps the audit until it ships — coordinate the merge window and confirm the production deploy target. *Owner: engineering.*
3. **Re-crawl and re-scope P1's data-dependent items.** Orphan-page discovery and the singular/plural taxonomy audit both need a fresh Ahrefs export taken after steps 1–2 land — the current CSVs predate every fix on this branch. *Owner: whoever owns the Ahrefs seat.*
4. **Business decisions blocking three P0 items.** Correct destination for the private-practice route, real legal copy for privacy/terms, and confirmation of the Rich Results errors on pharmacy/HRT products (needs a live Rich Results Test run, not another guess). *Owner: business / Sardor.*
5. **Designer feedback (P3) and P2 performance/metadata.** Deliberately sequenced last per the master plan itself — architecture before polish. DESIGN-01 and DESIGN-03 are low-risk and ready to schedule; DESIGN-02 needs careful variant-logic review before starting. *Owner: engineering.*

---