# SEO audit triage — 2026-08-21

Source: third-party site-audit export (Screaming-Frog-class tool with
Search-Console/rank data blended in), 89 CSV files, crawled 2026-08-21 08:06,
`C:\Users\sarik\Downloads\mdsupplies_21-aug-2026_all-issues_2026-08-21_08-06-40\`.
This is **triage only** — no code changed. Every finding below is verified
against this repo's actual source, not assumed from the CSV alone. Live
`curl` checks against `mdsupplies.com`/`www.mdsupplies.com` were attempted
from this session and blocked by Vercel's bot-protection challenge on every
attempt (including a Googlebot user-agent) — flagged wherever that matters.

## Priority action list

1. **[P0 — verify today] Confirm the live apex↔www redirect direction and
   the `NEXT_PUBLIC_IS_STAGING` value bound to whichever domain actually
   serves traffic.** Findings 1 and 2 below are two faces of the same
   likely single misconfiguration and touch the entire site's indexability.
   This needs a human with Vercel dashboard access, not more crawling.
2. **[P0 — code fix, cheap] Add a blanket `/collections/<handle>` →
   `/category/<slug>` redirect in `proxy.ts`**, mirroring the existing
   `/products/` → `/product/` rule (Finding 3). Small diff, resolves the
   single largest *code-attributable* 404/redirect-noise source in the
   audit.
3. **[P1 — decide, not code] Triage the 3,984 orphan product URLs sourced
   only from Shopify's legacy `sitemap_products_*.xml`** (Finding 4)
   against `docs/redirects-ready.json`'s existing 1,285-entry map — some
   are probably already covered, the rest need a decision (add redirect vs.
   let 404/410).
4. **[P2 — Shopify data, not code] Content-level SEO issues on real,
   indexable, apex-hosted pages** (Finding 5): 552 meta descriptions too
   long, 260 titles too long, 132 meta descriptions missing, 12 Product
   structured-data validation errors, 62 missing alt attributes. Route to
   content ops / Shopify Admin.
5. **[P3 — informational] Everything else** (redirected CSS/JS/image
   warnings, "nofollow outgoing links," IndexNow submissions) is downstream
   noise from Findings 1–4, not independent bugs — see Finding 6.

---

## 1. Apex domain redirects to `www` — backwards from the documented plan (critical)

`docs/DEV-02-vercel-setup.md:105-109` documents the intended setup: add
`www.mdsupplies.com`, Vercel 301s **it** to the apex, `mdsupplies.com` is
canonical. `lib/seo/constants.ts` → `SITE_ORIGIN` (`SITE_URL`) is built on
that assumption — every canonical tag, OG URL, and sitemap entry in this
codebase emits the **apex** URL.

The live crawl shows the opposite. `Error-Broken_redirect.csv` contains
direct proof, not inference — a real one-hop-then-fail chain:

```
https://mdsupplies.com/collections/25g-hypodermic-needles?page=2
  → 308 → https://www.mdsupplies.com/collections/25g-hypodermic-needles?page=2
  → 404
```

Apex is redirecting **to** `www`, not the reverse. This is corroborated by
`Error-Canonical_points_to_redirect.csv`, which is 814/814 rows of one
identical, internally-consistent pattern (verified programmatically, not
sampled):

```
url=www status=200 canon=apex canoncode=308   (814 of 814 rows)
```

Every canonical tag (correctly pointing at the apex, per `SITE_URL`) points
at a URL that itself immediately 308s elsewhere — actively working against
consolidating link equity onto the canonical, and it's why this single
issue type has 814 rows: it's one misconfiguration multiplied across every
indexable page on the site, not 814 separate defects.

**Not a code bug** — `SITE_URL`/`buildCanonical()` (`lib/seo/canonical.ts`)
are doing exactly what they're supposed to. The redirect direction lives in
Vercel's Domains settings (or possibly Cloudflare, per
`docs/launch/2026-07-19-cutover-rollback-runbook.md:9-10,78-81`, which
names Cloudflare as the DNS owner and Vercel's domain redirect as the
mechanism). **Action:** whoever holds Vercel/Cloudflare access needs to
check which domain is set as primary and flip it (or, if `www` is now the
intended public domain for business reasons, flip `SITE_URL` and this
finding closes from the other direction — but that's a product decision,
not a default).

## 2. `www.mdsupplies.com` is serving `noindex,nofollow` sitewide (critical)

`Warning-Noindex_page.csv`, `Warning-Nofollow_page.csv`, and
`Notice-Noindex_and_nofollow_page.csv` are three views of the same 3,743
`www`-hosted URLs — ordinary pages meant to be public (`/about`,
`/faq`, `/category/surgery-procedure`, `/category/seating`, `/blog`, ...),
each rendering `<meta name="robots" content="nofollow, noindex">` and
`Is indexable page: false`. Sample (`Warning-Noindex_page.csv:4`):

```
https://www.mdsupplies.com/about ... Is noindex:true  Is nofollow:true  Meta robots:"nofollow\nnoindex"
```

`lib/seo/robots.ts`'s `buildRobots()` has exactly one branch that emits
`noindex,nofollow` (every other branch is `noindex,follow` or
`index,follow`):

```ts
if (isStaging) return 'noindex,nofollow'
```

`isStaging` defaults to `STAGING_GUARD` = `IS_STAGING`
(`lib/site-config.ts:18-24`), which is `true` whenever
`NEXT_PUBLIC_IS_STAGING === 'true'`, or `VERCEL_ENV` is set and isn't
`'production'`. The code comment at `lib/site-config.ts:12-14` names this
exact scenario: *"a production-slot Vercel deploy that is not yet the live
site — pre-domain-cutover."*

This directly explains **Finding 6**'s "nofollow outgoing links" volume
too: when a page's own robots meta is `noindex,nofollow`, an SEO crawler
correctly treats every outbound link on that page as passing no follow
equity — it isn't a per-`<a>` `rel="nofollow"` (grepped the whole repo,
zero literal matches outside `lib/seo/` and test files) that's the count
matching "all links on the page," e.g. 45–146 nofollow outlinks on plain
content pages with no special link markup.

Given Finding 1 shows apex and `www` are one hop apart on the *same* live
deployment (not two separate environments), this is not "pre-launch preview
noise" — it means the domain that's actually serving traffic is currently
telling Google not to index or follow anything on it. Given the audit also
carries real backlink/keyword-position/organic-traffic numbers for these
same URLs (e.g. `Notice-Pages_dropped_from_Top_10.csv` shows
`/collections/occ` and `/collections/needles` with 5 referring domains and
604 backlinks respectively), this looks like an active regression against
an already-indexed site, not a site that's never been live.

**Action:** confirm today whether `NEXT_PUBLIC_IS_STAGING` is set (or
`VERCEL_ENV` isn't resolving to `production`) on whichever Vercel
project/environment is bound to the domain(s) currently receiving real
traffic, and correct it. This is the highest-leverage single fix in the
entire audit — it and Finding 1 together are the likely root cause behind
the bulk of this report's row counts.

## 3. No blanket `/collections/<handle>` → `/category/<slug>` redirect (high, code-fixable)

`proxy.ts` already has a blanket rule for the old plural product path
(`proxy.ts:240-243`):

```ts
if (pathname.startsWith('/products/')) {
  const newPath = pathname.replace(/^\/products\//, '/product/')
  return withCsp(NextResponse.redirect(new URL(newPath, request.url), 301), nonce)
}
```

There is no equivalent for `/collections/<handle>` → this app's
`/category/<slug>` (only one hand-written exception exists, for
`trocars-trocar-kits`, `proxy.ts:263-273`). Shopify's own auto-generated
sitemap (`sitemap_collections_N.xml`, `sitemap_products_N.xml` — Shopify's
built-in SEO feature, distinct from this app's `app/sitemap.ts`) is still
being crawled and references hundreds of native `/collections/<handle>`
URLs this app never defines (confirmed: no `app/collections` route exists
at all). Counted directly in the export:

| File | `/collections/` hits |
|---|---:|
| `Error-404_page.csv` / `Error-4XX_page.csv` | 183 each (mostly `?page=N` pagination variants, e.g. `/collections/nasal-oxygen-cannulas?page=3`) |
| `Warning-Page_has_redirected_CSS.csv` | 692 |
| `Warning-Page_has_redirected_JavaScript.csv` | 692 |
| `Warning-Page_has_redirected_image.csv` | 517 |
| `Warning-3XX_redirect.csv` | 197 |
| `Notice-Pages_to_submit_to_IndexNow.csv` | 598 |

**Caveat, from the 2026-08-12 audit's Finding F3:** a raw Shopify collection
handle is not always the live public slug (`face-coverings` → `face-masks`
is the known example). The fix must route the handle through the same
category registry / `getCategorySlug()` the rest of the app already uses
for minting public category URLs, not a naive 1:1 rename, or it will
silently create a second set of wrong redirects.

## 4. 3,984 of 4,286 "orphan page" notices are Shopify-legacy-sitemap-only URLs (high, needs a decision not a guess)

`Error-indexable-Orphan_page_(has_no_incoming_internal_links).csv`: 4,286
rows, 100% apex host. Of these, 3,984 (93%) are referenced *only* via
Shopify's native `sitemap_products_N.xml` (verified: `sitemap_products`
string appears in 3,984 rows of this file, `sitemap_collections` in
another 302) — meaning these are handles Google/the crawler knows about
purely from Shopify's built-in sitemap, with zero internal links from
anywhere on the current site. Sample handles: `needle-18g-x-1-1-2-thin-wall-nokor-point-5-micron-box-305201`,
`spinal-needle-25g-x-3-1-2-case-sn25g351`,
`drain-sponge-sterile-4x4-2s-6ply-12-25-cs-600`.

**Not automatically a bug** — some of these may be legitimately-gone
products already covered by the 1,285-entry `docs/redirects-ready.json` /
`PRODUCT_REDIRECTS` map in `proxy.ts:22-27`, or genuinely discontinued and
fine to 404. This needs a set diff against that JSON file (not eyeballed
here — 3,984 rows against 1,285 entries is a script, not a read), then a
decision per the same pattern already used throughout `proxy.ts`'s comments
(410 for genuinely gone, 301 to the nearest live parent for the rest).

## 5. Real content-level SEO issues on live, indexable, apex-hosted pages (medium, Shopify data — not code)

Cross-checked: every file below is the `-indexable-` variant, and every row
sampled is apex-hosted with `Is indexable page: true` — this is the
authoritative "genuinely live and indexable" subset, distinct from the
`www`/staging noise in Finding 2's non-`-indexable-`-prefixed duplicates of
the same issue types.

| Issue | Rows | Note |
|---|---:|---|
| `Warning-indexable-Meta_description_too_long.csv` | 552 | e.g. `/category/pharmacy-products/precision-dose-phentermine-...` |
| `Warning-indexable-Title_too_long.csv` | 260 | mostly product titles carrying full spec strings |
| `Warning-indexable-Meta_description_tag_missing_or_empty.csv` | 132 | includes `/blogs/news`, several `/collections/*` (same routing gap as Finding 3) |
| `Warning-indexable-Meta_description_too_short.csv` | 55 | |
| `Warning-Missing_alt_text.csv` | 62 (53 apex + 9 www) | mostly third-party vendor-hosted image URLs embedded in product/partner content (e.g. `firstglove.com/cdn/...`, `shop.drivemedical.com/...`) — alt text lives in that content, not this app's templates |
| `Notice-Structured_data_has_Google_rich_results_validation_error.csv` | 12 real rows | all on `/category/pharmacy-products/<handle>` nested PDP pages, all "Google rich results validation error" on `Product`/`BreadcrumbList`/`OnlineStore` |
| `Warning-indexable-H1_tag_missing_or_empty.csv` | 1 real row | |

These are Shopify product/collection data problems (title, description,
image alt attributes are all sourced from Shopify content, not hardcoded in
this repo's templates) — route to content ops / whoever owns the Shopify
Admin data, except the structured-data validation errors, which are worth
a quick look at the actual Google-flagged reason (the 12-row file doesn't
carry the specific validator message, only the schema type list — would
need Google's Rich Results Test run against one of the 3 pharmacy-products
URLs to see the exact complaint).

## 6. Everything else is downstream noise from Findings 1–4, not independent defects (informational)

Real record counts (the raw `wc -l` line counts on these files are
misleading — the CSVs embed multi-line lists inside single logical rows,
inflating apparent size by 10-100x):

| File | Raw lines | Real rows (CSV-parsed) |
|---|---:|---:|
| `Notice-Page_has_nofollow_outgoing_internal_links.csv` | 244,150 | 1,862 |

1,862 source pages with nofollow outlinks, 799 of them query-string URLs
(search/filter variants, expected per this app's own indexability rules —
see the 2026-08-12 audit's "Indexability" section) and 1,063 plain-path
pages — the plain-path ones are exactly Finding 2's `www` noindex,nofollow
pages, not a separate bug.

`Notice-Pages_to_submit_to_IndexNow.csv` (70,778 raw lines) and the
`Warning-Page_has_redirected_{CSS,JavaScript,image}.csv` trio (37,330 /
31,832 / 22,658 raw lines) are dominated by the same `/collections/*`
routing gap (Finding 3) and the apex→www hop (Finding 1) — once those two
are fixed, re-run the audit before assuming any residual volume here is a
new, distinct problem.

`Error-Image_file_size_too_large.csv` (832 rows) and the 8,309-of-8,568
`Error-404_page.csv` rows that are `/cdn/shop/files/*.jpg?v=...` broken
image URLs are Shopify Files/product-image data issues (files deleted or
never uploaded at the referenced path) — not this app's code, since
`next.config.ts`'s `remotePatterns` only covers `cdn.shopify.com/s/files/**`
image *serving*, not the underlying Shopify Admin file library. Worth a
separate, quick check (not done here) of whether this app's product-image
component shows a broken-image icon or a graceful placeholder when the
Storefront API returns a since-deleted file URL.

## Issues this triage did not size (out of scope for this pass, not zero-value)

- `Warning-Slow_page.csv` (604 rows) — needs Core Web Vitals context this
  export doesn't carry; the existing `2026-06-23-perf-cwv-audit.md` plan
  already owns this area.
- `Notice-Redirect_chain.csv` (69 rows) / `Notice-Redirect_target_changed.csv`
  (33 rows) — likely mostly explained by Finding 1's extra hop, not
  independently triaged row-by-row here.
- `Warning-indexable-Page_has_links_to_redirect.csv` and its `-links.csv`
  pair (~24.8k / 24.6k raw lines) — not opened this pass; almost certainly
  the same `/collections/*` and apex→www chains linked internally, but
  should be confirmed once Findings 1 and 3 are fixed and the audit is
  re-run, rather than hand-triaged now.

## Verification notes

- Host/status-code patterns above were computed with `Import-Csv` (handles
  the embedded-newline quoted fields correctly) — `wc -l` / naive line
  counts on the multi-value files (nofollow outlinks, IndexNow, redirected
  assets) are 10-100x too high and were not used for row counts, only for
  substring-presence sweeps (`/collections/`, `/pages/`, `sitemap_products`)
  where over-counting by embedded newlines is an acceptable margin for a
  magnitude estimate, not a precise count.
- Live `curl -I`/`curl -IL` against both hostnames, including with a
  Googlebot user-agent, returned Vercel's bot-protection challenge page
  (HTTP 429, `X-Vercel-Mitigated: challenge`) from this sandboxed session
  every time — Findings 1 and 2's live-redirect-direction claims rest on
  the CSV's own internally-consistent evidence (particularly the direct
  apex→308→www→404 chain in `Error-Broken_redirect.csv`) and code
  cross-reference, not a fresh curl from this session. Re-verify with
  `curl -sIL https://mdsupplies.com/` from an unblocked network before
  acting.
