import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSession, isSessionExpiring } from '@/lib/shopify/session'
import { getAccountFavorites } from '@/app/actions/favorites'
import { AccountFavoritesGrid } from '@/components/account/AccountFavoritesGrid'

export const metadata: Metadata = {
  title: 'Favorites | MD Supplies',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AccountFavoritesPage() {
  const session = await getSession()
  if (!session) redirect('/api/auth/login?next=/account/favorites')

  if (isSessionExpiring(session.expiresAt)) {
    redirect('/api/auth/refresh?next=/account/favorites')
  }

  const { products } = await getAccountFavorites()

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1 text-gray-500 text-[14px] hover:text-navy-900 transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back to Account
        </Link>

        <h1 className="text-navy-900 text-[32px] font-semibold mb-8">Favorites</h1>

        <AccountFavoritesGrid products={products} />
      </div>
    </main>
  )
}
