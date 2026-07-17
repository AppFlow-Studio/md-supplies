import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/components/store/CartProvider'
import { CartPopup } from '@/components/store/CartPopup'
import { SkipLink } from '@/components/a11y/SkipLink'
import { Suspense } from 'react'
import { GoogleTagManager } from '@next/third-parties/google'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_LOCALIZATION } from '@/lib/shopify/queries/markets'
import { GET_COLLECTIONS_SLIM } from '@/lib/shopify/queries/collections'
import { GET_MENU } from '@/lib/shopify/queries/menu'
import { buildOrganizationSchema, jsonLdSafe } from '@/lib/schema'
import { getNonce } from '@/lib/csp-nonce'
import { IS_STAGING, SITE_ORIGIN } from '@/lib/site-config'
import type { LocalizationData, AvailableCountry, SlimCollection, ShopifyMenu } from '@/lib/shopify/types'

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
  const [localization, collectionsData, menuData] = await Promise.all([
    storefrontFetch<{ localization: LocalizationData }>(
      GET_LOCALIZATION,
      undefined,
      { next: { revalidate: 86400, tags: ['shopify', 'localization'] } },
    ).catch(() => null),
    storefrontFetch<{ collections: { nodes: SlimCollection[] } }>(
      GET_COLLECTIONS_SLIM,
      { first: 249 },
      { next: { revalidate: 3600, tags: ['shopify', 'collections'] } },
    ).catch(() => ({ collections: { nodes: [] as SlimCollection[] } })),
    storefrontFetch<{ menu: ShopifyMenu }>(
      GET_MENU,
      { handle: 'main-menu' },
      { next: { revalidate: 3600, tags: ['shopify', 'menu'] } },
    ).catch(() => ({ menu: { id: '', title: '', items: [] } as ShopifyMenu })),
  ])
  const availableCountries: AvailableCountry[] = localization?.localization.availableCountries ?? []
  const collections: SlimCollection[] = collectionsData.collections.nodes
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
          <Header menuItems={menuItems} collections={collections} />
          {children}
          <Footer
            collections={collections}
            availableCountries={availableCountries}
          />
          <CartPopup />
        </CartProvider>
      </body>
    </html>
  )
}
