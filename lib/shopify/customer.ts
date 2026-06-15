import type { ShopifyResponse } from './types';

const CUSTOMER_API_VERSION = '2026-04';

// SHOPIFY_CUSTOMER_ACCOUNT_URL is the OAuth/OIDC base:
//   https://shopify.com/authentication/<shop-id>
// The OAuth endpoints (/oauth/authorize, /oauth/token, /logout) hang off it directly.
// The Customer Account GraphQL API lives on a DIFFERENT base — the same host/shop-id
// WITHOUT the /authentication segment:
//   https://shopify.com/<shop-id>/account/customer/api/<version>/graphql
function authBase(): string {
  return process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL ?? '';
}

function apiBase(): string {
  return authBase().replace('/authentication', '');
}

function customerApiUrl(): string {
  return `${apiBase()}/account/customer/api/${CUSTOMER_API_VERSION}/graphql`;
}

function tokenUrl(): string {
  return `${authBase()}/oauth/token`;
}

function authorizeUrl(): string {
  return `${authBase()}/oauth/authorize`;
}

export function logoutUrl(): string {
  return `${authBase()}/logout`;
}

function base64UrlEncode(input: Uint8Array): string {
  let str = '';
  for (const byte of input) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    scope: 'openid email customer-account-api:full',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${authorizeUrl()}?${params}`;
}

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  // Present because the `openid` scope is requested. Used as id_token_hint at logout.
  id_token?: string;
};

export async function exchangeToken(code: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    code,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function refreshAccessToken(token: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!,
    refresh_token: token,
  });

  const res = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Authorization header must be the raw token — NO 'Bearer' prefix (Shopify Customer Account API)
export async function customerFetch<T>(
  query: string,
  accessToken: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = customerApiUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // DEBUG (temporary): surface why the Customer Account API call fails
    console.error(
      `[customerFetch] HTTP ${res.status} ${res.statusText}\n  url:   ${url}\n  token: ${accessToken?.slice(0, 9)}… (len ${accessToken?.length})\n  body:  ${body.slice(0, 600)}`,
    );
    throw new Error(`Customer API HTTP ${res.status}: ${res.statusText}`);
  }

  const json: ShopifyResponse<T> = await res.json();

  if (json.errors?.length) {
    // DEBUG (temporary)
    console.error(`[customerFetch] GraphQL errors @ ${url}\n`, JSON.stringify(json.errors, null, 2));
    throw new Error(json.errors.map((e) => e.message).join('\n'));
  }

  return json.data;
}
