import { redirect } from 'next/navigation'
import { getSession } from '@/lib/shopify/session'

// /account/login — kick off PKCE flow if not already authenticated
export default async function AccountLoginPage() {
  const session = await getSession()
  if (session) redirect('/account')
  redirect('/api/auth/login')
}
