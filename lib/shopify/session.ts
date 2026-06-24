import { cookies } from 'next/headers'

export const SESSION_COOKIES = {
  ACCESS_TOKEN:  'shopify_access_token',
  REFRESH_TOKEN: 'shopify_refresh_token',
  EXPIRES_AT:    'shopify_token_expires_at',
  ID_TOKEN:      'shopify_id_token',
  CODE_VERIFIER: 'shopify_code_verifier',
  OAUTH_STATE:   'shopify_oauth_state',
} as const

export interface Session {
  accessToken:  string
  refreshToken: string
  expiresAt:    number
}

/**
 * True when the access token has expired or expires within the next 60 s.
 *
 * Kept as a standalone (non-component) helper so the `Date.now()` call lives
 * outside any React render path — calling `Date.now()` directly in a server
 * component body trips the `react-hooks/purity` lint rule.
 */
export function isSessionExpiring(expiresAt: number): boolean {
  return Date.now() >= expiresAt - 60_000
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
