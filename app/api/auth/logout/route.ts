import { type NextRequest, NextResponse } from 'next/server'
import { logoutUrl } from '@/lib/shopify/customer'
import { SESSION_COOKIES } from '@/lib/shopify/session'
import { SITE_ORIGIN } from '@/lib/site-config'

export async function GET(request: NextRequest) {
  const idToken = request.cookies.get(SESSION_COOKIES.ID_TOKEN)?.value

  let target = `${SITE_ORIGIN}/account`
  if (idToken) {
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: `${SITE_ORIGIN}/account`,
    })
    target = `${logoutUrl()}?${params}`
  }

  const response = NextResponse.redirect(target)
  response.cookies.delete(SESSION_COOKIES.ACCESS_TOKEN)
  response.cookies.delete(SESSION_COOKIES.REFRESH_TOKEN)
  response.cookies.delete(SESSION_COOKIES.EXPIRES_AT)
  response.cookies.delete(SESSION_COOKIES.ID_TOKEN)
  return response
}
