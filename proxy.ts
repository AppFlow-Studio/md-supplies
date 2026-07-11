import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import productRedirects from './docs/redirects-ready.json'

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
// 410s first (definitive removal), then 301s.
// Rows pending handoff (old URLs unknown) are listed as TODO comments.
//
const REDIRECT_ENTRIES: RedirectEntry[] = [

  // ── 410 Gone (permanently removed — do not recreate) ──────────────────────
  // TODO row 2  (Narcotics Storage):         { from: '<old-path>', status: 410 }
  // TODO row 17 (Thorne VeganPro Vanilla):   { from: '<old-path>', status: 410 }
  // TODO row 18 (Thorne VeganPro Chocolate): { from: '<old-path>', status: 410 }
  // TODO row 21 (Injectables):               { from: '<old-path>', status: 410 }

  // ── 301 Recoverable redirects ─────────────────────────────────────────────
  // Category / hub pages
  { from: '/Medical-Supply-Store.html',                         to: '/categories',              status: 301 },
  { from: '/all-categories.html',                               to: '/categories',              status: 301 },
  { from: '/medical-supply-store/Gloves-G78R26U43E.html',      to: '/category/gloves',         status: 301 },
  { from: '/face-masks-n95-kn95.html',                         to: '/category/face-masks',     status: 301 },
  { from: '/medical-supply-store/Face-Masks-CYR82C7EBL.html', to: '/category/face-masks',     status: 301 },
  { from: '/medical-supply-store/Hygiene-WQ2ENW7KU6.html',    to: '/category/hygiene',        status: 301 },

  // Partners / vendors
  { from: '/supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html', to: '/partners/drive-medical', status: 301 },
  { from: '/Durable-Equipment-Medical.html',                   to: '/partners/drive-medical',  status: 301 },
  { from: '/supplies-by-vendor/Dynarex-MM7QQM8CLP.html',      to: '/partners/dynarex',        status: 301 },

  // Industries
  { from: '/Medical-Supplies-for-Doctors.html',                to: '/industries/private-practice', status: 301 },

  // Blog articles (blog routes are live — direct redirect)
  { from: '/articles/types-of-sutures.html',                   to: '/blog/types-of-sutures',  status: 301 },
  { from: '/articles/types-of-needles.html',                   to: '/blog/types-of-needles',  status: 301 },

  // Account-scope cleanup (DEV-11): /b2b was a duplicate account dashboard.
  // It is retired in favor of a single wholesale entry point at /contact.
  { from: '/b2b',                                              to: '/contact',                 status: 301 },

  // TODO row 3  (Dynarex specimen container): { from: '<old-path>', to: '/category/needles-syringes', status: 301 }
  // TODO row 5  (Exel insulin syringe):        { from: '<old-path>', to: '/category/needles-syringes', status: 301 }
  // TODO row 9  (10cc syringe):                { from: '<old-path>', to: '/category/needles-syringes', status: 301 }
  // TODO row 11 (NDD EasyOne Spirettes):       { from: '<old-path>', to: '/category/respiratory',      status: 301 }
  // TODO row 12 (leg immobilizer):             { from: '<old-path>', to: '/category/immobilizers',     status: 301 }
  // TODO row 14 (trauma dressing):             { from: '<old-path>', to: '/category/wound-care',       status: 301 }
  // TODO row 16 (Feather blades):              { from: '<old-path>', to: '/category/surgery-procedure', status: 301 }
  // TODO row 19 (Graham drape sheet):          { from: '<old-path>', to: '/category/surgery-procedure', status: 301 }
  // TODO row 20 (triangular bandage):          { from: '<old-path>', to: '/category/wound-care',        status: 301 }
  // TODO row 24 (glucose testing):             { from: '<old-path>', to: '/category/testing',           status: 301 }
]

export function proxy(request: NextRequest): Response | undefined {
  const raw = request.nextUrl.pathname
  // Normalize encoded paths (+, %20) to match old Magento/WooCommerce-style URLs
  const pathname = raw.replace(/\+/g, ' ')

  // Definitive removal first: permanently-gone categories (§4.3).
  if (isGoneCategory(pathname)) return new Response(null, { status: 410 })

  for (const entry of REDIRECT_ENTRIES) {
    if (pathname !== entry.from) continue
    if (entry.status === 410) return new Response(null, { status: 410 })
    return NextResponse.redirect(new URL(entry.to, request.url), 301)
  }

  // Bulk product catalog 301s (consolidated/discontinued handles) — exact match.
  // Checked before the blanket rule below so a remapped handle wins over the
  // naive plural→singular rewrite.
  const productTarget = PRODUCT_REDIRECTS.get(pathname)
  if (productTarget) {
    return NextResponse.redirect(new URL(productTarget, request.url), 301)
  }

  // Blanket plural→singular fallback: any other legacy `/products/<handle>` URL
  // maps to the live `/product/<handle>` route. Catches products that survived
  // with an unchanged handle (and so are not enumerated in redirects-ready.json).
  if (pathname.startsWith('/products/')) {
    const newPath = pathname.replace(/^\/products\//, '/product/')
    return NextResponse.redirect(new URL(newPath, request.url), 301)
  }

  // Brands → Partners wildcard (T1 consolidation)
  if (pathname === '/brands' || pathname.startsWith('/brands/')) {
    const newPath = pathname.replace(/^\/brands/, '/partners')
    return NextResponse.redirect(new URL(newPath, request.url), 301)
  }

  // ── Category query variants → dynamic twin route (audit H1) ────────────────
  //
  // /category/[slug] is statically generated (ISR) and therefore cannot read
  // searchParams at request time. Requests whose query actually changes the
  // rendered results (?sort/filter/page — tracking params like utm_* don't)
  // are rewritten to /category-browse/[slug], a dynamic route rendering the
  // same view. Rewrite (not redirect): the canonical URL stays in the bar.
  const categoryMatch = pathname.match(/^\/category\/([^/]+)$/)
  if (categoryMatch) {
    const query = request.nextUrl.searchParams
    if (query.has('sort') || query.has('filter') || query.has('page')) {
      const url = request.nextUrl.clone()
      url.pathname = `/category-browse/${categoryMatch[1]}`
      return NextResponse.rewrite(url)
    }
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt).*)',
  ],
}
