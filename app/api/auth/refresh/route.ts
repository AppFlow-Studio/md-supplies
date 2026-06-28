import { type NextRequest, NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/shopify/customer'
import { SESSION_COOKIES, getSession } from '@/lib/shopify/session'
import { SITE_ORIGIN } from '@/lib/site-config'

const SESSION_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function GET(request: NextRequest) {
  const next    = request.nextUrl.searchParams.get('next') ?? '/account'
  const session = await getSession()

  if (!session?.refreshToken) {
    return NextResponse.redirect(`${SITE_ORIGIN}/api/auth/login`)
  }

  try {
    const tokens    = await refreshAccessToken(session.refreshToken)
    const expiresAt = Date.now() + tokens.expires_in * 1000

    const response = NextResponse.redirect(`${SITE_ORIGIN}${next}`)
    response.cookies.set(SESSION_COOKIES.ACCESS_TOKEN,  tokens.access_token,  { ...SESSION_OPTS, maxAge: tokens.expires_in })
    response.cookies.set(SESSION_COOKIES.REFRESH_TOKEN, tokens.refresh_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30 })
    response.cookies.set(SESSION_COOKIES.EXPIRES_AT,    String(expiresAt),    { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30 })
    return response
  } catch {
    // Refresh token expired or invalid — restart full auth flow
    return NextResponse.redirect(`${SITE_ORIGIN}/api/auth/login`)
  }
}
