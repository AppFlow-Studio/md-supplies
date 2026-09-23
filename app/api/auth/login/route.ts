import { type NextRequest, NextResponse } from 'next/server'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
} from '@/lib/shopify/customer'
import { SESSION_COOKIES } from '@/lib/shopify/session'
import { safeNextPath } from '@/lib/safe-redirect'

function randomBase64Url(byteCount: number): string {
  const arr = new Uint8Array(byteCount)
  crypto.getRandomValues(arr)
  let str = ''
  for (const b of arr) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

const PKCE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10, // 10 min — long enough to complete the hosted login flow
}

export async function GET(request: NextRequest) {
  const verifier  = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state     = randomBase64Url(16)

  const response = NextResponse.redirect(buildAuthUrl(challenge, state))
  response.cookies.set(SESSION_COOKIES.CODE_VERIFIER, verifier, PKCE_OPTS)
  response.cookies.set(SESSION_COOKIES.OAUTH_STATE,   state,    PKCE_OPTS)

  // Guest favorite handoff (DEV-FAV-01): a heart click before login carries
  // its intent here as query params, which we immediately move into a
  // short-lived server-side cookie — never through the OAuth
  // authorize/token round trip itself, and never anything beyond a public
  // product/variant id + a validated same-origin return path. The callback
  // route reads and deletes this cookie once, after a session is
  // established (app/api/auth/callback/route.ts).
  const favoriteProductId = request.nextUrl.searchParams.get('favoriteProductId')
  if (favoriteProductId) {
    const pending = {
      productId: favoriteProductId,
      variantId: request.nextUrl.searchParams.get('favoriteVariantId') || null,
      next: safeNextPath(request.nextUrl.searchParams.get('next')),
    }
    response.cookies.set(SESSION_COOKIES.PENDING_FAVORITE, JSON.stringify(pending), PKCE_OPTS)
  }

  return response
}
