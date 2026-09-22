import { headers } from 'next/headers'
import { GoogleTagManager } from '@next/third-parties/google'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/components/store/CartProvider'
import { FavoritesProvider } from '@/lib/favorites/FavoritesContext'
import { CartPopup } from '@/components/store/CartPopup'
import { CartToast } from '@/components/store/CartToast'
import { SkipLink } from '@/components/a11y/SkipLink'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
import { AnalyticsDebugPanel } from '@/components/analytics/AnalyticsDebugPanel'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_LOCALIZATION } from '@/lib/shopify/queries/markets'
import { GET_MENU } from '@/lib/shopify/queries/menu'
import { buildOrganizationSchema, jsonLdSafe } from '@/lib/schema'
import { IS_STAGING } from '@/lib/site-config'
import { fetchAllCollectionHandles, type CollectionHandle } from '@/lib/shopify/collection-handles.server'
import { buildL2Tree, type L2Node } from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import type { LocalizationData, AvailableCountry, ShopifyMenu } from '@/lib/shopify/types'

// Shared Header/Footer/cart/favorites/analytics wiring, rendered inside
// <body> by BOTH root layouts: app/(site)/layout.tsx (the CDN-cacheable
// public shell) and app/(protected)/layout.tsx (the strict-nonce-CSP shell
// for /account + /search — see that file's doc comment for why they need a
// separate root). One implementation so the two groups can never drift on
// nav data, provider order, or the Organization JSON-LD.
export async function SiteChrome({
  children,
  strict = false,
}: {
  children: React.ReactNode
  /** True only when rendered by app/(protected)/layout.tsx (the strict
      per-request-nonce CSP group — /account, /search). Gates two things:
      - GoogleTagManager renders here, inside <body> and inside that group's
        forced-dynamic Suspense boundary, instead of as a <body> sibling, so
        its <script> carries the per-request CSP nonce.
      - The nonce itself is only READ (via headers()) when true. headers()
        is a dynamic API — calling it unconditionally broke static
        generation for app/(site)/layout.tsx's public routes ("Uncached data
        was accessed outside of <Suspense>", e.g. /industries/[industry-slug])
        since SiteChrome renders directly in that group's static shell, not
        behind a Suspense boundary. app/(site)/layout.tsx passes strict={false}
        (the default) and never touches this dynamic API. */
  strict?: boolean
}) {
  // Next auto-stamps the request's CSP nonce onto scripts IT generates
  // (framework chunks, `next/script`), but not onto a raw hand-authored
  // <script> like the JSON-LD tag below — that one needs the nonce read and
  // applied explicitly (same pattern as Next's own CSP guide's GoogleTagManager
  // example).
  const nonce = strict ? ((await headers()).get('x-nonce') ?? undefined) : undefined

  const [localization, collectionsData, menuData, l2Nodes] = await Promise.all([
    storefrontFetch<{ localization: LocalizationData }>(
      GET_LOCALIZATION,
      undefined,
      { next: { revalidate: 86400, tags: ['shopify', 'localization'] } },
    ).catch(() => null),
    // DEV-NAV-01: the COMPLETE live handle set (paginated). Header/Footer use
    // it only to reconcile nav links, and a truncated list silently degraded
    // real categories (e.g. Needles/Syringes) to /categories.
    fetchAllCollectionHandles().catch(() => [] as CollectionHandle[]),
    storefrontFetch<{ menu: ShopifyMenu }>(
      GET_MENU,
      { handle: 'main-menu' },
      { next: { revalidate: 3600, tags: ['shopify', 'menu'] } },
    ).catch(() => ({ menu: { id: '', title: '', items: [] } as ShopifyMenu })),
    // Nav-dropdown subcategory preview (nav remediation, item 1/2). Reuses the
    // SAME 1-hour-cached scan CategoryPageView already runs — Next's data cache
    // dedupes concurrent identical requests, so this is normally a cache hit,
    // not a second full scan. Fails soft to an empty tree so a cold-cache
    // Storefront hiccup degrades the header to today's flat-tile dropdown
    // instead of breaking navigation sitewide.
    fetchProductTagSummaries().then(buildL2Tree).catch(() => [] as L2Node[]),
  ])
  const availableCountries: AvailableCountry[] = localization?.localization.availableCountries ?? []
  const collections: CollectionHandle[] = collectionsData
  const menuItems = menuData.menu?.items ?? []

  return (
    <>
      {strict && !IS_STAGING && process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
      {/* No <Suspense> wrapper: the boundary existed only to satisfy
          useSearchParams()'s requirement, and on a PPR-postponed route
          (/product/[slug]) it never resolved — costing the PDP its page_view
          entirely. PageViewTracker now reads window.location instead and needs
          no boundary. See that component's doc comment. */}
      {!IS_STAGING && <PageViewTracker />}
      {/* Dev-only, and additionally gated on ?debug_analytics=1. Compiles to
          nothing in a production build — see the component. */}
      <AnalyticsDebugPanel />
      <SkipLink />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildOrganizationSchema()) }}
      />
      {/* Reduced-motion is honored in CSS (globals.css .fade-in) — the old
          framer <MotionConfig reducedMotion="user"> pulled the whole motion
          runtime into the shared bundle (audit M24). */}
      <FavoritesProvider>
        <CartProvider>
          <Header menuItems={menuItems} collections={collections} l2Nodes={l2Nodes} />
          {children}
          <Footer
            collections={collections}
            availableCountries={availableCountries}
          />
          <CartPopup />
          {/* Global: surfaces a refused cart change (DEF-08/QA-092) no matter
              which surface triggered it — popup, quick-add, or the /cart
              page — instead of only the /cart page hearing about it. */}
          <CartToast />
        </CartProvider>
      </FavoritesProvider>
    </>
  )
}
