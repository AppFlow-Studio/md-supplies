import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/components/store/CartProvider'
import { CartPopup } from '@/components/store/CartPopup'
import { getCart } from '@/app/actions/cart'

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
  const initialCart = await getCart()

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CartProvider initialCart={initialCart}>
          <Header />
          {children}
          <Footer />
          <CartPopup />
        </CartProvider>
      </body>
    </html>
  )
}
