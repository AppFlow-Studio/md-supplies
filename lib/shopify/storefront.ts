import 'server-only';
import { cache } from 'react';
import type { ShopifyResponse } from './types';
import { serverEnv } from '@/lib/env.server';
import { logServerError } from '@/lib/log-error';

// RequestInit plus Next.js data-cache options (revalidate / tags on fetch).
export type StorefrontFetchOptions = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

// Default cache policy for storefront reads: 5-minute data cache under the
// broad 'shopify' tag. Callers with sharper freshness needs pass their own
// options (per-entity tags on product/collection queries, `cache: 'no-store'`
// for the per-user cart reads and all cart mutations in app/actions/cart.ts —
// mutations must NEVER inherit this cached default).
const DEFAULT_FETCH_OPTIONS: StorefrontFetchOptions = {
  next: { revalidate: 300, tags: ['shopify'] },
};

// cachedRequest is wrapped with React's cache() to deduplicate identical
// GraphQL calls within a single server-render request. React's cache()
// memoizes per-request when running inside a Next.js App Router render;
// the string-serialised arguments guarantee reference-equal cache keys
// even when callers pass structurally identical but distinct object literals.
const cachedRequest = cache(async function cachedRequest<T>(
  query: string,
  variablesKey: string,
  fetchOptionsKey: string,
): Promise<ShopifyResponse<T>> {
  const variables = variablesKey ? JSON.parse(variablesKey) : undefined;
  const fetchOptions: StorefrontFetchOptions = fetchOptionsKey
    ? JSON.parse(fetchOptionsKey)
    : DEFAULT_FETCH_OPTIONS;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': serverEnv.shopifyStorefrontToken,
  };

  let res: Response;
  try {
    res = await fetch(`https://${serverEnv.shopifyStoreDomain}/api/2026-04/graphql.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      // Fail fast instead of hanging a server render on a slow Storefront API.
      // Next strips the signal when serving/refreshing the data cache, so this
      // does not opt the request out of caching.
      signal: AbortSignal.timeout(8000),
      ...fetchOptions,
    });
  } catch (err) {
    logServerError('storefront', err);
    throw err;
  }

  if (!res.ok) {
    const message = `Storefront API HTTP ${res.status}: ${res.statusText}`;
    logServerError('storefront', new Error(message));
    throw new Error(message);
  }

  return res.json();
});

// Deliberately no cookies()/headers() in here: reading request state inside
// the shared fetch path opted every route into dynamic rendering and voided
// ISR site-wide (audit H1). The market_country cookie is now a client-side
// concern (Footer currency switcher); Shopify buyer-country pricing was a
// no-op anyway — both market options price in USD. If a non-USD market is
// ever added, pass country explicitly from the caller instead of reading
// cookies here.
export async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  fetchOptions?: StorefrontFetchOptions,
): Promise<T> {
  const json = await cachedRequest<T>(
    query,
    variables ? JSON.stringify(variables) : '',
    fetchOptions ? JSON.stringify(fetchOptions) : '',
  );

  if (json.errors?.length) {
    const message = json.errors.map((e: { message: string }) => e.message).join('\n');
    logServerError('storefront', new Error(message));
    throw new Error(message);
  }

  return json.data;
}
