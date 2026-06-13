import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/shopify/session'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// /account/login — kick off PKCE flow if not already authenticated
export default async function AccountLoginPage() {
  const session = await getSession()
  if (session) redirect('/account')
  redirect('/api/auth/login')
}
