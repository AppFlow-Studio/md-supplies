import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import productRedirects from './docs/redirects-ready.json'
import { buildCsp, generateNonce } from '@/lib/csp'

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

// ─── Category-level 410s (§4.3) ───────────────────────────────────────────────
//
// Categories permanently removed from the new taxonomy. A direct hit (or a
// stale Google index entry) to one of these on the live site must return a
// definitive 410 Gone — not render and not 404 — so the URL is deindexed and
// never recreated. Matched on the live `/category/<slug>` route and any path
// beneath it (the whole category subtree is gone). These slugs are also hidden
// from nav/listings/sitemap via lib/excluded-categories.ts.
const GONE_CATEGORY_SLUGS = new Set([
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
const REDIRECT_ENTRIES: RedirectEntry[] = [

  // ── 410 Gone (permanently removed — do not recreate) ──────────────────────
  // Pharmaceuticals retired: DEA/compliance exposure (41 products removed from catalog).
  { from: '/medical-supply-store/Pharmaceuticals/Medication Aids/Narcotics Storage-GRF8SCRI15.html', status: 410 },
  { from: '/medical-supply-store/Pharmaceuticals/Injectables-U1GD8BVMR5.html',                       status: 410 },
  // Thorne Research supplements: not MDSupplies inventory; links are spam-adjacent.
  { from: '/medical-supplies-Thorne Research-VeganPro Complex Vanilla-WQEMF6Q8IH.html',               status: 410 },
  { from: '/medical-supplies-Thorne Research-VeganPro Complex Chocolate-TIH9JNRQT6.html',             status: 410 },

  // ── 301 Recoverable redirects ─────────────────────────────────────────────

  // Note: /category/face-coverings → /category/face-masks is handled as a subtree
  // redirect in the proxy() function below (covers both root and nested paths).

  // Category / hub pages
  { from: '/Medical-Supply-Store.html',                                                                 to: '/categories',                                     status: 301 },
  { from: '/all-categories.html',                                                                       to: '/categories',                                     status: 301 },
  { from: '/medical-supply-store/Gloves-G78R26U43E.html',                                              to: '/category/gloves',                                status: 301 },
  { from: '/face-masks-n95-kn95.html',                                                                  to: '/category/face-masks',                            status: 301 },
  { from: '/medical-supply-store/Face-Masks-CYR82C7EBL.html',                                          to: '/category/face-masks',                            status: 301 },
  { from: '/medical-supply-store/Hygiene-WQ2ENW7KU6.html',                                             to: '/category/hygiene',                               status: 301 },

  // Partners / vendors
  { from: '/supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html',                                         to: '/partners/drive-medical',                         status: 301 },
  { from: '/Durable-Equipment-Medical.html',                                                            to: '/partners/drive-medical',                         status: 301 },
  { from: '/supplies-by-vendor/Dynarex-MM7QQM8CLP.html',                                               to: '/partners/dynarex',                               status: 301 },
  // Dynarex Specimen Containers 4oz: no active product handle in catalog or redirects-ready.json.
  // Nearest brand-level match. Update to /product/<handle> if product added to Shopify catalog.
  { from: '/medical-supplies-Dynarex-Specimen-Containers-4oz-22I48F9UI7.html',                         to: '/partners/dynarex',                               status: 301 },

  // Industries
  { from: '/Medical-Supplies-for-Doctors.html',                                                        to: '/industries/private-practice',                    status: 301 },

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

  // Consolidated product redirect — white 40×60 2-ply variant maps to blue master
  // (verified in docs/redirects-ready.json lines 4855–4856). Single hop; no chain.
  // ACTION: verify /product/drape-sheets-40-x-60-2-ply-blue-100-cs returns 200 before deploy.
  { from: '/medical-supplies-Graham Medical-Drape Sheet White 40 x 60 2-Ply-XVUAKHW2KF.html',         to: '/product/drape-sheets-40-x-60-2-ply-blue-100-cs', status: 301 },

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
]

// Stamps the enforcing + parallel Report-Only CSP headers (M10) onto every
// response this proxy returns — redirects and 410s included, not just
// pass-through. Report-Only mirrors the enforcing policy: it's not a
// staging step here (we're already enforcing), it's an ongoing regression
// canary that keeps reporting violations independently of what enforcing
// already blocked.
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
  // Normalize encoded paths (+, %20) to match old Magento/WooCommerce-style URLs
  const pathname = raw.replace(/\+/g, ' ')

  // Definitive removal first: permanently-gone categories (§4.3).
  if (isGoneCategory(pathname)) return withCsp(new Response(null, { status: 410 }), nonce)

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
    return withCsp(NextResponse.redirect(new URL(entry.to, request.url), 301), nonce)
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
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt).*)',
  ],
}
