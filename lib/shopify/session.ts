import { cookies } from 'next/headers'

export const SESSION_COOKIES = {
  ACCESS_TOKEN:  'shopify_access_token',
  REFRESH_TOKEN: 'shopify_refresh_token',
  EXPIRES_AT:    'shopify_token_expires_at',
  CODE_VERIFIER: 'shopify_code_verifier',
  OAUTH_STATE:   'shopify_oauth_state',
} as const

export interface Session {
  accessToken:  string
  refreshToken: string
  expiresAt:    number
}

export async function getSession(): Promise<Session | null> {
  const store        = await cookies()
  const accessToken  = store.get(SESSION_COOKIES.ACCESS_TOKEN)?.value
  const refreshToken = store.get(SESSION_COOKIES.REFRESH_TOKEN)?.value
  const expiresAt    = store.get(SESSION_COOKIES.EXPIRES_AT)?.value

  if (!accessToken || !refreshToken) return null

  return {
    accessToken,
    refreshToken,
    expiresAt: parseInt(expiresAt ?? '0', 10),
  }
}
