import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/components/store/CartProvider'
import { CartPopup } from '@/components/store/CartPopup'
import { CartToast } from '@/components/store/CartToast'
import { SkipLink } from '@/components/a11y/SkipLink'
import { Suspense } from 'react'
import { GoogleTagManager } from '@next/third-parties/google'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_LOCALIZATION } from '@/lib/shopify/queries/markets'
import { GET_MENU } from '@/lib/shopify/queries/menu'
import { buildOrganizationSchema, jsonLdSafe } from '@/lib/schema'
import { getNonce } from '@/lib/csp-nonce'
import { IS_STAGING, SITE_ORIGIN } from '@/lib/site-config'
import { fetchAllCollectionHandles, type CollectionHandle } from '@/lib/shopify/collection-handles.server'
import { buildL2Tree, type L2Node } from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import type { LocalizationData, AvailableCountry, ShopifyMenu } from '@/lib/shopify/types'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  // Base for every relative metadata URL (canonical, og:url, og:image) —
  // guarded against dev values in lib/site-config.ts (audit H4/L13).
  metadataBase: new URL(SITE_ORIGIN),
  title: 'MDSupplies',
  description: 'Medical-Grade Supplies, Delivered Fast',
}

// This layout reads headers() for the CSP nonce (lib/csp-nonce.ts), which
// opts every route into dynamic rendering — the accepted trade-off for M10
// (nonce-based CSP enforcement): Next.js can only inject a nonce into inline
// scripts at request time, so ISR/static generation and nonces are mutually
// exclusive. See docs/superpowers/plans/2026-07-12-csp-nonce-enforcement.md
// (supersedes the prior audit-H1 "no headers() here" constraint).
// The cart hydrates client-side in CartProvider; the market_country cookie
// is read client-side in the Footer currency switcher.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = await getNonce()
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

  const isStaging = IS_STAGING

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      {!isStaging && process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} nonce={nonce} />
      )}
      <body className="min-h-full flex flex-col">
        {!isStaging && (
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
        )}
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
      </body>
    </html>
  )
}
