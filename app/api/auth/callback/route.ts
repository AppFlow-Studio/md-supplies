import { type NextRequest, NextResponse } from 'next/server'
import { exchangeToken, customerFetch } from '@/lib/shopify/customer'
import { SESSION_COOKIES } from '@/lib/shopify/session'
import { SITE_ORIGIN } from '@/lib/site-config'
import { safeNextPath } from '@/lib/safe-redirect'
import { addCustomerFavorite } from '@/lib/shopify/favorites-admin'

const GET_CUSTOMER_ID = `#graphql
  query GetCallbackCustomerId { customer { id } }
`

type PendingFavorite = { productId: string; variantId: string | null; next: string }

function parsePendingFavorite(raw: string | undefined): PendingFavorite | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.productId !== 'string') return null
    return {
      productId: parsed.productId,
      variantId: typeof parsed.variantId === 'string' ? parsed.variantId : null,
      next: safeNextPath(typeof parsed.next === 'string' ? parsed.next : null),
    }
  } catch {
    return null
  }
}

/**
 * Completes the guest favorite the visitor clicked before logging in
 * (app/api/auth/login/route.ts stashed it in a cookie). Best-effort by
 * design: a failure here must never break login itself — the visitor is
 * signed in either way, and can just click the heart again.
 */
async function completePendingFavorite(request: NextRequest, accessToken: string): Promise<void> {
  const pending = parsePendingFavorite(request.cookies.get(SESSION_COOKIES.PENDING_FAVORITE)?.value)
  if (!pending) return
  try {
    const data = await customerFetch<{ customer: { id: string } | null }>(GET_CUSTOMER_ID, accessToken)
    if (data.customer) {
      await addCustomerFavorite(data.customer.id, pending.productId, pending.variantId)
    }
  } catch (err) {
    console.error('[favorites] guest handoff addCustomerFavorite failed:', err)
  }
}

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
    const response = NextResponse.redirect(`${SITE_ORIGIN}/account?auth_error=1`)
    response.cookies.delete(SESSION_COOKIES.PENDING_FAVORITE)
    return response
  }

  try {
    const tokens    = await exchangeToken(code, storedVerifier)
    const expiresAt = Date.now() + tokens.expires_in * 1000

    // Runs with the fresh access token, before it's decided where we're
    // sending the browser — the pending cookie already carries its own
    // validated return path (app/api/auth/login/route.ts).
    await completePendingFavorite(request, tokens.access_token)
    const pending = parsePendingFavorite(request.cookies.get(SESSION_COOKIES.PENDING_FAVORITE)?.value)

    const response = NextResponse.redirect(`${SITE_ORIGIN}${pending?.next ?? '/account'}`)
    response.cookies.set(SESSION_COOKIES.ACCESS_TOKEN,  tokens.access_token,  { ...SESSION_OPTS, maxAge: tokens.expires_in       })
    response.cookies.set(SESSION_COOKIES.REFRESH_TOKEN, tokens.refresh_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30       })
    response.cookies.set(SESSION_COOKIES.EXPIRES_AT,    String(expiresAt),    { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30       })
    // Kept for use as id_token_hint when ending the Shopify session at logout.
    if (tokens.id_token) {
      response.cookies.set(SESSION_COOKIES.ID_TOKEN, tokens.id_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30 })
    }
    response.cookies.delete(SESSION_COOKIES.CODE_VERIFIER)
    response.cookies.delete(SESSION_COOKIES.OAUTH_STATE)
    response.cookies.delete(SESSION_COOKIES.PENDING_FAVORITE)
    return response
  } catch {
    const response = NextResponse.redirect(`${SITE_ORIGIN}/account?auth_error=1`)
    response.cookies.delete(SESSION_COOKIES.PENDING_FAVORITE)
    return response
  }
}
