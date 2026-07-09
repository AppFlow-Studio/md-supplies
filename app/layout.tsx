import type { Metadata } from 'next'
import { cookies } from 'next/headers'
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
import { getCart } from '@/app/actions/cart'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_LOCALIZATION } from '@/lib/shopify/queries/markets'
import { GET_COLLECTIONS_SLIM } from '@/lib/shopify/queries/collections'
import { GET_MENU } from '@/lib/shopify/queries/menu'
import { buildOrganizationSchema, jsonLdSafe } from '@/lib/schema'
import type { LocalizationData, AvailableCountry, SlimCollection, ShopifyMenu } from '@/lib/shopify/types'
import { MotionConfig } from 'framer-motion'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MD Supplies',
  description: 'Medical-Grade Supplies, Delivered Fast',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const currentCountry = cookieStore.get('market_country')?.value ?? 'US'

  const [initialCart, localization, collectionsData, menuData] = await Promise.all([
    getCart(),
    storefrontFetch<{ localization: LocalizationData }>(GET_LOCALIZATION).catch(() => null),
    storefrontFetch<{ collections: { nodes: SlimCollection[] } }>(
      GET_COLLECTIONS_SLIM,
      { first: 249 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { next: { revalidate: 3600 } } as any,
    ).catch(() => ({ collections: { nodes: [] as SlimCollection[] } })),
    storefrontFetch<{ menu: ShopifyMenu }>(
      GET_MENU,
      { handle: 'main-menu' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { next: { revalidate: 3600 } } as any,
    ).catch(() => ({ menu: { id: '', title: '', items: [] } as ShopifyMenu })),
  ])
  const availableCountries: AvailableCountry[] = localization?.localization.availableCountries ?? []
  const collections: SlimCollection[] = collectionsData.collections.nodes
  const menuItems = menuData.menu?.items ?? []

  const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === 'true'

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
          <CartProvider initialCart={initialCart}>
            <Header menuItems={menuItems} collections={collections} />
            {children}
            <Footer
              collections={collections}
              availableCountries={availableCountries}
              currentCountry={currentCountry}
            />
            <CartPopup />
          </CartProvider>
        </MotionConfig>
      </body>
    </html>
  )
}
