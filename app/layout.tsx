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
import { IS_STAGING, SITE_ORIGIN } from '@/lib/site-config'
import type { LocalizationData, AvailableCountry, SlimCollection, ShopifyMenu } from '@/lib/shopify/types'
import { MotionConfig } from 'framer-motion'

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

// No cookies()/headers() in this layout: any request-state read here opts
// every route into dynamic rendering and voids ISR site-wide (audit H1).
// The cart hydrates client-side in CartProvider; the market_country cookie
// is read client-side in the Footer currency switcher.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
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
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildOrganizationSchema()) }}
        />
        <MotionConfig reducedMotion="user">
          <CartProvider>
            <Header menuItems={menuItems} collections={collections} />
            {children}
            <Footer
              collections={collections}
              availableCountries={availableCountries}
            />
            <CartPopup />
          </CartProvider>
        </MotionConfig>
      </body>
    </html>
  )
}
