import type { Metadata } from 'next'
import { CartPageClient } from '@/components/store/CartPageClient'

export const metadata: Metadata = {
  title: 'Cart | MD Supplies',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <CartPageClient />
    </main>
  )
}
