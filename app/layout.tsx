import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/components/store/CartProvider'
import { CartPopup } from '@/components/store/CartPopup'
import { getCart } from '@/app/actions/cart'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_LOCALIZATION } from '@/lib/shopify/queries/markets'
import type { LocalizationData, AvailableCountry } from '@/lib/shopify/types'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MD Supplies',
  description: 'Medical-Grade Supplies at Wholesale Prices',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const currentCountry = cookieStore.get('market_country')?.value ?? 'US'

  const [initialCart, localization] = await Promise.all([
    getCart(),
    storefrontFetch<{ localization: LocalizationData }>(GET_LOCALIZATION).catch(
      () => null,
    ),
  ])

  const availableCountries: AvailableCountry[] = localization?.localization.availableCountries ?? []

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CartProvider initialCart={initialCart}>
          <Header />
          {children}
          <Footer
            availableCountries={availableCountries}
            currentCountry={currentCountry}
          />
          <CartPopup />
        </CartProvider>
      </body>
    </html>
  )
}
