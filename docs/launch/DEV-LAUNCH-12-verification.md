# DEV-LAUNCH-12 — Crawlability, Structured Data, Analytics & Forms Verification

**Ticket:** DEV-LAUNCH-12 (Final Launch Configuration & Implementation Plan, 2026-08-05) · **Priority:** Medium — P1 launch gate · **Owner:** Developers
**Builds on:** [DEV-LAUNCH-06-verification.md](./DEV-LAUNCH-06-verification.md) (no-reload catalog navigation — this ticket's blocker),
[DEV-LAUNCH-09-verification.md](./DEV-LAUNCH-09-verification.md)
**Last commit at time of writing:** `8521ed1a04f5dc55d2038bd0d38e8134474ae0ac` — everything described here is **uncommitted**, pending review.
**Branch:** `catalog-cro-review-sardor-dev`
**QA store queried:** `md-supplies-qa-shipping-and-checkout.myshopify.com`

## Scope decision made before starting

The ticket's own "Open item" flagged that 1,285 product-to-product redirects
in `docs/redirects-ready.json` still need to be loaded into `proxy.ts`, and
asked to confirm whether that lands in this ticket before starting redirect
verification. **Decided with the requester: kept separate.** This pass verifies
canonical/sitemap/robots/noindex and the redirect entries already wired into
`proxy.ts`; the bulk load of the remaining 1,285 entries is a distinct,
separately-tracked change (large mechanical data change, own risk profile).

## Method

DEV-LAUNCH-06 (this ticket's stated blocker) was independently confirmed
complete and correct before starting — the no-reload navigation model,
tracking-param echo, and result-count/URL consistency it describes are all
in place and re-verified below where relevant.

Four independent research passes (read-only, no edits) covered SEO
crawlability, structured data, analytics events + GCLID/UTM, and forms +
support-email consistency. Confirmed defects were then fixed in this working
tree, followed by a live verification pass against the QA store — production
build (`next start`, not `next dev`, to exclude React StrictMode's dev-only
double-effect-invocation from the analytics-dedup checks) driven with browser
automation, plus direct `curl` checks for SEO/redirect/attribution behavior.

## Defects found and fixed this pass

### Structured data

**D1 (HIGH) — Product schema could disagree with the visibly-selected variant, or drop pricing entirely.**
`app/product/[slug]/page.tsx` built its `ProductSchema` props from
`product.variants.nodes[0]` (raw Shopify array order), while `ProductView.tsx`
renders the *default purchasable variant* via `getDefaultVariant()` (skips
$0/quote-only and out-of-stock entries — this catalog has 41 ACTIVE variants
priced ≤ 0, see `lib/purchasability.ts`). When `variants[0]` wasn't the
default purchasable variant, the JSON-LD could show a different price/SKU
than what the page actually sells, or — since a $0 price fails
`hasUsablePrice` — silently drop `offers` entirely even though the product is
purchasable. Directly contradicts the acceptance criterion "Structured data
validates and reflects visible content."
**Fix:** extracted `getDefaultVariant()` into `lib/purchasability.ts` (typed
generically via `VariantForDefault`) so `ProductView.tsx` and
`app/product/[slug]/page.tsx` build from the exact same selection — the two
can no longer drift apart. New unit coverage:
`lib/__tests__/purchasability.test.ts` (`getDefaultVariant` describe block,
5 tests: skips leading $0 variant, skips leading OOS variant, falls back
correctly when nothing is purchasable, falls back to `variants[0]` as a last
resort, single-variant passthrough).

**D2 (HIGH) — `/faq` had zero FAQPage markup despite 9 visible Q&As.**
`app/faq/page.tsx` renders `FaqAccordion` (9 real questions) but never called
`FAQSchema` — the sibling `components/b2b/FAQSection.tsx` gets this right on
other pages, `/faq` itself didn't.
**Fix:** `FaqAccordion.tsx` now also renders `<FAQSchema faq={FAQ_ITEMS} />`
(fields renamed `q`/`a` → `question`/`answer` to match `FAQSchema`'s prop
shape, mapped back to `q`/`a` for the `Accordion` display component — same
pattern `FAQSection.tsx` already uses). **Live-verified**: `curl localhost/faq`
now emits a `FAQPage` JSON-LD block with all 9 `Question`/`Answer` pairs,
CSP-nonced.

**D4 (LOW) — Category `ItemList` JSON-LD script had no CSP nonce**, unlike
every other JSON-LD emitter in the codebase (`app/layout.tsx`,
`CategoryPageView.tsx`, all of `components/schema/*`). Site enforces a
nonce + `strict-dynamic` CSP with no `unsafe-inline`; harmless today since
`application/ld+json` isn't treated as executable, but broke the codebase's
own convention.
**Fix:** `CategoryResults.tsx` now awaits `getNonce()` and stamps it on the
`<script>` tag, matching every other emitter. Live-verified on
`/category/gloves`.

*(D3 — no `ProductSchema` on the `/category/[slug]/[product]` fallback route —
confirmed **not a defect**: that route's own `generateMetadata` already
canonicalizes to `/product/[handle]` via `buildMetadata({ pageType: 'product',
slug: handle })`, so it's a non-indexed duplicate by design and doesn't need
its own copy of the schema.)*

### SEO / crawlability

**S1 (LOW) — `app/(noindex)/` had no shared `layout.tsx`.** Each of the 5
pages in the group (account/login, account, account/orders,
account/orders/[number], cart) set `robots: {index:false, follow:false}`
individually — correct today, but with no structural guardrail against a
future page in the group forgetting to.
**Fix:** added `app/(noindex)/layout.tsx` exporting the same `robots` object
as a safety net. Confirmed safe: per Next's metadata docs, nested fields like
`robots` defined by a descendant segment **overwrite** (not merge) an
ancestor's, so every existing page's explicit setting is unaffected.

**S2 (LOW) — `proxy.ts` redirect matching had no trailing-slash normalization**,
so a legacy URL hit with an extra trailing slash fell through to a 404
instead of its intended 301/410. (Deliberately did **not** add case-insensitive
matching — the 1,285-entry bulk table and hand-written entries preserve the
legacy CMS's exact mixed-case paths, and normalizing case risks silently
merging two originally-distinct URLs. Flagged, not fixed, matching the
"don't guess" principle used elsewhere on this branch.)
**Fix:** `proxy.ts` strips a single trailing slash (never the root `/`)
before matching. New regression coverage in `__tests__/proxy.test.ts`
(static 301 entry, bulk product redirect, item-level 410, and a guard that
`/` itself is never stripped to empty).
**Live-verified nuance**: a request for `/Medical-Supply-Store.html/` gets a
**two-hop** redirect in this Next.js version — Next's own router issues a
308 to strip the trailing slash *before* middleware runs, then `proxy.ts`'s
301 fires on the second request. The final destination is correct either
way; this is a framework-level hop this repo's middleware cannot avoid, not
a defect in the fix (confirmed via `curl -sIL`, unit tests call `proxy()`
directly and don't see this framework layer at all).

### Analytics — GCLID/UTM persistence (the launch-blocking gap)

**A1 (HIGH) — gclid/utm_\* had no durable storage.** `withTrackingParams()`
(`lib/analytics/tracking-params.ts`) only echoes tracking params through the
querystring of same-page discovery navigation (filter/sort/search/page) —
confirmed still correct and DEV-LAUNCH-06-safe. But nothing stored them: the
instant a shopper clicked off a discovery page into a product or `/cart`,
the params vanished, so `add_to_cart`/`begin_checkout`/lead-form submissions
carried no attribution trail.
**Fix — first-party, first-touch capture, scoped honestly:**
- New `lib/analytics/attribution.ts`: `serializeAttribution()`,
  `readStoredAttribution()` (server-only, reads the `md_attr` cookie),
  `formatAttributionLine()`.
- `proxy.ts` captures gclid/utm_\* into a 90-day, `httpOnly`, `SameSite=Lax`
  cookie on the pass-through path, first-touch only (never overwrites an
  existing capture). Scoped to pass-through deliberately — ad traffic lands
  on live canonical URLs, not legacy redirect/410 paths.
- `app/api/contact/route.ts` and `app/api/sourcing/route.ts` now read the
  stored attribution and append an `Attribution: gclid=…, utm_source=…` line
  to the lead email when present, so a sales rep can see which campaign
  produced a lead — omitted entirely when nothing was captured.
- **Deliberately not built**: attaching gclid to every GA4 event
  (`add_to_cart`, `view_item`, etc.) as an event parameter. Ad-platform
  conversion attribution (Google Ads/Bing) is normally handled by GTM's own
  Conversion Linker tag writing its own first-party cookies (`_gcl_au` etc.)
  — a GTM container configuration concern, unverifiable from this repo.
  **Flagged for whoever manages the GTM container**: confirm the Conversion
  Linker tag (or equivalent) is active, since this codebase cannot verify it.
- New tests: `lib/analytics/__tests__/attribution.test.ts` (9 tests:
  serialize/parse/fail-safe-on-tamper/format), `__tests__/proxy.test.ts`
  (3 tests: captures on tracked pass-through, no-op with no tracking params,
  never overwrites first-touch), plus one test per form route confirming the
  attribution line reaches the actual email body and is omitted when absent.
- **Live-verified**: `curl -I "localhost/category/gloves?gclid=test123&utm_source=google"`
  → `Set-Cookie: md_attr=...HttpOnly; SameSite=lax`; a subsequent
  `/api/sourcing` POST carrying that cookie reaches the route (confirmed via
  the route's own mocked test, since Resend isn't configured for a real send
  in this environment — same limitation the DEV-LAUNCH-09 pass hit).

**A3 (LOW) — `begin_checkout` could double-fire on a rapid double-click.**
Both `CartPopup.tsx` and `CartPageClient.tsx`'s checkout handlers were async
with no in-flight guard between the click and the awaited RX-gate/navigation
handoff.
**Fix:** added a `useRef`-based in-flight guard to both handlers (`finally`
resets it, so a blocked/failed handoff can be retried).
**Live-verified**: dispatched two synchronous `click` events on the checkout
link via `javascript_tool` — `dataLayer` shows exactly **one**
`begin_checkout` push, confirmed *before* the subsequent navigation to
Shopify checkout would have wiped the evidence.

*(A2 — no dedicated `search`/`filter`/`sort` GA4 events, only inferred via
`page_view` + `view_item_list` — **not fixed**. Inventing new event
names/params without a defined taxonomy risks conflicting with whatever GTM
triggers/reports are already built on the existing event set. **Flagged for
whoever owns the GA4/GTM spec**: confirm whether `page_view` +
`view_item_list` on every filter/sort/search change is sufficient, or
whether dedicated events are actually required.)*

### Forms

**F1 (MEDIUM) — a real fetch failure showed the user the literal word "network".**
`lib/forms/submit.ts` returned `{ ok: false, error: 'network' }` on a thrown
`fetch()`, and both `ContactForm.tsx`/`WholesalePricing.tsx` display
`result.error` verbatim.
**Fix:** changed the sentinel to a human-readable message:
*"Network error. Please check your connection and try again."*
**Live-verified**: stubbed `window.fetch` to reject for `/api/contact` and
submitted — the readable message rendered, form values preserved.

**F2 (LOW) — sourcing form had no `noValidate`**, so its native
required/pattern validation bubbles (unstyled) fired before the custom
error UI, inconsistent with `ContactForm.tsx`.
**Fix:** added `noValidate` to `WholesalePricing.tsx`'s `<form>`.
Live-verified via `form.noValidate === true`.

**F3 (LOW) — sourcing form's name field was labeled "Faculty Name"**
(placeholder "Dr. Jane Smith", backend treats it as the submitter's own
name), reading as if it asked for the facility's name.
**Fix:** relabeled to "Your Name"; updated the one test asserting the old
label text.

**Also documented, not a defect**: **there is no separate "wholesale" form.**
`components/home/WholesalePricing.tsx` is actually the homepage sourcing
lead-gen form (posts to `/api/sourcing`) under a legacy component name — its
visible copy already says "Need Help Sourcing Medical Supplies?", not
"wholesale". The ticket's "contact, sourcing, and wholesale forms" is
therefore two real forms, not three. Flagging here so future QA doesn't
assume a distinct wholesale flow exists; left the component name as-is
(rename has no user-facing effect and wasn't worth the diff).

## What was already correct, re-verified

- **Canonical URLs** across category/product/industry/blog/partner/OCC/search
  — centralized in `lib/seo/metadata.ts` + `lib/seo/canonical.ts`, tracking
  params stripped, paginated category pages correctly self-canonicalize
  (not point to page 1), filtered/sorted/searched variants noindex +
  canonical to the clean parent URL.
- **The launch-blocking non-negotiable** — unsupported/empty industry pages
  are not indexable doorway pages. Traced definitively: 7 of 12 industries
  fail `isIndustryIndexable` (needs both a complete content set and a
  validated catalog tag), render 200 with real fallback content but
  `noindex,follow`, and are excluded from the sitemap via the same
  `SUPPORTED_INDUSTRIES` filter. **Live-verified**: `curl /industries/dental`
  → 200 + `<meta name="robots" content="noindex,follow">`; `curl /sitemap.xml`
  lists only the 5 supported industries.
- **Sitemap composition** (`lib/seo/sitemap.ts`) and **robots.txt**
  (`lib/seo/robots-config.ts`) — correct disallow list, sitemap reference,
  AI-crawler allowlist, staging-mode full block. Live-verified both.
- **JSON-LD XSS safety** (`lib/safe-json-ld.ts`) — escapes `</script>`-breakout
  sequences and U+2028/U+2029 on every emitter.
- **Product/ItemList/Breadcrumb/Organization schema correctness** on the
  canonical `/product/[slug]` and `/category/[slug]` routes (once D1/D4 were
  fixed) — live-verified: a real product's schema price ($75.47) matched
  the rendered price exactly; Organization NAP sourced from the same
  `SITE_CONTACT` module as the footer/`/faq` mailto link (no drift possible).
- **`page_view`, `view_item_list`, `view_item`, `add_to_cart`, quick-add**
  — all fire exactly once per logical action in a production build. (A
  `view_item_list` double-fire was observed in `next dev` — confirmed to be
  React StrictMode's dev-only double-effect-invocation, not present in
  `next start`; not a defect.)
- **Support email consistency** — `lib/site-contact.ts` is the sole source
  (footer, `/contact`, `/returns`, Organization schema, FAQ all read it),
  guarded by a pre-existing test (`lib/__tests__/support-address.test.ts`)
  that forbids the old `team@` address and any hardcoded copy outside the
  central module.
- **Form validation, success/failure states, input preservation, double-submit
  guard** (submit button disabled while pending), honeypot + time-trap
  anti-bot — all correct on both real forms. No CAPTCHA / no in-app rate
  limit is a documented, intentional design choice (Vercel WAF handles rate
  limiting; CAPTCHA deliberately rejected for an invisible time-trap
  instead) — not a gap.

## Test evidence

```
npx tsc --noEmit                          # clean
npx eslint . --max-warnings 0             # clean
npx vitest run                            # 126 files, 1232 tests passed
rm -rf .next && npm run build              # exit 0, 67/67 pages, zero API errors
```

New/extended coverage this pass:
- `lib/__tests__/purchasability.test.ts` — `getDefaultVariant` (5 tests, D1)
- `lib/analytics/__tests__/attribution.test.ts` — new file, 9 tests (A1)
- `__tests__/proxy.test.ts` — 3 trailing-slash tests (S2), 3 attribution-capture
  tests (A1); mock `NextResponse`/request stubs extended with a minimal
  cookie jar to support both
- `app/api/contact/__tests__/route.test.ts`,
  `app/api/sourcing/__tests__/route.test.ts` — 2 tests each: attribution line
  included when captured, omitted when not (A1)
- `components/category/__tests__/CategoryResults.test.tsx` — extended with a
  `getNonce` mock (D4, no new assertions needed beyond not throwing)
- `components/home/__tests__/WholesalePricing.test.tsx` — label text updated
  to match F3

### Live verification against the QA store (this pass)

Ran a **production build** (`next start`, not `next dev` — see the
StrictMode note above) against `.env.local`
(`md-supplies-qa-shipping-and-checkout.myshopify.com`) and drove it with
`curl` + browser automation:

| Check | Observed |
|---|---|
| `/faq` FAQPage schema | Present, all 9 Q&As, CSP-nonced (D2) |
| `/category/gloves` ItemList schema | CSP-nonced (D4) |
| Product schema vs. visible price | `$75.47` in both the JSON-LD `offers.price` and the rendered DOM, exact match |
| `/industries/dental` (unsupported) | 200, `noindex,follow`, absent from sitemap.xml |
| `robots.txt` | Correct disallow list + sitemap reference |
| Redirect: bulk product entry | 301 → correct live handle |
| Redirect: trailing slash | Final destination correct (2-hop: Next's own 308 + proxy's 301 — see S2 note) |
| gclid/utm cookie capture | `Set-Cookie: md_attr=...; HttpOnly; SameSite=lax` on first tracked pass-through |
| Journey: `/` → `/category/gloves` → product → add to cart → `/cart` → checkout | `page_view` ×1, `view_item_list` ×1, `view_item` ×1 (correct item/price), `add_to_cart` ×1 (correct item/qty/value), `begin_checkout` ×1 even under a synchronous double-click, checkout handoff reached Shopify's QA checkout with zero console errors |
| Contact form: validation, success-path 502 (no local Resend key), and a stubbed real network failure | Per-field validation errors; "Email delivery failed" on server error; "Network error. Please check your connection and try again." on a fetch throw (F1) — all three preserved every field's value |
| Sourcing form | `noValidate` present, "Your Name" label (F2/F3) |
| Console errors, all routes tested | None from app code (one unrelated Grammarly extension log on `/faq`, not app-caused) |

**Not verified live**: a real `$0`/quote-only-first-variant product (D1's
exact failure shape) — no QA-store fixture with that specific variant
ordering was located in the time available. The fix is unit-tested
end-to-end instead (`getDefaultVariant` is now the single function both
`ProductView` and the schema builder call, so they cannot drift regardless
of variant order — the property under test, not a specific fixture).
Real email delivery (Resend isn't configured with a live key in this local
environment, same limitation every prior DEV-LAUNCH-0X pass hit) — the
502/error-handling path is verified instead, and the attribution-line
content is verified via the route's own mocked send call.

## Acceptance criteria status

| Criterion | Status |
|---|---|
| No duplicate analytics events during client-side catalog navigation | ✅ verified in a production build across the full primary journey; the one duplicate observed (`view_item_list` ×2) was confirmed to be a `next dev`-only StrictMode artifact, not present in production |
| Canonical and indexing behavior matches route intent | ✅ re-verified; the one launch-blocking non-negotiable (unsupported industries) confirmed correctly implemented and live-tested |
| Structured data validates and reflects visible content | ✅ fixed (D1, D2, D4) and live-verified against real QA-store data |
| Forms provide accurate success/failure feedback and preserve valid input | ✅ fixed (F1) and live-verified; F2/F3 UX consistency fixes also verified |
| No production console errors on tested routes | ✅ none from app code across home, category, product, cart, contact, FAQ |

## Dependencies status

- **Blocked on DEV-LAUNCH-06**: confirmed complete and re-verified — the
  no-reload navigation model, tracking-param same-page echo, and
  counts/chips/URL consistency this ticket depended on are all in place.
- **Open item (1,285-redirect bulk load)**: confirmed out of scope for this
  pass per the decision above; stays a separate, tracked piece of work.
- **New, cross-team flags surfaced by this pass**:
  - Confirm with whoever manages the GTM container that a Conversion Linker
    (or equivalent) tag is active for Google Ads/Bing attribution — this
    repo now durably captures gclid/utm for its own lead-email use, but
    ad-platform-side conversion tracking is a GTM config concern this repo
    cannot verify (A1).
  - Confirm with whoever owns the GA4/GTM event spec whether dedicated
    `search`/`filter`/`sort` events are required, or whether the existing
    `page_view` + `view_item_list` signal is sufficient (A2).
