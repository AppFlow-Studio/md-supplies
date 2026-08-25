# P1 Remediation — Results

**Branch:** catalog-cro-review-sardor-dev
**Starting SHA:** `190a089b41d8b98a48fbfe386b701a5a27f69764`
**Final SHA:** `aa20f49` (Task 4: `feat(seo): implement IndexNow submission on product/collection webhooks`; docs commits follow)

## What this plan fixed (code)

| Item | Before | After |
|---|---|---|
| Self-titled duplicate category pages | `/category/hygiene/hygiene` (and 6 other pairs) served real, indexable duplicate-content pages | Excluded from the L2 registry (fixes nav/footer/sitemap simultaneously) and the URL itself redirects to the parent category |
| `/collections/all` | Unhandled — passthrough | 301 to `/categories` |
| `/a/sitemap-tools/sitemap` | Unhandled — passthrough (8,128 inlinks per 2026-08-21 audit) | 301 to `/sitemap.xml` |
| Sitemap architecture | One flat file (`getSitemapUrls()`), unsharded | Sitemap index (`/sitemap.xml`) + `content` shard + product shards at 2,000/file, via Next's native `generateSitemaps()` |
| IndexNow | Not implemented anywhere in the repo | Submits the affected product/category URL on real `products/*`/`collections/*` Shopify webhook topics, fire-and-forget, never blocking the webhook response |

## What this plan did NOT do, and why (verified against current code, not the prior session's research snapshot)

- robots.txt filter/sort/param disallow — would conflict with the already-correct noindex-meta-tag approach; see this plan's own header section for the full reasoning.
- `/checkout` robots disallow — moot, no local `/checkout` route exists (checkout is fully external, Shopify-hosted).
- Structured-data fix for the 12 pharmacy/HRT-clinic Rich Results errors — the prior session's hypothesis (a zero-price Offer) doesn't hold; `ProductSchema.tsx` already omits the Offer correctly. Needs a live Rich Results Test or a fresh Ahrefs export to identify the real cause — not something to guess-fix.
- P1-01 (orphan/one-inlink pages) and the P1-02 singular/plural taxonomy list — both need a live post-P0 Ahrefs re-crawl to know what's still actually live; the existing CSVs predate the P0 redirect fixes and aren't in this repo.

## Verification

### `npm test`

```
> md-supplies@0.1.0 test
> vitest run

 RUN  v4.1.8 C:/Users/sarik/WebstormProjects/md-supplies

Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document

 Test Files  151 passed (151)
      Tests  1627 passed (1627)
   Start at  22:15:16
   Duration  32.64s (transform 10.56s, setup 11.28s, import 50.09s, tests 24.34s, environment 87.26s)
```

All 151 test files / 1627 tests passing. (The three "Not implemented: navigation to another Document" lines are jsdom console noise from `window.location` assignment in existing tests, not failures — they precede and are unrelated to this plan's changes.)

### `npx tsc --noEmit`

No output — clean, zero type errors.

### `npm run lint`

```
> md-supplies@0.1.0 lint
> eslint

C:\Users\sarik\WebstormProjects\md-supplies\qa-sweep.js
  2:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  3:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

✖ 2 problems (2 errors, 0 warnings)
```

**Not clean**, but pre-existing and out of scope: `qa-sweep.js` is a local, `.gitignore`d scratch script (`.gitignore:61:/qa-sweep.js`, not tracked in this repo, dated 2026-07-03 — predates this plan and P0 entirely). Zero files touched by Tasks 1–4 of this plan appear in the lint output. Every tracked source file is lint-clean.

### `npm run build`

`next build` completed successfully (`✓ Compiled successfully`, 69/69 static pages generated, including the new `/sitemap.xml` index and its two `/sitemaps/sitemap/*.xml` children from Task 3). One pre-existing Turbopack warning, unrelated to this plan:

```
Turbopack build encountered 1 warnings:
./next.config.ts
Encountered unexpected file in NFT list
...
Import trace:
  Server Component:
    ./next.config.ts
    ./lib/shipping-resolver/data.ts
    ./lib/shipping-resolver/resolve.ts
    ./app/category/[slug]/[product]/page.tsx
```
This flags a dynamic `fs`/`path` usage in `lib/shipping-resolver/`, not any file this plan touched.

### Dev-server manual verification (Step 2)

`npm run dev` started clean (`✓ Ready in 586ms`). Four checks run against `http://localhost:3000`:

```
$ curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/collections/all
301 http://localhost:3000/categories

$ curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/a/sitemap-tools/sitemap
301 http://localhost:3000/sitemap.xml

$ curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/category/hygiene/hygiene
200 

$ curl -s http://localhost:3000/sitemap.xml | head -20
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://barbecue-hundredth-shush.ngrok-free.dev/sitemaps/sitemap/content.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://barbecue-hundredth-shush.ngrok-free.dev/sitemaps/sitemap/products-0.xml</loc>
  </sitemap>
</sitemapindex>
```

The first two redirects (`proxy.ts`-level, Task 2) are confirmed working exactly as expected: real HTTP `301 Moved Permanently` responses with the correct `Location` header (`/categories`, `/sitemap.xml` respectively — confirmed with `curl -D -` as well). The sitemap output is confirmed working exactly as expected: a real `<sitemapindex>` with the `content` and `products-0` shard children (Task 3). (The shard `<loc>` hosts render as the dev machine's configured `SITE_URL` — an `ngrok-free.dev` tunnel domain from local `.env.local`, used for Shopify webhook testing locally — not `localhost` or `mdsupplies.com`; this is local-environment configuration, not an application bug.)

**`/category/hygiene/hygiene` does *not* return an HTTP 301** (or any 3xx) in this dev-server check — it returns a plain `200` with empty `redirect_url`, i.e. no `Location` header at all. Inspecting the actual response body explains why: it contains a client-side `<meta http-equiv="refresh" content="1;url=/category/hygiene"/>` tag rather than a server-level redirect header. This traces to the *implementation choice* made in Task 1 (already committed at `6dd0a49`, out of scope for this verification-only task to change): `app/category/[slug]/[product]/page.tsx` calls `next/navigation`'s `redirect()` (not `permanentRedirect()`), and per this repo's own vendored Next.js docs (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md:12`, consistent with `AGENTS.md`'s "this is NOT the Next.js you know" warning): *"When used in a streaming context, this will insert a meta tag to emit the redirect on the client side. ... Otherwise, it will serve a 307 HTTP redirect response."* This route streams (the root `app/layout.tsx` wraps its tree in `Suspense`), so `redirect()` degrades to a client-side meta-refresh instead of any HTTP-level redirect — not the 301 the master plan's Task 1 description and this plan's own template assumed, and not even the 307 that `redirect()` would produce outside a streaming context. A crawler or tool that does not execute/honor the meta tag (e.g. this exact `curl` check) sees a `200` with duplicate-page content already excluded from nav/sitemap, but with no machine-readable signal that the URL has moved. This is a real functional gap in Task 1's URL-level redirect, distinct from and in addition to the registry-level exclusion (which does work correctly, per `lib/__tests__/category-tree.test.ts` and the removal of `/category/hygiene/hygiene` from nav/footer/sitemap). Flagged here rather than silently fixed, since Task 5 is verification/documentation-only per its brief.

## Remaining P1/P2/P3 items (master plan), not in this plan's scope

- Everything in the "What this plan did NOT do" section above — next step is a live Ahrefs re-crawl (after Bilal's P0-01/P0-02 infra fixes land, per `BILAL-HANDOFF.md`) to scope what's actually still open before planning further.
- Master plan P2 (metadata/images/performance) and P3 (remaining designer feedback items) — untouched by this plan, per the original P0 handoff's own sequencing (P1 before P2/P3).
- **New, found during this task's verification:** `/category/hygiene/hygiene` (and presumably its 6 sibling self-titled-duplicate URLs) does not issue an HTTP redirect — it 200s with a client-side meta-refresh only, because `redirect()` degrades in this fork's streaming SSR instead of sending a 307/301. Switching to `permanentRedirect()` would not by itself fix this — the streaming-context degradation applies to both functions per the same doc. A real fix needs either removing the page from the streaming/Suspense boundary for this one condition, or moving the collapse to a non-streamed layer (e.g. `proxy.ts` middleware, which is how the other two Task-2 redirects correctly achieve real 301s). Not fixed here — out of scope for a documentation/verification-only task — but should be the first item in the next P1-follow-up or a quick patch to Task 1.

## Final-review fix wave — scope gaps deliberately left open

The final whole-branch review that closed out P0+P1 fixed six implementation defects in one pass (including the `redirect()`-degrades-to-meta-refresh gap noted directly above — the self-titled-duplicate collapse now happens as a real `proxy.ts` 301, before `app/category/[slug]/[product]/page.tsx` is ever reached). Alongside those fixes, the reviewer identified three items that are gaps in this plan's *scope*, not implementation bugs in what was built — surfaced here rather than fixed, per the reviewer's explicit instruction to document only:

- **IndexNow trigger granularity vs. MASTER-PLAN §20.** §20's premise — "a Shopify webhook fires only on real products/\*/collections/\* topics" — undersells how often `products/update` actually fires in production. Shopify sends `products/update` on any write to a product, not just a merchant-intended content change: inventory-level syncs, bulk import/export runs, and app-driven metafield touches all trigger it. `app/api/revalidate/route.ts` filters by topic (`products/*`, `collections/*`) but has no deduplication or throttling beneath that — every qualifying webhook call submits to IndexNow, even a burst of a hundred inventory-sync webhooks for the same handle inside a minute. §20's "not every minor backend write" constraint is only partially met: topic filtering excludes non-product/collection topics, but does nothing about *repeated* products/collections topic firings for the same URL. Suggested fix direction: a short-lived last-submitted-at map keyed by URL (skip a resubmission within some cooldown window, e.g. 5–10 minutes), or compare the webhook payload's `updated_at` against a stored value and skip if unchanged.
- **MASTER-PLAN §16's "remove unnecessary `<priority>`/`<changefreq>` from generated output" was never implemented or acknowledged as not-done in this plan.** Every sitemap entry `lib/seo/sitemap.ts` builds — content and product shards alike — still carries both `priority` and `changefreq` fields. Google has publicly stated both are ignored for ranking/crawl-scheduling purposes; §16 called for dropping them as dead weight. This plan's Task 3 (sitemap sharding) touched `lib/seo/sitemap.ts` extensively without addressing this specific line item, and no prior P1 doc records a decision to skip it — it was simply not done.
- **Product sitemap shards aren't stable-sorted.** `getProductSitemapUrls` (`lib/seo/sitemap.ts`) slices an unsorted Storefront API query result by position to build each shard (`PRODUCTS_PER_SITEMAP_SHARD` per file). The Storefront API does not guarantee a stable product ordering across requests by default, so inserting (or removing) one product near the front of the catalog can shift every product after it by one position — reshuffling which product handle lands in which shard file on the very next crawl/regeneration. This isn't incorrect (every product still appears exactly once across all shards, and stale/removed handles age out normally), but it's not the "stable sharding" §16 prefers: a crawler that caches shard-level freshness signals (e.g. "shard 4 hasn't changed since last crawl") would see spurious churn in shard 4's contents on every catalog edit near the front, not just the shard the actual change belongs to. A stable fix would sort by a stable key (e.g. product id or handle) before slicing into shards.
