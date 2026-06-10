import { NextResponse } from 'next/server'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
} from '@/lib/shopify/customer'
import { SESSION_COOKIES } from '@/lib/shopify/session'

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

export async function GET() {
  const verifier  = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state     = randomBase64Url(16)

  const response = NextResponse.redirect(buildAuthUrl(challenge, state))
  response.cookies.set(SESSION_COOKIES.CODE_VERIFIER, verifier, PKCE_OPTS)
  response.cookies.set(SESSION_COOKIES.OAUTH_STATE,   state,    PKCE_OPTS)
  return response
}
