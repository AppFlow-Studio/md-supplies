# MDSupplies — Full Technical SEO, Crawlability, Migration & Designer-Feedback Execution Plan

**Project:** MDSupplies custom/headless Shopify storefront  
**Primary objective:** Eliminate the Ahrefs technical SEO issues, normalize the Shopify-to-custom-site migration, protect crawlability and existing commerce behavior, improve SEO/GEO/AEO readiness, and implement the supplied designer feedback without breaking site architecture.  
**Execution model:** Evidence-based, root-cause-first, staged, reversible, and verified against the Ahrefs CSV exports.  
**Ahrefs source package:** `mdsupplies_21-aug-2026_all-issues_2026-08-21_08-06-40.zip`  
**Designer feedback source:** `MDSupplies_Feedback.docx`

---

# 0. Mission and non-negotiable outcome

This is **not** a task to blindly “clear Ahrefs warnings.” The objective is to fix the underlying architecture that is creating the warnings while preserving all correct Shopify/headless storefront behavior.

The final site must have:

- one authoritative production hostname;
- one canonical URL for every indexable piece of content;
- no accidental global `noindex` / `nofollow` on public pages;
- direct internal links to final 200-status URLs;
- clean legacy Shopify → custom-site migration redirects;
- no redirect loops or avoidable redirect chains;
- no indexable orphan products/categories caused by the new architecture;
- a sitemap containing only canonical, indexable, 200-status URLs;
- crawlable navigation and pagination where needed for product discovery;
- controlled faceted/filter URL behavior that does not create crawl traps;
- accurate Product/Breadcrumb/Organization/WebSite structured data;
- correct product/category hierarchy and internal-link graph;
- correct robots behavior for Google/Bing/AI search crawlers;
- responsive, accessible product/category UX;
- no regression to RX enforcement, pricing, checkout, shipping, inventory, account privacy, or product availability logic;
- a documented before/after audit proving the work.

**Do not optimize the Ahrefs score by hiding problems from crawlers. Fix the problems.**

---

# 1. Safety rules — protect site architecture first

These rules take precedence over speed.

## 1.1 Git / deployment safety

- [ ] Pull the latest authoritative `main` before starting.
- [ ] Record starting SHA, current branch, remote, working-tree state, and deployment target.
- [ ] Create a dedicated SEO remediation branch from current `main`.
- [ ] Do not use `git reset --hard`.
- [ ] Do not use `git clean` on unknown/untracked files.
- [ ] Preserve unrelated work.
- [ ] Do not merge until all P0 gates in this document pass.
- [ ] Do not deploy broad SEO changes directly to production without preview/staging validation.
- [ ] Every architectural change must have an explicit rollback path.

## 1.2 Shopify / commerce safety

This work is primarily storefront/code/routing/SEO work.

Do **not** alter or weaken:

- RX detection or RX checkout enforcement;
- product/variant IDs;
- Shopify handles unless an explicit migration is required and approved;
- pricing or compare-at pricing;
- free-shipping/business shipping rules;
- backorder logic;
- inventory locations;
- inventory quantities;
- delivery profiles;
- checkout gating;
- account/order authorization;
- private customer data handling;
- vendor/brand separation;
- existing product publication state.

Do not perform destructive Shopify Admin writes merely to make a crawler warning disappear.

## 1.3 SEO safety

Never:

- redirect all 404s to the homepage;
- canonicalize every filtered URL without understanding discovery behavior;
- block legacy URLs in `robots.txt` before Google can crawl their 301s;
- noindex important product/category pages to reduce crawler volume;
- remove pagination if it is necessary for crawler product discovery;
- create blanket wildcard redirects that send unrelated old collections to wrong categories;
- publish unsupported/empty indexable industry/category pages;
- create thin pages solely for slight keyword variations;
- change thousands of URLs individually when a shared route/helper/template is the root cause.

---

# 2. Required source-of-truth inputs

Use the supplied ZIP as the issue-level evidence source. Do not rely only on the Ahrefs summary dashboard.

Also use:

1. the live production site;
2. the current repository;
3. current generated sitemap(s);
4. current `robots.txt`;
5. current Shopify product/collection data as read by the storefront;
6. Search Console/Bing data if already available;
7. the designer feedback document.

When an issue exists in both the legacy Shopify architecture and new headless architecture, distinguish the two before implementing a fix.

---

# 3. Known root causes already identified from the Ahrefs exports

These are established starting hypotheses from the exported CSVs and must be verified against current production before modifying routing.

## 3.1 Apex / `www` split is the highest-risk issue

Ahrefs saw two architectures:

- legacy Shopify content under `https://mdsupplies.com/products/...` and `https://mdsupplies.com/collections/...`;
- newer headless routes under `https://www.mdsupplies.com/product/...`, `/category/...`, `/industries/...`, etc.

The headless pages in the crawl were returning `200` but were reported as `noindex,nofollow`, while their canonical pointed to the non-`www` apex. Many apex canonical targets then returned a `308`.

This appears to be the main reason for the **canonical points to redirect** issue.

### Required end state

Choose and enforce exactly one primary hostname.

The currently intended architecture appears to be:

```text
PRIMARY:   https://mdsupplies.com/
SECONDARY: https://www.mdsupplies.com/* -> direct 301/308 -> https://mdsupplies.com/*
```

Do not assume this. Verify infrastructure first.

The same route must not resolve to different applications depending on hostname.

---

## 3.2 Global `noindex,nofollow` is likely one shared configuration issue

Ahrefs reported approximately **1,871** new/headless pages with `noindex`/`nofollow` behavior.

Treat this as a likely environment/layout/head-metadata issue rather than 1,871 page-level edits.

Public production pages must not inherit staging robots directives.

Private/non-search pages may remain nonindexable intentionally.

---

## 3.3 Most “8,568 404s” are asset-level, not webpage-level

The exported data indicates that the overwhelming majority of reported 404s were `/cdn/shop/files/...` image requests, with additional old Shopify theme JS/CSS assets.

Do **not** treat this as 8,568 missing pages.

Fix the underlying host/CDN/proxy/static-resource routing first, then recrawl.

---

## 3.4 “8,107 pages link to redirects” is mostly a small set of shared template links

The exports show global/shared links repeatedly generating this issue, including:

- old Become-a-Vendor destination;
- legacy Trocars/Trocar Kits collection URL;
- `/bariatricproducts`, which participates in the reported redirect loop.

Fix final destinations at the shared component/template/source-of-truth level.

Do not edit thousands of pages.

---

## 3.5 Reported orphan pages are largely legacy Shopify URLs

The exported orphan set is dominated by old:

```text
/products/*
/collections/*
```

URLs referenced by old Shopify sitemap files.

Do not create internal links to obsolete legacy routes.

Correct response:

```text
legacy URL -> direct 301 -> new canonical URL
```

Then confirm the **new** canonical product/category is internally discoverable.

---

## 3.6 Product migration is mostly deterministic

The legacy product architecture uses:

```text
/products/:handle
```

and the new architecture uses:

```text
/product/:handle
```

Prior cross-comparison found that approximately **98.65%** of represented legacy product handles have a same-handle destination in the new sitemap.

Use this as a migration opportunity, but validate destination existence before redirecting.

Do **not** redirect a product to a nonexistent new route.

---

## 3.7 Collection migration is not safely handled by a generic slug replacement

Legacy:

```text
/collections/adhesive-bandages
```

may map to:

```text
/category/wound-care/adhesive-bandages
```

not:

```text
/category/adhesive-bandages
```

Create an explicit collection migration map.

Do not implement:

```text
/collections/:slug -> /category/:slug
```

as a universal rule.

---

# 4. Priority sequence

## P0 — architecture/indexability/migration blockers

Complete these before content polishing.

1. Production hostname topology and redirect normalization.
2. Remove accidental public `noindex,nofollow`.
3. Redirect loop removal.
4. Broken redirect remediation.
5. Canonicals that point to redirects.
6. Legacy product/collection migration architecture.
7. Internal links that point through redirects.
8. Real current-site 4XX/broken links.
9. Canonical/sitemap/robots consistency.
10. Ensure every intended public product/category is crawlable.
11. Structured-data errors on new headless product/category routes.
12. Designer-reported broken/empty public pages.

## P1 — crawl graph + taxonomy + sitemap

1. New-site orphan product/category discovery.
2. Weak one-inlink pages.
3. Category/subcategory hierarchy.
4. Duplicate/near-duplicate taxonomy.
5. Sitemap architecture and reliable `lastmod`.
6. Faceted navigation and parameter handling.
7. Pagination crawlability.
8. Internal breadcrumb links.
9. IndexNow.
10. Search-engine/AI-search crawl policy.

## P2 — content metadata + performance

1. Title/meta/H1 cleanup on **final canonical new pages**.
2. Image/JS/CSS redirect elimination.
3. broken images;
4. oversized images;
5. slow pages/Core Web Vitals;
6. alt text;
7. external broken/redirecting links.

## P3 — designer/CRO polish

Implement the supplied designer feedback after the architecture is stable, except broken public pages, which belong in P0/P1.

---

# 5. Phase 0 — baseline and evidence capture

Before changing behavior:

- [ ] Save current production headers/status for representative routes.
- [ ] Save current `robots.txt`.
- [ ] Save current `sitemap.xml`.
- [ ] Save current canonical/meta robots from rendered source.
- [ ] Record both apex and `www` responses.
- [ ] Record old Shopify `/products/` and `/collections/` behavior.
- [ ] Record current product/category routing.
- [ ] Capture a representative mobile/desktop screenshot set.
- [ ] Record Ahrefs ZIP filename and audit date.
- [ ] Record exact starting Git SHA.

Create:

```text
docs/audits/2026-08-seo-remediation/
  BASELINE.md
  ROUTE-MATRIX.csv
  REDIRECT-MAP.csv
  LEGACY-PRODUCT-EXCEPTIONS.csv
  LEGACY-COLLECTION-MAP.csv
  SITEMAP-AUDIT.md
  STRUCTURED-DATA-AUDIT.md
  PERFORMANCE-AUDIT.md
  DESIGN-QA.md
  FINAL-RESULTS.md
```

`ROUTE-MATRIX.csv` should contain at minimum:

```text
source_url
route_type
hostname
status
redirect_target
final_status
canonical
robots
indexable
sitemap_present
internal_inlinks
title
h1
structured_data_types
notes
```

---

# 6. P0-01 — normalize production hostname architecture

Run read-only tests first against:

```text
https://mdsupplies.com/
https://www.mdsupplies.com/

https://mdsupplies.com/category/wound-care
https://www.mdsupplies.com/category/wound-care

https://mdsupplies.com/product/<known-valid-handle>
https://www.mdsupplies.com/product/<known-valid-handle>

https://mdsupplies.com/products/<legacy-known-valid-handle>
https://www.mdsupplies.com/products/<legacy-known-valid-handle>

https://mdsupplies.com/collections/wound-care
https://www.mdsupplies.com/collections/wound-care

https://mdsupplies.com/sitemap.xml
https://www.mdsupplies.com/sitemap.xml

https://mdsupplies.com/robots.txt
https://www.mdsupplies.com/robots.txt
```

For each capture:

```text
HTTP status
Location header
canonical
meta robots
x-robots-tag
server/framework response
final destination
```

### Acceptance criteria

- [ ] Exactly one hostname is primary.
- [ ] Secondary host redirects directly to the equivalent path on primary.
- [ ] No primary URL redirects back to the secondary host.
- [ ] No host ping-pong.
- [ ] Canonicals use the final primary hostname.
- [ ] Sitemap uses the primary hostname.
- [ ] internal links use the primary hostname or safe relative URLs.
- [ ] Shopify/CDN proxy behavior is not accidentally broken by the hostname redirect.

---

# 7. P0-02 — remove accidental global `noindex,nofollow`

Find every code/config source that can emit:

```text
noindex
nofollow
X-Robots-Tag
robots metadata
```

Audit:

- root layout metadata;
- environment-specific metadata;
- middleware;
- headers config;
- Next.js `robots` metadata;
- route-level metadata;
- Vercel preview guards;
- Shopify/headless preview flags.

### Intended public production pages

Unless intentionally excluded:

```text
/
categories hub
category
subcategory
product
industries hub
supported industry
partners
blog
blog article
about
contact
FAQ
returns
valid policies
```

should not inherit global `noindex,nofollow`.

### Intentionally nonindexable examples

Depending on implementation:

```text
/search
/cart
/checkout
/account
/order/private pages
unsupported empty industries
internal preview routes
some faceted/filter states
```

### Acceptance criteria

- [ ] No public canonical page accidentally returns `noindex`.
- [ ] No public catalog page globally returns `nofollow`.
- [ ] Private/customer pages remain correctly excluded.
- [ ] Staging/preview environments remain noindex.
- [ ] Production and preview behavior are controlled independently.

---

# 8. P0-03 — eliminate redirect loop and normalize all shared internal redirects

Start with:

```text
https://www.mdsupplies.com/bariatricproducts
```

The exported audit reports a host-level loop.

Determine the true canonical destination. If the intended destination is the Bariatric category, link directly to the final category URL and make the old vanity route a one-hop redirect.

Also inspect every repeated/shared redirecting link using:

```text
Warning-indexable-Page_has_links_to_redirect.csv
Warning-indexable-Page_has_links_to_redirect-links.csv
Notice-Page_has_links_to_redirect.csv
Notice-Page_has_links_to_redirect-links.csv
```

Fix root components/helpers, not each page instance.

### Acceptance criteria

- [ ] Redirect loop count = 0.
- [ ] Current internal navigation does not intentionally link through 3XX.
- [ ] Shared header/footer/cards use final destinations.
- [ ] No internal link points to obsolete Shopify navigation unless migration requires it.

---

# 9. P0-04 — legacy product migration

Build a redirect resolver that validates the destination.

Preferred deterministic case:

```text
/products/:handle
301 ->
/product/:handle
```

**only if the new canonical destination exists.**

For legacy handles with no exact destination:

classify:

```text
EXACT_REPLACEMENT
NEAREST_VALID_REPLACEMENT
DISCONTINUED_NO_REPLACEMENT
DUPLICATE
INVALID_OLD_URL
```

Use 404/410 for genuinely removed content with no relevant equivalent.

### Do not

- redirect removed products to homepage;
- redirect every removed product to a category without relevance;
- use temporary 302s for permanent migration;
- create chains through old Shopify routes.

### Acceptance criteria

- [ ] Known valid old product URLs one-hop 301 to final new product.
- [ ] Final destination returns 200.
- [ ] Final destination self-canonicalizes.
- [ ] No product redirect chain.
- [ ] Exception list is documented.
- [ ] High-value legacy products with traffic/backlinks are explicitly verified.

---

# 10. P0-05 — legacy collection migration

Create an explicit map:

```text
legacy collection handle -> new canonical category/subcategory path
```

Example:

```json
{
  "adhesive-bandages": "/category/wound-care/adhesive-bandages",
  "exam-gloves": "/category/gloves/exam-gloves",
  "iv-catheters": "/category/iv-therapy/iv-catheters"
}
```

### Required logic

- [ ] Strong deterministic matches may be automated.
- [ ] Ambiguous handles must be manually mapped.
- [ ] No redirect to an unrelated top-level category.
- [ ] Old pagination URLs should not be recreated blindly.
- [ ] Legacy `?page=N` should resolve according to the final content strategy without chains.
- [ ] Validate destination status before enabling redirect.

### Known duplicate/ambiguous taxonomy requiring special care

Investigate these parent/child duplications:

```text
/category/hygiene
/category/hygiene/hygiene

/category/disinfectants
/category/disinfectants/disinfectants

/category/pharmacy-products
/category/pharmacy-products/pharmacy-products

/category/exam-room
/category/exam-room/exam-room

/category/wound-care
/category/wound-care/wound-care

/category/home-care
/category/home-care/home-care

/category/surgery-procedure
/category/surgery-procedure/surgery-procedure
```

Where child and parent represent the same intent/product set:

- choose one canonical;
- 301 the duplicate;
- update all internal links;
- remove duplicate from sitemap;
- retain only final canonical metadata/schema.

Do not consolidate solely from the slug. Compare actual product sets/content first.

---

# 11. P0-06 — canonical correctness

Use:

```text
Error-Canonical_points_to_redirect.csv
Error-Canonical_points_to_redirect-links.csv
```

Every indexable page should satisfy:

```text
page status = 200
canonical URL = final public URL
canonical status = 200
canonical hostname = primary hostname
canonical does not redirect
```

Do not canonicalize one meaningful product/category to another merely because their titles are similar.

### Acceptance criteria

- [ ] canonical-to-redirect issue = 0 for current canonical pages.
- [ ] No canonical points to `www` if apex is primary, or vice versa.
- [ ] No canonical points to `/products/` if `/product/` is final.
- [ ] No canonical points to `/collections/` if `/category/` is final.
- [ ] Query/filter states use intentional canonical policy.

---

# 12. P0-07 — classify all 4XXs instead of mass-redirecting

Use:

```text
Error-404_page.csv
Error-404_page-links.csv
Error-4XX_page.csv
Error-4XX_page-links.csv
```

Classify each unique root pattern:

### A. Current-site broken internal destination
Fix source link and/or destination.

### B. Legacy URL with a real equivalent
One-hop 301 to final canonical.

### C. Legacy asset URL
Fix source/CDN/proxy/template; do not create fake page redirects.

### D. Permanently deleted/no equivalent
Keep 404/410.

### E. Bot/noise/invalid URL
Do not create useless redirects unless the URL has meaningful signals.

### Acceptance criteria

- [ ] No current nav/card/breadcrumb points to 404.
- [ ] High-value historical URLs have relevant 301s.
- [ ] Genuine deletions remain proper 404/410.
- [ ] CDN asset failures are resolved at the asset layer.
- [ ] No homepage catch-all redirect.

---

# 13. P0-08 — fix broken redirects and chains

Use:

```text
Error-Broken_redirect.csv
Warning-3XX_redirect.csv
Notice-Redirect_chain.csv
Notice-Redirect_target_changed.csv
```

Desired:

```text
OLD -> 301 -> FINAL 200
```

Not:

```text
OLD -> OLD2 -> NEW -> FINAL
```

For all migration rules:

- direct legacy route to final target;
- preserve query only when meaningful;
- remove obsolete intermediate targets;
- detect loops automatically in tests.

### Acceptance criteria

- [ ] broken redirect = 0 for controlled routes.
- [ ] redirect loop = 0.
- [ ] avoidable redirect chain = 0.
- [ ] current site does not link internally to redirect sources.

---

# 14. P1-01 — internal-link architecture and crawlability

Once legacy migration is normalized, re-evaluate true orphans on the **new** architecture.

Every indexable product should be reachable through crawlable HTML anchors from a relevant hierarchy.

Preferred:

```text
Home
-> category
-> subcategory
-> product
```

with additional useful paths from:

- breadcrumbs;
- related/similar products;
- applicable industry pages;
- category cross-links.

Do not rely only on the XML sitemap for product discovery.

Use:

```text
Error-indexable-Orphan_page_(has_no_incoming_internal_links).csv
Notice-indexable-Page_has_only_one_dofollow_incoming_internal_link.csv
...-links.csv
```

but separate legacy pages from current canonical pages.

### Requirements

- [ ] Product cards output real crawlable `<a href>` links.
- [ ] Important discovery is present in server-rendered HTML.
- [ ] Infinite scrolling never becomes the sole crawler path.
- [ ] Pagination provides crawlable next/previous or page links where required.
- [ ] Back/Forward behavior and URL state remain correct for users.
- [ ] No JavaScript-only click handlers replace meaningful links.
- [ ] Breadcrumbs use final canonical hrefs.

---

# 15. P1-02 — category taxonomy / SEO consolidation

Audit all 708-ish category/subcategory URLs against:

- real product membership;
- H1;
- title;
- introductory content;
- internal links;
- canonical;
- traffic/impressions;
- duplicates/near-duplicates.

Investigate singular/plural collisions including:

```text
toothbrush-holder / toothbrush-holders
shaving-cream / shaving-creams
lotion / lotions
pressure-relief-cushion / pressure-relief-cushions
grab-bar / grab-bars
bed-wedge / bed-wedges
bariatric-trapeze-bar / bariatric-trapeze-bars
bariatric-lift-sling / bariatric-lift-slings
```

Also inspect:

```text
/category/trocars-trocar-kits
```

versus nested Surgery & Procedure trocar architecture.

### Rule

If two URLs materially serve the same query intent/product set:

1. choose one canonical route;
2. 301 the weaker/obsolete duplicate;
3. update internal links;
4. remove obsolete URL from sitemap;
5. preserve unique useful content where appropriate.

Do not create doorway-style keyword variations.

---

# 16. P1-03 — sitemap architecture

The current sitemap is valid in size but should be improved.

Target a sitemap index:

```text
/sitemap.xml
```

referencing logical child sitemaps, for example:

```text
/sitemaps/pages.xml
/sitemaps/categories.xml
/sitemaps/industries.xml
/sitemaps/partners.xml
/sitemaps/blog.xml
/sitemaps/products-1.xml
/sitemaps/products-2.xml
...
```

Stable sharding is preferred.

## Sitemap inclusion rule

A URL may appear only if it is:

- final `200`;
- intended indexable;
- self-canonical;
- not blocked from crawling;
- not a redirect;
- not a query/filter/sort URL;
- not a legacy route;
- not duplicate;
- not empty/soft-404;
- actually available on production.

## XML fields

Prefer:

```xml
<url>
  <loc>https://mdsupplies.com/product/example</loc>
  <lastmod>2026-08-21T12:00:00Z</lastmod>
</url>
```

Remove unnecessary `<priority>` and `<changefreq>` from generated output.

### `lastmod`

Use a trustworthy visible-content modification signal.

Do not update `lastmod` solely because an irrelevant backend field, bulk import, or internal administrative value changed.

Category `lastmod` should update when meaningful category content/membership changes.

### Acceptance criteria

- [ ] sitemap index validates.
- [ ] every listed URL returns 200.
- [ ] every listed URL is canonical/indexable.
- [ ] no `/products/` or `/collections/` legacy URL remains after migration.
- [ ] no duplicate parent/child taxonomy URL remains unintentionally.
- [ ] no filter/search/cart/account URL.
- [ ] product/category counts are documented.

---

# 17. P1-04 — robots.txt / SEO / GEO / AEO crawler policy

Implement only after migration redirects/canonical host are correct.

Recommended baseline:

```text
User-agent: *
Allow: /

Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /search

Disallow: /*?*filter=
Disallow: /*?*filter.
Disallow: /*?*sort=
Disallow: /*?*sort_by=
Disallow: /*?*view=

Sitemap: https://mdsupplies.com/sitemap.xml
```

Adjust to the actual query model. Do not block useful product pagination accidentally.

Do not block:

```text
/category/
/product/
/blog/
/industries/
/_next/
```

when these are required for rendering/indexing.

### AI search

If the business wants maximum AI-search discoverability, allow general crawlers and do not block search-specific crawlers.

Training crawlers may be handled separately if business policy requires it; do not confuse AI training controls with search visibility.

No engineering priority should be placed on `llms.txt` over canonical HTML, structured data, Merchant Center, sitemap, internal links, and crawlability.

---

# 18. P1-05 — faceted navigation and parameter control

Use:

```text
Notice-More_than_three_parameters_in_URL.csv
Notice-More_than_three_parameters_in_URL-links.csv
```

Audit real URL behavior for:

```text
search
filter
brand
size
material
price
sort
pagination
```

### Rules

- Do not allow combinatorial filters to create an unlimited indexable URL space.
- Filter/sort URLs generally should not enter sitemap.
- Canonical strategy must be intentional.
- User navigation must still function.
- Category page 2+ must remain crawlable if needed to discover products.
- Server-rendered product links should not require crawler interaction with a facet UI.

---

# 19. P1-06 — structured data

Use:

```text
Notice-Structured_data_has_Google_rich_results_validation_error.csv
```

Fix all new-site errors.

Validate at least:

```text
Product
Offer
BreadcrumbList
Organization / OnlineStore
WebSite
ItemList where used
MerchantReturnPolicy where used
OfferShippingDetails where used
```

## Product data alignment

Schema must match visible/store data:

```text
name
description
image
sku
mpn
gtin/barcode
brand
category
price
priceCurrency
availability
itemCondition
url
shippingDetails
return policy
```

Never output:

- a price not visible/valid;
- fake availability;
- zero-price Offer if the storefront intentionally blocks zero-price purchase;
- mismatched product URL;
- old `/products/` canonical;
- nonexistent image;
- vendor as public brand when brand has a distinct approved field.

### Acceptance criteria

- [ ] Google rich-results validation errors from the audit = 0 for supported schema.
- [ ] Product JSON-LD matches visible content.
- [ ] breadcrumb hierarchy matches rendered navigation.
- [ ] schema URLs use final canonical hostname.

---

# 20. P1-07 — IndexNow / freshness

Use:

```text
Notice-Pages_to_submit_to_IndexNow.csv
```

Implement IndexNow for materially changed public URLs if not already implemented.

Trigger on meaningful:

- product creation;
- product publication/unpublication;
- price change;
- availability change;
- category membership/content change;
- URL migration;
- deletion/redirect.

Do not submit every minor backend metadata write.

Log submissions safely without secrets.

---

# 21. P2-01 — metadata and headings

Use the relevant title/meta/H1 CSVs, but do not waste time rewriting metadata on legacy URLs that will redirect.

Only optimize **final canonical public pages**.

## Titles

Aim for concise, descriptive, unique titles that reflect actual page intent.

Avoid mechanically stuffing the same keywords into every route.

## Meta descriptions

Provide unique descriptions for important categories/products where feasible.

Generated product metadata may use catalog attributes but must remain natural and truthful.

## H1

- one clear primary H1 per page;
- do not treat repeated component headings as additional H1s;
- product name should normally be the PDP H1;
- category name should normally be category H1.

### Acceptance criteria

- [ ] no missing H1 on canonical routes.
- [ ] no accidental multiple primary H1s.
- [ ] title/meta values are unique enough to distinguish page intent.
- [ ] legacy pages scheduled for redirect are not separately optimized.

---

# 22. P2-02 — image/CDN/static asset architecture

Use:

```text
Warning-Image_redirects.csv
Warning-Page_has_redirected_image.csv
Error-Image_broken.csv
Error-Page_has_broken_image.csv
Error-Image_file_size_too_large.csv
Warning-Missing_alt_text.csv
Warning-Page_has_redirected_JavaScript.csv
Warning-JavaScript_redirects.csv
Warning-Page_has_redirected_CSS.csv
Warning-CSS_redirects.csv
```

The exported data indicates many warnings are shared legacy Shopify/CDN/template issues.

Fix final source URLs or proxy configuration.

### Image requirements

- [ ] final image URL should be requested directly when practical;
- [ ] no host redirect causes image 404;
- [ ] responsive `sizes/srcset`;
- [ ] width/height or aspect ratio to prevent CLS;
- [ ] use optimized format where appropriate;
- [ ] lazy-load below fold;
- [ ] do not lazy-load critical LCP image improperly;
- [ ] meaningful alt text for informative images;
- [ ] decorative image alt is empty;
- [ ] no broken-image icon;
- [ ] no excessive full-resolution product image in tiny cards.

### JS/CSS

Current Next.js app assets should resolve directly without unnecessary redirect.

Do not attempt to “fix” obsolete Shopify theme files individually if retiring the legacy frontend solves them.

---

# 23. P2-03 — slow pages / Core Web Vitals

Use:

```text
Warning-Slow_page.csv
```

Separate legacy Shopify slow pages from new headless pages.

For current production headless routes inspect:

- TTFB;
- LCP;
- INP;
- CLS;
- JS bundle size;
- product grid hydration;
- server data requests;
- image weight;
- third-party scripts;
- fonts;
- CDN caching;
- Shopify Storefront API request waterfalls.

Do not degrade SEO server rendering in pursuit of client-only speed.

### Acceptance criteria

- [ ] no systemic performance regression.
- [ ] critical content is present in server response where intended.
- [ ] category/product LCP is materially improved or within target.
- [ ] no CLS from images/cards.
- [ ] mobile product page remains responsive after designer changes.

---

# 24. P2-04 — external links

Use:

```text
Notice-External_4XX.csv
Notice-External_4XX-links.csv
Notice-External_3XX_redirect.csv
Notice-External_3XX_redirect-links.csv
```

- replace broken external destinations where a valid final URL exists;
- link directly to final external URL if safe;
- do not remove a legitimate citation/resource merely because it redirects once unless the destination is known;
- verify vendor/partner URLs before changing.

---

# 25. Designer feedback — implement fully

Source: `MDSupplies_Feedback.docx`.

## DESIGN-01 — PDP recommendation section labels

Current:

```text
You May Also Like
You May Also Need
```

Change to:

```text
First section:  You May Also Need
Second section: Similar Products
```

### Requirements

- preserve recommendation logic;
- only change labels unless logic is clearly mapped incorrectly;
- maintain one H2-style hierarchy per section, not H1;
- verify desktop/mobile spacing;
- ensure sections are distinguishable and not duplicate content.

### Acceptance

- [ ] exact requested labels.
- [ ] no duplicate section title.
- [ ] recommendation links go directly to canonical product URLs.

---

## DESIGN-02 — mobile product specifications/options

Current mobile UI uses a horizontally scrolling option/specification bar.

Replace the mobile presentation with a dropdown/select-style control similar in discoverability to major ecommerce mobile PDPs.

### Requirements

- desktop behavior may remain if effective;
- on mobile, all valid options must be visible from the control;
- selected option must be obvious;
- changing option must preserve existing variant/product logic;
- disabled/unavailable options must remain accurately represented;
- keyboard/screen-reader labels required;
- do not hide price, availability, RX, shipping, SKU or variant changes;
- URL/state behavior must remain correct if option selection currently affects URL/state;
- no accidental add-to-cart of the wrong variant.

### Required testing

Test:

- one-option product;
- many-option product;
- unavailable option;
- out-of-stock option;
- RX product;
- zero-price blocked product;
- backorder product;
- option change followed by add to cart;
- page reload/back-forward behavior.

---

## DESIGN-03 — Trusted Brands We Carry spacing

Increase `margin-right` between brand logos to **40px** as requested.

### Requirements

- preserve responsive marquee/grid behavior;
- avoid clipping/overflow on small screens;
- do not produce a huge visual gap on wrapping layouts;
- test at 375, 390, 768, 1280, 1440 widths.

---

## DESIGN-04 — Shop By Industry imagery

The same/similar model is repeated across all four industry cards.

Use visually distinct approved images so the cards do not look duplicated.

### Requirements

- different image per visible industry card where assets permit;
- imagery must accurately represent the associated industry;
- preserve aspect ratio/crop;
- avoid destructive crops of faces/clinical context;
- use optimized responsive assets;
- meaningful alt text where image conveys the industry;
- no stock image that implies unsupported products/services.

If approved assets already exist in the repo/Shopify, use them. Do not invent claims in images.

---

## DESIGN-05 — `/category/private-practice` 404

Designer reports:

```text
/category/private-practice
```

returns 404.

Determine why this route is being linked.

Do **not** simply create a new indexable category with no catalog source.

Possible correct outcomes:

1. link is wrong and should point to an existing supported industry route;
2. a valid Private Practice industry/category route exists under a different canonical path;
3. intended page has real assortment and should be implemented;
4. page is unsupported and the link should be removed.

### Acceptance

- [ ] no current UI links to a 404.
- [ ] any replacement route is real, meaningful, and canonical.
- [ ] unsupported empty page is not added to sitemap merely to eliminate the 404.

---

## DESIGN-06 — `/policies/privacy` and `/policies/terms` blank

These URLs appear in the existing sitemap but designer reports the pages have no content.

Fix the rendering/data source.

### Critical rule

**Do not fabricate legal policy language.**

Preferred source order:

1. existing Shopify policy content, if configured;
2. existing approved policy content already in repository/content system;
3. otherwise remove the empty route from indexable sitemap/navigation until approved content exists, while maintaining an appropriate user-safe state.

If policy content exists in Shopify, render it server-side with correct headings and canonical metadata.

### Acceptance

- [ ] no blank 200 policy page.
- [ ] no empty indexable URL in sitemap.
- [ ] existing approved policy text is not rewritten without approval.
- [ ] links in footer/nav resolve correctly.

---

# 26. SEO/GEO/AEO page-content architecture

Do not create hundreds of AI-specific pages.

Improve the canonical category/product pages.

## Category pages

Where content is weak, include useful, factual sections such as:

- what the category contains;
- product types;
- key attributes users select;
- common professional use contexts;
- brand/product differences supported by actual catalog data;
- related categories;
- concise FAQs only where answers are factual and useful.

Keep the primary shopping grid high enough on the page for CRO.

## Product pages

Expose structured factual attributes clearly:

```text
brand
SKU
MPN/GTIN where available
material
sterility
size
quantity/case pack
intended product type/use
availability
shipping/returns source
```

Do not create unsupported medical efficacy claims.

## Internal entity relationships

Use:

```text
BreadcrumbList
category -> subcategory -> product links
related products
similar products
you may also need
supported industry links where genuinely relevant
```

This is more valuable for search/answer engines than artificial “GEO keyword stuffing.”

---

# 27. Shopify/headless storefront protections during SEO work

Regression-test all launch-critical commerce invariants after routing/layout changes:

- RX tag + metafield union;
- RX checkout enforcement;
- direct checkout bypass protections;
- zero-price blocking;
- no-rate/unshippable cart behavior;
- free-shipping resolver;
- backorder rendering;
- inventory/unavailable states;
- Vendor hidden as Brand where required;
- account authorization;
- order ownership;
- form submission;
- analytics deduplication;
- mobile quick-add/add-to-cart;
- product variant selection.

SEO is not complete if rankings improve but customers cannot purchase correctly.

---

# 28. Automated SEO guardrail tests to add

Add tests so these regressions cannot silently return.

## Route/canonical tests

For representative dynamic routes assert:

```text
status === 200
canonical === expected final URL
robots does not include noindex for public route
canonical destination status === 200
```

## Redirect tests

Assert:

```text
old /products/:handle -> one-hop /product/:handle
mapped /collections/:handle -> one-hop mapped category
secondary hostname -> one-hop primary hostname
no loop
no chain > 1 when controlled
```

## Sitemap tests

Assert every sitemap URL:

```text
is primary hostname
has no query
is not old /products/
is not old /collections/
is not /search /cart /account /checkout
is not known noindex
is not redirect
```

## Internal-link tests

Scan rendered critical pages:

```text
no href -> known redirect
no href -> current 404
no accidental www/apex mismatch
breadcrumbs final
recommendation product links final
```

## Robots tests

Public production route => indexable.  
Preview/staging => noindex.  
Private route => noindex as designed.

## Structured-data tests

Parse all emitted JSON-LD and validate required local invariants:

- canonical URL;
- name;
- SKU;
- valid Offer only when valid price;
- availability;
- breadcrumb sequence;
- no duplicate JSON-LD identifiers/URLs.

---

# 29. Required QA matrix

Test at minimum:

```text
375x812
390x844
768x1024
1024x768
1280x800
1440x900
1920x1080
```

Routes/states:

- homepage;
- Categories hub;
- top-level category;
- deep subcategory;
- search;
- filtered category;
- sort;
- page 2+;
- product with one option;
- product with many options;
- out-of-stock product;
- backorder product;
- RX product;
- zero-price blocked product;
- product missing optional image;
- industry hub;
- supported industry;
- private-practice link/route;
- partners;
- blog index;
- blog article;
- privacy;
- terms;
- cart;
- account/private route;
- 404 page;
- legacy product redirect;
- legacy collection redirect.

Verify:

```text
status
canonical
robots
H1
title
schema
internal links
mobile usability
keyboard usability
no console errors
no broken images
```

---

# 30. Accessibility requirements

Designer changes must not regress accessibility.

- visible focus;
- semantic `<select>` or accessible custom combobox;
- correct labels;
- no inaccessible horizontal-only option UI on mobile;
- heading hierarchy;
- alt text;
- keyboard navigation;
- dialog focus behavior;
- contrast;
- tap targets;
- reduced motion;
- no serious/critical Axe violations.

---

# 31. Final Ahrefs recrawl procedure

After deployment of the architectural fixes:

1. clear/refresh Ahrefs crawl where appropriate;
2. crawl the canonical production host;
3. include sitemap as a source;
4. crawl JavaScript where required;
5. compare against the 20/21 Aug baseline;
6. export remaining issues again;
7. classify residual findings into:
   - expected/intentional;
   - true defect;
   - third-party;
   - legacy external URL still propagating;
   - crawler limitation.

Do not mark complete solely because counts decrease.

---

# 32. Final acceptance gates

## P0 gate — must all pass

- [ ] one production canonical hostname;
- [ ] zero host redirect loops;
- [ ] no public-site global `noindex,nofollow`;
- [ ] canonical URLs do not redirect;
- [ ] current internal navigation avoids redirects;
- [ ] current internal links do not point to 404;
- [ ] legacy product redirects are relevant and direct;
- [ ] legacy collections have explicit mapping where needed;
- [ ] sitemap contains only canonical indexable final URLs;
- [ ] robots.txt does not block important migration/indexable routes;
- [ ] new-site structured-data validation errors fixed;
- [ ] `/category/private-practice` link/route issue resolved;
- [ ] privacy/terms no longer blank indexable pages;
- [ ] checkout/RX/shipping/pricing behavior unchanged.

## P1 gate

- [ ] new canonical products/categories are internally discoverable;
- [ ] category hierarchy clean;
- [ ] duplicate taxonomy consolidated where evidence supports it;
- [ ] filter crawl space controlled;
- [ ] pagination remains crawlable where needed;
- [ ] IndexNow implemented/verified if approved;
- [ ] sitemap index and lastmod strategy verified.

## P2 gate

- [ ] broken images fixed;
- [ ] avoidable image/JS/CSS redirects fixed for current app;
- [ ] oversized current assets optimized;
- [ ] slow new-site pages investigated/fixed;
- [ ] metadata/H1 issues remediated on final pages;
- [ ] alt-text defects fixed;
- [ ] external broken links cleaned.

## Designer gate

- [ ] recommendation labels changed exactly as requested;
- [ ] mobile PDP option/spec control implemented and tested;
- [ ] brand logo spacing updated to 40px and responsive;
- [ ] Shop By Industry uses distinct approved imagery;
- [ ] private-practice broken route fixed correctly;
- [ ] privacy and terms content rendering corrected.

---

# 33. Required final developer report

Create:

```text
docs/audits/2026-08-seo-remediation/FINAL-RESULTS.md
```

Include:

## A. Git/release evidence

- starting SHA;
- final SHA;
- branch;
- commit list;
- diff summary;
- files changed.

## B. Root causes found

For every major Ahrefs issue:

```text
issue
root cause
files/components/config responsible
implementation
before count
after count
remaining count
reason remaining
```

## C. Host/canonical matrix

Document apex and `www` before/after.

## D. Redirect migration

- product redirect strategy;
- number exact mapped;
- exception count;
- collection mapping count;
- unresolved URLs;
- 404/410 decisions;
- no homepage blanket redirects.

## E. Sitemap / robots

- sitemap files/counts;
- validation;
- robots output;
- noindex route matrix.

## F. Internal linking

- orphan current canonical count;
- one-inlink count;
- hierarchy changes;
- pagination evidence.

## G. Schema

- Product;
- Breadcrumb;
- Organization/OnlineStore;
- WebSite;
- validation output.

## H. Performance

- slow routes before/after;
- large asset changes;
- image redirect fixes;
- JS/CSS asset behavior.

## I. Designer feedback

Provide screenshot evidence for all six designer items.

## J. Regression

Report:

- unit;
- typecheck;
- lint;
- build;
- Playwright/E2E;
- Axe;
- route/canonical tests;
- redirect tests;
- sitemap tests;
- commerce guardrails;
- viewport screenshot matrix.

## K. Remaining risks

Do not hide remaining warnings. Explain each.

---

# 34. Execution rule

Do not stop after fixing one symptom.

For each issue family:

```text
CSV evidence
-> identify repeating pattern
-> trace generating code/config
-> implement root-cause fix
-> automated regression test
-> preview verification
-> deploy
-> recrawl
-> compare
```

The priority is:

```text
architecture
-> crawlability
-> indexability
-> migration
-> internal linking
-> sitemap/robots
-> schema
-> performance
-> metadata
-> visual/CRO polish
```

A visually perfect page that cannot be crawled is not complete.  
A crawlable page with broken checkout is not complete.  
An Ahrefs score improved by hiding pages is not complete.

---

# Appendix A — Ahrefs CSV package manifest

The supplied ZIP contains the following CSV evidence files. Use both issue-level and `-links` exports whenever the relationship/source-target detail is needed.

### Indexability / canonical / robots / sitemap

- `Error-Canonical_points_to_redirect-links.csv`
- `Error-Canonical_points_to_redirect.csv`
- `Notice-HTTP_to_HTTPS_redirect-links.csv`
- `Notice-HTTP_to_HTTPS_redirect.csv`
- `Notice-Indexable_page_became_non-indexable.csv`
- `Notice-Indexable_page_not_in_sitemap.csv`
- `Notice-Noindex_and_nofollow_page.csv`
- `Warning-Nofollow_page.csv`
- `Warning-Noindex_page.csv`

### Redirects / 3XX / 4XX / broken links

- `Error-404_page-links.csv`
- `Error-404_page.csv`
- `Error-4XX_page-links.csv`
- `Error-4XX_page.csv`
- `Error-Broken_redirect.csv`
- `Error-Redirect_loop.csv`
- `Error-indexable-HTTPS_page_has_internal_links_to_HTTP-links.csv`
- `Error-indexable-HTTPS_page_has_internal_links_to_HTTP.csv`
- `Error-indexable-Page_has_links_to_broken_page-links.csv`
- `Error-indexable-Page_has_links_to_broken_page.csv`
- `Notice-External_3XX_redirect-links.csv`
- `Notice-External_3XX_redirect.csv`
- `Notice-External_4XX-links.csv`
- `Notice-External_4XX.csv`
- `Notice-Page_has_links_to_redirect-links.csv`
- `Notice-Page_has_links_to_redirect.csv`
- `Notice-Redirect_chain-links.csv`
- `Notice-Redirect_chain.csv`
- `Notice-Redirect_target_changed.csv`
- `Notice-Redirected_page_has_no_incoming_internal_links-links.csv`
- `Notice-Redirected_page_has_no_incoming_internal_links.csv`
- `Warning-3XX_redirect-links.csv`
- `Warning-3XX_redirect.csv`
- `Warning-CSS_redirects-links.csv`
- `Warning-CSS_redirects.csv`
- `Warning-Image_redirects-links.csv`
- `Warning-Image_redirects.csv`
- `Warning-JavaScript_redirects-links.csv`
- `Warning-JavaScript_redirects.csv`
- `Warning-Page_has_links_to_broken_page-links.csv`
- `Warning-Page_has_links_to_broken_page.csv`
- `Warning-Page_has_redirected_CSS-links.csv`
- `Warning-Page_has_redirected_CSS.csv`
- `Warning-Page_has_redirected_JavaScript-links.csv`
- `Warning-Page_has_redirected_JavaScript.csv`
- `Warning-Page_has_redirected_image-links.csv`
- `Warning-Page_has_redirected_image.csv`
- `Warning-indexable-Page_has_links_to_redirect-links.csv`
- `Warning-indexable-Page_has_links_to_redirect.csv`

### Internal linking / crawl architecture

- `Error-indexable-Orphan_page_(has_no_incoming_internal_links).csv`
- `Notice-Page_has_nofollow_and_dofollow_incoming_internal_links-links.csv`
- `Notice-Page_has_nofollow_and_dofollow_incoming_internal_links.csv`
- `Notice-Page_has_nofollow_incoming_internal_links_only-links.csv`
- `Notice-Page_has_nofollow_incoming_internal_links_only.csv`
- `Notice-Page_has_nofollow_outgoing_internal_links-links.csv`
- `Notice-Page_has_nofollow_outgoing_internal_links.csv`
- `Notice-Page_has_only_one_dofollow_incoming_internal_link-links.csv`
- `Notice-Page_has_only_one_dofollow_incoming_internal_link.csv`
- `Notice-indexable-Page_has_nofollow_and_dofollow_incoming_internal_links-links.csv`
- `Notice-indexable-Page_has_nofollow_and_dofollow_incoming_internal_links.csv`
- `Notice-indexable-Page_has_only_one_dofollow_incoming_internal_link-links.csv`
- `Notice-indexable-Page_has_only_one_dofollow_incoming_internal_link.csv`

### Content / metadata / headings

- `Notice-H1_tag_missing_or_empty.csv`
- `Notice-Meta_description_too_long.csv`
- `Notice-Meta_description_too_short.csv`
- `Notice-Multiple_H1_tags.csv`
- `Notice-indexable-H1_tag_changed.csv`
- `Notice-indexable-Multiple_H1_tags.csv`
- `Notice-indexable-Page_and_SERP_titles_do_not_match.csv`
- `Warning-indexable-H1_tag_missing_or_empty.csv`
- `Warning-indexable-Meta_description_tag_missing_or_empty.csv`
- `Warning-indexable-Meta_description_too_long.csv`
- `Warning-indexable-Meta_description_too_short.csv`
- `Warning-indexable-Title_too_long.csv`

### Images / performance / assets

- `Error-Image_broken-links.csv`
- `Error-Image_broken.csv`
- `Error-Image_file_size_too_large-links.csv`
- `Error-Image_file_size_too_large.csv`
- `Error-Page_has_broken_image-links.csv`
- `Error-Page_has_broken_image.csv`
- `Warning-Missing_alt_text-links.csv`
- `Warning-Missing_alt_text.csv`
- `Warning-Slow_page.csv`

### Structured data / parameters / IndexNow / traffic

- `Notice-More_than_three_parameters_in_URL-links.csv`
- `Notice-More_than_three_parameters_in_URL.csv`
- `Notice-Organic_traffic_dropped.csv`
- `Notice-Pages_dropped_from_Top_10.csv`
- `Notice-Pages_to_submit_to_IndexNow.csv`
- `Notice-Structured_data_has_Google_rich_results_validation_error.csv`


---

# Appendix B — Issue-specific CSV usage map

## Host/canonical/indexability

Start with:

```text
Error-Canonical_points_to_redirect.csv
Error-Canonical_points_to_redirect-links.csv
Warning-Noindex_page.csv
Warning-Nofollow_page.csv
Notice-Noindex_and_nofollow_page.csv
Notice-Indexable_page_became_non-indexable.csv
Notice-Indexable_page_not_in_sitemap.csv
```

## 404 / redirect migration

```text
Error-404_page.csv
Error-404_page-links.csv
Error-4XX_page.csv
Error-4XX_page-links.csv
Error-Broken_redirect.csv
Error-Redirect_loop.csv
Warning-3XX_redirect.csv
Notice-Redirect_chain.csv
Notice-Redirect_target_changed.csv
```

## Internal links

```text
Error-indexable-Orphan_page_(has_no_incoming_internal_links).csv
Warning-indexable-Page_has_links_to_redirect.csv
Warning-indexable-Page_has_links_to_redirect-links.csv
Notice-indexable-Page_has_only_one_dofollow_incoming_internal_link.csv
Notice-indexable-Page_has_only_one_dofollow_incoming_internal_link-links.csv
Notice-Page_has_nofollow_incoming_internal_links_only.csv
Notice-Page_has_nofollow_outgoing_internal_links.csv
```

## Content

```text
Warning-indexable-Title_too_long.csv
Warning-indexable-Meta_description_too_long.csv
Warning-indexable-Meta_description_too_short.csv
Warning-indexable-Meta_description_tag_missing_or_empty.csv
Warning-indexable-H1_tag_missing_or_empty.csv
Notice-indexable-Multiple_H1_tags.csv
Notice-indexable-Page_and_SERP_titles_do_not_match.csv
```

## Images/assets/performance

```text
Warning-Slow_page.csv
Error-Image_file_size_too_large.csv
Error-Page_has_broken_image.csv
Error-Image_broken.csv
Warning-Image_redirects.csv
Warning-Page_has_redirected_image.csv
Warning-Missing_alt_text.csv
Warning-Page_has_redirected_JavaScript.csv
Warning-JavaScript_redirects.csv
Warning-Page_has_redirected_CSS.csv
Warning-CSS_redirects.csv
```

## Other technical

```text
Notice-More_than_three_parameters_in_URL.csv
Notice-Structured_data_has_Google_rich_results_validation_error.csv
Notice-Pages_to_submit_to_IndexNow.csv
Notice-External_4XX.csv
Notice-External_3XX_redirect.csv
```

---

# Appendix C — Definition of done

This ticket is complete only when:

1. current production architecture is normalized;
2. migration signals are explicit and one-hop;
3. the canonical new site is crawlable and indexable;
4. sitemap/robots/canonicals all agree;
5. internal links point directly to final URLs;
6. true 404s are intentional and broken internal 404s are gone;
7. structured data matches the storefront;
8. remaining Ahrefs issues are either fixed or documented as intentional;
9. designer feedback is implemented and visually tested;
10. all commerce/security/compliance regression tests pass;
11. `FINAL-RESULTS.md` contains evidence and exact final SHA.
