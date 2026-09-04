import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import productRedirects from './docs/redirects-ready.json'
import { buildCsp, generateNonce } from '@/lib/csp'
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE_SECONDS, serializeAttribution } from '@/lib/analytics/attribution'
import { CATEGORY_TREE_L1, FEATURED_SUBCATEGORIES, getCategorySlug } from '@/lib/category-tree'

type Redirect301 = { from: string; to: string; status: 301 }
type Gone410    = { from: string; status: 410 }
type RedirectEntry = Redirect301 | Gone410

// ─── Product catalog 301s (bulk) ──────────────────────────────────────────────
//
// 1,285 legacy product URLs from the old store, loaded from docs/redirects-ready.json
// into a Map keyed by `from` for O(1) lookup (a linear scan over 1,285 rows on every
// request is wasteful). The data file is validated clean: 1,285 unique `from` keys,
// no self-redirects, and ZERO chains (no `to` is itself a `from`), so a single hop
// always lands on a live page.
//
// The old store served every product at `/products/<handle>` (plural); this site
// serves them at `/product/<handle>` (singular). Both `from` and `to` in the JSON
// use the plural form, so we rewrite each `to` to the singular live route here.
const PRODUCT_REDIRECTS = new Map<string, string>(
  (productRedirects as { from: string; to: string }[]).map(({ from, to }) => [
    from,
    to.replace(/^\/products\//, '/product/'),
  ]),
)

// ─── Legacy AeroWalk color-handle migration (P0.7, extended 2026-08-20) ──────
//
// Izzy migrated all three AeroWalk colors onto one color-neutral handle in
// QA; each old color-suffixed handle must 301 to it wherever it's hit — the
// canonical /product/<handle> route, AND the nested /category/<slug>/<handle>
// route this app also serves (app/category/[slug]/[product]/page.tsx). One
// reusable map + matcher instead of a hand-copied entry per route shape, so a
// future migration only adds one map row.
export const LEGACY_PRODUCT_HANDLES = new Map<string, string>([
  ['aerowalk-ultra-lite-rollator-rolling-walker-blue', 'aerowalk-ultra-lite-rollator-rolling-walker'],
  ['aerowalk-ultra-lite-rollator-rolling-walker-white', 'aerowalk-ultra-lite-rollator-rolling-walker'],
  ['aerowalk-ultra-lite-rollator-rolling-walker-grey', 'aerowalk-ultra-lite-rollator-rolling-walker'],
])

function redirectLegacyProductHandle(pathname: string, request: NextRequest, nonce: string): Response | null {
  const match = pathname.match(/^\/(?:product|category\/[^/]+)\/([^/]+)$/)
  if (!match) return null
  const canonical = LEGACY_PRODUCT_HANDLES.get(match[1])
  if (!canonical) return null
  return withCsp(NextResponse.redirect(new URL(`/product/${canonical}`, request.url), 301), nonce)
}

// ─── Legacy Shopify /collections/<handle> URLs → canonical /category/<slug> ──
//
// Shopify's own auto-generated sitemap (sitemap_collections_N.xml, distinct
// from this app's app/sitemap.ts) still lists /collections/<handle> URLs for
// every live collection; external backlinks use them too. This app only
// ever serves /category/<slug> (2026-08-21 SEO audit triage, Finding 3).
// Keyed by BOTH `tag` and `collectionHandle` for every CATEGORY_TREE_L1 row
// (e.g. /collections/apparel AND /collections/capes-gowns both resolve to
// the one Apparel page) — resolved through getCategorySlug() rather than a
// raw rename, so the tag-name hit correctly lands on /category/capes-gowns
// instead of a nonexistent /category/apparel (2026-08-12 audit Finding F3).
// Featured subcategories (Trocars & Trocar Kits today) get their own entry
// keyed by both `slug` and `collectionHandle` — they are NOT CATEGORY_TREE_L1
// members (lib/category-tree.ts's own doc comment on FEATURED_SUBCATEGORIES
// explains why), so they need a second source, not a special case bolted onto
// the L1 loop.
//
// 2026-08-24: this registry-driven map previously existed (commit 213a1b6)
// and was silently reverted to a 2-entry hand-written Set by a bad merge
// resolution (e21205c) — see docs/audits/2026-08-seo-remediation/BASELINE.md.
// The no-chain/no-loop sweep test in this file's "global no-chain guardrail"
// describe block exists specifically so that class of regression fails CI
// immediately instead of silently shipping again.
const LEGACY_COLLECTION_SLUG_BY_HANDLE = new Map<string, string>()
for (const l1 of CATEGORY_TREE_L1) {
  const slug = getCategorySlug(l1)
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(l1.tag, slug)
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(l1.collectionHandle, slug)
}
for (const sub of FEATURED_SUBCATEGORIES) {
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(sub.slug, sub.slug)
  LEGACY_COLLECTION_SLUG_BY_HANDLE.set(sub.collectionHandle, sub.slug)
}

function redirectLegacyCollectionUrl(pathname: string, request: NextRequest, nonce: string): Response | null {
  const match = pathname.match(/^\/collections\/([^/]+)(\/.*)?$/)
  if (!match) return null
  const [, handle, rest] = match

  // Shopify's real product-within-collection URL shape
  // (/collections/<any-handle>/products/<handle>) carries an explicit
  // "products" segment before the handle, under ANY collection handle
  // (registered or not) — this app has no /category/<slug>/products/<handle>
  // route, so there is no "preserve the collection" destination to send it
  // to. Resolve the product handle through the same maps the root
  // /products/<handle> rules use (PRODUCT_REDIRECTS, then
  // LEGACY_PRODUCT_HANDLES, then the bare handle) and land on the canonical
  // /product/<handle> route directly, in ONE hop — checked before the L1/
  // featured-subcategory/OCC lookups below since it doesn't depend on any of
  // them.
  const productMatch = rest?.match(/^\/products\/([^/]+)$/)
  if (productMatch) {
    const productHandle = productMatch[1]
    const consolidated = PRODUCT_REDIRECTS.get(`/products/${productHandle}`)
    const renamed = LEGACY_PRODUCT_HANDLES.get(productHandle)
    const targetPath = consolidated ?? (renamed ? `/product/${renamed}` : `/product/${productHandle}`)
    const url = new URL(targetPath, request.url)
    url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }

  // OCC is browsed like a category but has one canonical route outside
  // /category/*, the same decision the existing /category/occ rule below
  // encodes.
  if (handle === 'occ') {
    const url = new URL('/solutions/occ', request.url)
    url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }

  const slug = LEGACY_COLLECTION_SLUG_BY_HANDLE.get(handle)
  if (!slug) return null // subcategory-level collection — not resolved here, see Global Constraints

  const url = new URL(`/category/${slug}${rest ?? ''}`, request.url)
  url.search = request.nextUrl.search
  return withCsp(NextResponse.redirect(url, 301), nonce)
}

// ─── Self-titled category-duplicate collapse (final-review fix wave) ────────
//
// P1 Task 1 added a redirect() call in app/category/[slug]/[product]/page.tsx
// to collapse 7 self-titled duplicate pages (e.g. /category/hygiene/hygiene
// -> /category/hygiene — a `category:hygiene` + `subcategory:hygiene` tag
// pair on the same products, MASTER-PLAN §10). That redirect() doesn't
// produce a real HTTP 301 in this fork: the route streams (root
// app/layout.tsx wraps in <Suspense>), and redirect() degrades to a
// client-side meta-refresh in a streaming context instead of an HTTP
// redirect. The real fix belongs here, at the middleware layer, which
// already gives real 301s.
//
// Registry-driven off CATEGORY_TREE_L1 — the same `subslug === l1.tag`
// condition lib/category-tree.ts's buildL2Tree already uses to exclude a
// self-titled L2 node, and the same condition
// app/category/[slug]/[product]/page.tsx already checks (kept there too,
// as defense in depth — this proxy intercepts first in production, so that
// code becomes dead-but-harmless). Matched on the PUBLIC slug
// (getCategorySlug), not collectionHandle, so a slug/handle-divergent
// category (Face Masks: public slug face-masks, Shopify handle
// face-coverings) resolves correctly off its canonical slug rather than a
// raw handle that would never appear in a /category/<slug>/... URL.
function redirectSelfTitledCategoryDuplicate(pathname: string, request: NextRequest, nonce: string): Response | null {
  const match = pathname.match(/^\/category\/([^/]+)\/([^/]+)$/)
  if (!match) return null
  const [, slug, subslug] = match
  const l1 = CATEGORY_TREE_L1.find((c) => getCategorySlug(c) === slug)
  if (!l1 || subslug !== l1.tag) return null
  const url = new URL(`/category/${slug}`, request.url)
  url.search = request.nextUrl.search
  return withCsp(NextResponse.redirect(url, 301), nonce)
}

// ─── Category-level 410s (§4.3) ───────────────────────────────────────────────
//
// Categories permanently removed from the new taxonomy. A direct hit (or a
// stale Google index entry) to one of these on the live site must return a
// definitive 410 Gone — not render and not 404 — so the URL is deindexed and
// never recreated. Matched on the live `/category/<slug>` route and any path
// beneath it (the whole category subtree is gone). These slugs are also hidden
// from nav/listings/sitemap via lib/excluded-categories.ts.
export const GONE_CATEGORY_SLUGS = new Set([
  'pharmaceuticals',
  'beds',
  'bariatric-beds',
  'bed-parts',
  'spa',
  'pet',
])

function isGoneCategory(pathname: string): boolean {
  // Capture the first path segment after /category/ and match the whole segment
  // (so `/category/bedside-care` does NOT match the gone slug `beds`).
  const match = pathname.match(/^\/category\/([^/]+)(?:\/|$)/)
  return match !== null && GONE_CATEGORY_SLUGS.has(match[1])
}

// ─── Redirect + 410 map ──────────────────────────────────────────────────────
//
// 410s first (definitive removal), then 301s grouped by destination type.
//
export const REDIRECT_ENTRIES: RedirectEntry[] = [

  // ── 410 Gone (permanently removed — do not recreate) ──────────────────────
  // Pharmaceuticals retired: DEA/compliance exposure (41 products removed from catalog).
  { from: '/medical-supply-store/Pharmaceuticals/Medication Aids/Narcotics Storage-GRF8SCRI15.html', status: 410 },
  { from: '/medical-supply-store/Pharmaceuticals/Injectables-U1GD8BVMR5.html',                       status: 410 },
  // Thorne Research supplements: not MDSupplies inventory; links are spam-adjacent.
  { from: '/medical-supplies-Thorne Research-VeganPro Complex Vanilla-WQEMF6Q8IH.html',               status: 410 },
  { from: '/medical-supplies-Thorne Research-VeganPro Complex Chocolate-TIH9JNRQT6.html',             status: 410 },
  // 2026-09-01 Ahrefs export, new row (same Thorne Research vendor confirmed absent
  // from the live catalog via Storefront search — see docs/audits/2026-09-04-p0-seo-
  // migration-integrity/unified-targets.json).
  { from: '/medical-supplies-Thorne Research-MediClear-SGS Chocolate-UAQUGHR6DP.html',                status: 410 },

  // P0 SEO migration integrity (2026-09-04): direct historic image backlinks from
  // the 2026-09-01 Ahrefs export (/sup/images/... — old-store product photography,
  // never migrated). Each of these was checked against the live Storefront API
  // (title/vendor search — see scripts/seo-migration/match-images.mts and
  // docs/audits/2026-09-04-p0-seo-migration-integrity/image-search-results.json)
  // with NO confident current-catalog match, so there is no live image asset to
  // serve or redirect to. A blanket redirect to an HTML page is explicitly wrong
  // here (a third-party <img src> would render broken regardless), so these get a
  // definitive 410 instead of silently 404ing. See EXCEPTIONS.md in that same
  // audit folder for the image targets that got a plausible-but-unverified
  // candidate match instead of a 410 — those are left for Izzy's review rather
  // than guessed at here.
  { from: '/sup/images/free-shipping-yellow.png',                    status: 410 }, // UI badge now rendered as a component, not a static image
  { from: '/sup/images/productImages/7CXML2268H.gif',                status: 410 }, // Dynarex tattoo needle 1203RL — not in catalog
  { from: '/sup/images/productImages/7HQXDFWJ49.gif',                status: 410 }, // Dynarex tattoo needle 1201RL — not in catalog
  { from: '/sup/images/productImages/FKJEB33I41.gif',                status: 410 }, // Dynarex tattoo needle 1207RL — not in catalog
  { from: '/sup/images/productImages/K8J9ZVU2GY.gif',                status: 410 }, // Dynarex tattoo needle 1201RL round liner — not in catalog
  { from: '/sup/images/productImages/VLPUK8KBSY.gif',                status: 410 }, // Dynarex tattoo needle 1209RL round liner — not in catalog
  { from: '/sup/images/productImages/WEVSAQ14IE.gif',                status: 410 }, // Vision Labs requisition form — a service document, not a stocked product
  { from: '/sup/images/productImages/WRW2B797FM.gif',                status: 410 }, // Hospira Lactated Ringers IV bag — injectable pharmaceutical, same DEA/compliance retirement as Pharmaceuticals above
  { from: '/sup/images/productImages/ZTLE7VFV3C.gif',                status: 410 }, // Rx Destroyer drug disposal system — not in catalog

  // ── 301 Recoverable redirects ─────────────────────────────────────────────

  // Direct legacy image backlink, Case 2 (same product category exists, image
  // changed): the generic-anchor legacy filename carries no SKU to pick an
  // exact vendor variant, but "Alcohol Prep Pad" is an unambiguous, low-risk
  // commodity match confirmed live via Storefront search (Dukal, handle
  // alcohol-prep-pad — see scripts/seo-migration/get-product-image.mts
  // output in docs/audits/2026-09-04-p0-seo-migration-integrity/). Redirects
  // straight to the CDN image asset (not the HTML product page) so a
  // third-party <img src> still renders instead of breaking.
  { from: '/sup/images/productImages/3Y3PKD2E6Q.gif',                                                to: 'https://cdn.shopify.com/s/files/1/0821/0989/0793/files/857-4000.jpg?v=1786100370', status: 301 },

  // Note: /category/face-coverings → /category/face-masks is handled as a subtree
  // redirect in the proxy() function below (covers both root and nested paths).

  // Category / hub pages
  { from: '/Medical-Supply-Store.html',                                                                 to: '/categories',                                     status: 301 },
  { from: '/all-categories.html',                                                                       to: '/categories',                                     status: 301 },
  { from: '/medical-supply-store/Gloves-G78R26U43E.html',                                              to: '/category/gloves',                                status: 301 },
  { from: '/face-masks-n95-kn95.html',                                                                  to: '/category/face-masks',                            status: 301 },
  { from: '/medical-supply-store/Face-Masks-CYR82C7EBL.html',                                          to: '/category/face-masks',                            status: 301 },
  { from: '/medical-supply-store/Hygiene-WQ2ENW7KU6.html',                                             to: '/category/hygiene',                               status: 301 },
  { from: '/bariatricproducts',                                                                        to: '/category/bariatric',                              status: 301 },
  { from: '/collections/all',                                                                          to: '/categories',                                     status: 301 },
  { from: '/a/sitemap-tools/sitemap',                                                                  to: '/sitemap.xml',                                    status: 301 },

  // Partners / vendors
  { from: '/supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html',                                         to: '/partners/drive-medical',                         status: 301 },
  { from: '/Durable-Equipment-Medical.html',                                                            to: '/partners/drive-medical',                         status: 301 },
  { from: '/supplies-by-vendor/Dynarex-MM7QQM8CLP.html',                                               to: '/partners/dynarex',                               status: 301 },
  // Dynarex Specimen Containers 4oz: no active product handle in catalog or redirects-ready.json.
  // Nearest brand-level match. Update to /product/<handle> if product added to Shopify catalog.
  { from: '/medical-supplies-Dynarex-Specimen-Containers-4oz-22I48F9UI7.html',                         to: '/partners/dynarex',                               status: 301 },

  // Industries
  // Private Practice was consolidated into Clinics & Doctor's Offices
  // (2026-08-seo-remediation MASTER-PLAN DESIGN-05 + Bilal's 2026-08-28
  // direction): industry:clinic already covers the same commercial/search
  // intent at scale, so both legacy destinations point directly at the one
  // indexable Clinics page rather than chaining through the old thin route.
  { from: '/Medical-Supplies-for-Doctors.html',                                                        to: '/industries/clinics-doctors-offices',             status: 301 },
  { from: '/industries/private-practice',                                                               to: '/industries/clinics-doctors-offices',             status: 301 },

  // Needles & Syringes
  { from: '/medical-supplies-Exel-Insulin-Syringe-05cc-29g-x-12-8DKB9DMTEX.html',                     to: '/category/needles-syringes',                      status: 301 },
  // "Needles  Syringes" — double space from legacy ++ URL encoding
  { from: '/medical-supply-store/Needles  Syringes/Syringes/10cc Syringes w Needle-DMGAATSB9S.html',  to: '/category/needles-syringes',                      status: 301 },

  // Respiratory — spirometry mouthpieces, not drug-panel testing
  { from: '/medical-supplies-ndd Medical Technologies Inc.-EASYONE SPIRETTES-I78AVCLDSL.html',         to: '/category/respiratory',                           status: 301 },

  // Emergency Supplies — no /category/immobilizers handle; emergency-supplies is correct parent
  { from: '/medical-supply-store/Emergency Supplies/Immobilizers/Leg Immobilizers-IQ9MV1MBEB.html',   to: '/category/emergency-supplies',                    status: 301 },

  // Wound Care — double spaces from legacy ++ URL encoding in "Wound  Skin Care" and
  // "Emergency  Trauma Dressings"
  { from: '/medical-supply-store/Wound  Skin Care/Wound Care Dressings/Emergency  Trauma Dressings-1MRS82K82J.html', to: '/category/wound-care',             status: 301 },
  { from: '/medical-supplies-Feather-Sterile Surgical Blades 11-2ULXL3BIJK.html',                     to: '/category/wound-care',                            status: 301 },
  { from: '/medical-supply-store/Wound  Skin Care/Elastic Bandages/Triangular Bandages-ATPW8HKJSB.html', to: '/category/wound-care',                         status: 301 },

  // Drape Sheet White 40x60 2-Ply (Task 10, 2026-08-19): the ACTION item this
  // entry previously carried — verify /product/drape-sheets-40-x-60-2-ply-blue-100-cs
  // returns 200 before deploy — was checked against the live Storefront API and
  // FAILED: that handle does not exist. A title/vendor search confirms the
  // whole Drape Sheet line (and Graham Medical as a vendor) is gone from the
  // catalog, not just recolored, so no product-level destination exists to
  // redirect to. Falls back to /category/exam-room (live, verified via
  // GET_COLLECTION_META), the same no-live-handle pattern used elsewhere in
  // this file (Feather Surgical Blades / Emergency Trauma Dressings /
  // Triangular Bandages → /category/wound-care).
  { from: '/medical-supplies-Graham Medical-Drape Sheet White 40 x 60 2-Ply-XVUAKHW2KF.html',         to: '/category/exam-room',                             status: 301 },

  // Testing & Screening — verified handle is testing-screening, not "testing"
  { from: '/medical-supply-store/Testing-and-Screening/Diagnostic-Tests/Lipid-Glucose-Testing-Z2IP7J6EF7.html', to: '/category/testing-screening',            status: 301 },

  // Blog articles — TEMPORARY category fallbacks until rebuilt posts are live in Shopify.
  // UPDATE post-launch: swap destinations to /blog/types-of-sutures and /blog/types-of-needles
  // once those articles are published and confirmed returning 200.
  { from: '/articles/types-of-sutures.html',                                                           to: '/category/surgical-sutures',                      status: 301 }, // TEMP
  { from: '/articles/types-of-needles.html',                                                           to: '/category/needles-syringes',                      status: 301 }, // TEMP

  // Account-scope cleanup (DEV-11): /b2b was a duplicate account dashboard.
  // It is retired in favor of a single wholesale entry point at /contact.
  { from: '/b2b',                                                                                       to: '/contact',                                        status: 301 },

  // Note: legacy AeroWalk color-handle redirects (P0.7, extended 2026-08-20)
  // are handled by redirectLegacyProductHandle() below — a reusable
  // map+matcher covering both /product/ and /category/<slug>/, not a flat
  // entry here.
]

// Stamps the enforcing + parallel Report-Only CSP headers (M10) onto every
// response this proxy returns — redirects and 410s included, not just
// pass-through. Report-Only mirrors the enforcing policy: it's not a
// staging step here (we're already enforcing), it's an ongoing regression
// canary that keeps reporting violations independently of what enforcing
// already blocked.
// First-touch capture of gclid/utm_* into a durable cookie (DEV-LAUNCH-12,
// see lib/analytics/attribution.ts for why this exists). Only applied on the
// pass-through path — ad traffic lands on live canonical URLs, not legacy
// redirect/410 paths, so scoping it there covers the real case without
// touching every response branch. Never overwrites an existing capture.
function captureAttribution(request: NextRequest, response: NextResponse): void {
  if (request.cookies.has(ATTRIBUTION_COOKIE)) return
  const value = serializeAttribution(request.nextUrl.searchParams)
  if (!value) return
  response.cookies.set(ATTRIBUTION_COOKIE, value, {
    maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  })
}

// ─── Legacy-path encoding normalization (P0 SEO migration integrity) ────────
//
// Old Magento/WooCommerce-style URLs encode a literal space as EITHER a raw
// "+" or "%20" — and, per the 2026-09-01 Ahrefs export, sometimes BOTH in the
// same URL (e.g. "…-Graham%20Medical-Drape+Sheet+White…"). The previous
// implementation only swapped "+" for a space and never percent-decoded at
// all, so any "%20" segment silently fell through to a 404 instead of
// matching the REDIRECT_ENTRIES `from` strings below (which are written with
// literal spaces). See docs/audits/2026-09-04-p0-seo-migration-integrity/.
//
// Order matters: "+" is swapped for a space FIRST, before any percent-
// decoding, so a genuinely-encoded plus sign ("%2B") survives untouched by
// that swap and is decoded to a real "+" character afterward — not
// corrupted into a space. safeDecodeURIComponent never throws on malformed
// input (a bare "%", a truncated "%2", or an invalid "%zz" sequence): it
// decodes every well-formed %XX token it finds and leaves the rest exactly
// as received, rather than 500ing the request.
//
// Deliberately NOT lower-cased: the 1,285-entry bulk table
// (docs/redirects-ready.json) and the hand-written entries below preserve
// the legacy CMS's exact mixed-case path segments, and normalizing case here
// risks silently merging two originally-distinct paths that differed only by
// case.
function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    return input.replace(/%[0-9A-Fa-f]{2}/g, (seq) => {
      try {
        return decodeURIComponent(seq)
      } catch {
        return seq
      }
    })
  }
}

function normalizeLegacyPathname(raw: string): string {
  const spaceNormalized = raw.replace(/\+/g, ' ')
  const decoded = safeDecodeURIComponent(spaceNormalized)
  // Strip a single trailing slash (but not the root "/") so a legacy link hit
  // with an extra trailing slash still matches the exact `from` strings below
  // instead of falling through to a 404 (DEV-LAUNCH-12).
  return decoded.replace(/^(.+)\/$/, '$1')
}

function withCsp(response: Response, nonce: string): Response {
  const isDev = process.env.NODE_ENV === 'development'
  const csp = buildCsp(nonce, isDev)
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('Content-Security-Policy-Report-Only', csp)
  return response
}

export function proxy(request: NextRequest): Response {
  // Generated once per request, before any branch below — every response
  // path (redirect/410/rewrite/pass-through) must carry the same nonce a
  // downstream Server Component would read via lib/csp-nonce.ts.
  const nonce = generateNonce()

  const raw = request.nextUrl.pathname
  const pathname = normalizeLegacyPathname(raw)

  // Definitive removal first: permanently-gone categories (§4.3).
  if (isGoneCategory(pathname)) return withCsp(new Response(null, { status: 410 }), nonce)

  const legacyHandleRedirect = redirectLegacyProductHandle(pathname, request, nonce)
  if (legacyHandleRedirect) return legacyHandleRedirect

  // Self-titled category-duplicate collapse — checked before the
  // face-coverings subtree rewrite below so a URL already in its canonical
  // public-slug form (e.g. /category/face-masks/face-masks) resolves in one
  // hop rather than depending on rewrite order. (A raw-handle-prefixed
  // variant, e.g. /category/face-coverings/face-masks, is NOT a case this
  // ordering fixes either way — see the function's doc comment and
  // __tests__/proxy.test.ts's "ordering investigation" test — but it is not
  // a reachable URL under the current registry, since face-masks has no
  // live self-titled subcategory pair.)
  const selfTitledRedirect = redirectSelfTitledCategoryDuplicate(pathname, request, nonce)
  if (selfTitledRedirect) return selfTitledRedirect

  // Face Masks canonical alias: Shopify collection handle is face-coverings; canonical
  // public URL is /category/face-masks. Subtree redirect so both the category root and
  // nested product paths (e.g. /category/face-coverings/n95-mask) arrive in one hop.
  if (pathname === '/category/face-coverings' || pathname.startsWith('/category/face-coverings/')) {
    const newPath = pathname.replace('/category/face-coverings', '/category/face-masks')
    return NextResponse.redirect(new URL(newPath, request.url), 301)
  }

  for (const entry of REDIRECT_ENTRIES) {
    if (pathname !== entry.from) continue
    if (entry.status === 410) return withCsp(new Response(null, { status: 410 }), nonce)
    const url = new URL(entry.to, request.url)
    // Only overwrite the destination's query string when the INCOMING request
    // actually carries one (preserves e.g. ?formularyId=... onto a category
    // page). Some `to` values are absolute external asset URLs with their own
    // required query (a Shopify CDN image's `?v=` cache-busting param) — an
    // unconditional overwrite would silently strip that off a query-less
    // legacy image request.
    if (request.nextUrl.search) url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }

  // Bulk product catalog 301s (consolidated/discontinued handles) — exact match.
  // Checked before the blanket rule below so a remapped handle wins over the
  // naive plural→singular rewrite.
  const productTarget = PRODUCT_REDIRECTS.get(pathname)
  if (productTarget) {
    return withCsp(NextResponse.redirect(new URL(productTarget, request.url), 301), nonce)
  }

  // Blanket plural→singular fallback: any other legacy `/products/<handle>` URL
  // maps to the live `/product/<handle>` route. Catches products that survived
  // with an unchanged handle (and so are not enumerated in redirects-ready.json).
  if (pathname.startsWith('/products/')) {
    const newPath = pathname.replace(/^\/products\//, '/product/')
    return withCsp(NextResponse.redirect(new URL(newPath, request.url), 301), nonce)
  }

  // Brands → Partners wildcard (T1 consolidation)
  if (pathname === '/brands' || pathname.startsWith('/brands/')) {
    const newPath = pathname.replace(/^\/brands/, '/partners')
    return withCsp(NextResponse.redirect(new URL(newPath, request.url), 301), nonce)
  }

  // ── /category/occ → /solutions/occ (single OCC route) ──────────────────────
  //
  // `occ` is a real Shopify collection handle, so /category/occ rendered a
  // second, competing OCC page. OCC is browsed like a category but lives at
  // one canonical URL; the duplicate 301s here rather than splitting link
  // equity and confusing shoppers.
  if (pathname === '/category/occ' || pathname === '/category/occ/') {
    const url = new URL('/solutions/occ', request.url)
    url.search = request.nextUrl.search
    return withCsp(NextResponse.redirect(url, 301), nonce)
  }

  // ── /collections/<handle> → /category/<handle> ────────────────────────────
  //
  // Legacy Shopify storefront collection URLs that customers have saved or
  // linked externally. Coverage is driven entirely by lib/category-tree.ts
  // — a new CATEGORY_TREE_L1 or FEATURED_SUBCATEGORIES entry requires no
  // changes here.
  const collectionRedirect = redirectLegacyCollectionUrl(pathname, request, nonce)
  if (collectionRedirect) return collectionRedirect

  // ── Category query variants: no rewrite (twin route removed) ───────────────
  //
  // Historically /category/[slug] was statically generated and could not read
  // searchParams, so query variants were rewritten onto a dynamic twin at
  // /category-browse/[slug]. Since the CSP nonce (M10) forces every route to
  // render per-request, that twin bought nothing — and it cost real UX: the
  // clean view and the filtered view were DIFFERENT route segments, so every
  // filter/sort/search/page interaction crossed a route boundary and remounted
  // the page instead of updating in place. That is the "full page reload" feel
  // reported on category pages.
  //
  // /category/[slug] now reads searchParams directly and is the only category
  // route, so these interactions are ordinary in-segment client navigations.

  // Pass-through: forward the nonce as a request header so downstream Server
  // Components can read it via headers() (lib/csp-nonce.ts), and set it on
  // the response so the browser enforces against the matching nonce'd
  // inline scripts Next.js renders for this request.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Next.js reads the CSP from the REQUEST header to discover the nonce it
  // must stamp on the script tags IT emits (bootstrap + chunk loaders). Next's
  // own CSP guide sets both request and response headers; we only set the
  // response, and the result was that a single chunk script rendered WITHOUT a
  // nonce on /blog/[handle]. Under 'strict-dynamic' the 'self' source is
  // ignored, so that one nonce-less same-origin script was blocked outright —
  // the long-standing console error on that route.
  //
  // Setting it here does not widen the policy by one character: it is the
  // identical string already sent on the response. It only tells Next which
  // nonce is in force.
  requestHeaders.set('Content-Security-Policy', buildCsp(nonce, process.env.NODE_ENV === 'development'))

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  captureAttribution(request, response)
  return withCsp(response, nonce)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt).*)',
  ],
}
