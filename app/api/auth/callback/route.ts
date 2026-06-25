import { type NextRequest, NextResponse } from 'next/server'
import { exchangeToken } from '@/lib/shopify/customer'
import { SESSION_COOKIES } from '@/lib/shopify/session'
import { SITE_ORIGIN } from '@/lib/site-config'

const SESSION_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code          = searchParams.get('code')
  const returnedState = searchParams.get('state')

  const storedVerifier = request.cookies.get(SESSION_COOKIES.CODE_VERIFIER)?.value
  const storedState    = request.cookies.get(SESSION_COOKIES.OAUTH_STATE)?.value

  if (!code || !storedVerifier || returnedState !== storedState) {
    return NextResponse.redirect(`${SITE_ORIGIN}/account?auth_error=1`)
  }

  try {
    const tokens    = await exchangeToken(code, storedVerifier)
    const expiresAt = Date.now() + tokens.expires_in * 1000

    const response = NextResponse.redirect(`${SITE_ORIGIN}/account`)
    response.cookies.set(SESSION_COOKIES.ACCESS_TOKEN,  tokens.access_token,  { ...SESSION_OPTS, maxAge: tokens.expires_in       })
    response.cookies.set(SESSION_COOKIES.REFRESH_TOKEN, tokens.refresh_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30       })
    response.cookies.set(SESSION_COOKIES.EXPIRES_AT,    String(expiresAt),    { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30       })
    if (tokens.id_token) {
      response.cookies.set(SESSION_COOKIES.ID_TOKEN, tokens.id_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30 })
    }
    response.cookies.delete(SESSION_COOKIES.CODE_VERIFIER)
    response.cookies.delete(SESSION_COOKIES.OAUTH_STATE)
    return response
  } catch {
    return NextResponse.redirect(`${SITE_ORIGIN}/account?auth_error=1`)
  }
}
