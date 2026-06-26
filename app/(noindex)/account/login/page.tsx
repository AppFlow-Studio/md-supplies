import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/shopify/session'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Private account route — never statically rendered or publicly cached (DEV-11).
export const dynamic = 'force-dynamic'

// /account/login — kick off PKCE flow if not already authenticated
export default async function AccountLoginPage() {
  const session = await getSession()
  if (session) redirect('/account')
  redirect('/api/auth/login')
}
