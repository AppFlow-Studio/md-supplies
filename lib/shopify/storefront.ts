import { cookies } from 'next/headers';
import { cache } from 'react';
import type { ShopifyResponse } from './types';
import { loadEnvConfig } from '@next/env';
import { serverEnv } from '@/lib/env.server';
import { logServerError } from '@/lib/log-error';

loadEnvConfig(process.cwd());

// cachedRequest is wrapped with React's cache() to deduplicate identical
// GraphQL calls within a single server-render request. React's cache()
// memoizes per-request when running inside a Next.js App Router render;
// the string-serialised arguments guarantee reference-equal cache keys
// even when callers pass structurally identical but distinct object literals.
const cachedRequest = cache(async function cachedRequest<T>(
  query: string,
  variablesKey: string,
  country: string,
  fetchOptionsKey: string,
): Promise<ShopifyResponse<T>> {
  const variables = variablesKey ? JSON.parse(variablesKey) : undefined;
  const fetchOptions = fetchOptionsKey ? JSON.parse(fetchOptionsKey) : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': serverEnv.shopifyStorefrontToken,
  };
  if (country && country !== 'US') {
    headers['Shopify-Storefront-Buyer-Country'] = country;
  }

  let res: Response;
  try {
    res = await fetch(`https://${serverEnv.shopifyStoreDomain}/api/2026-04/graphql.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      // Fail fast instead of hanging a server render on a slow Storefront API.
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

export async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  fetchOptions?: RequestInit,
): Promise<T> {
  let country = 'US';
  try {
    const cookieStore = await cookies();
    country = cookieStore.get('market_country')?.value ?? 'US';
  } catch {
    // Outside a request context (e.g. generateStaticParams at build time)
  }

  const json = await cachedRequest<T>(
    query,
    variables ? JSON.stringify(variables) : '',
    country,
    fetchOptions ? JSON.stringify(fetchOptions) : '',
  );

  if (json.errors?.length) {
    const message = json.errors.map((e: { message: string }) => e.message).join('\n');
    logServerError('storefront', new Error(message));
    throw new Error(message);
  }

  return json.data;
}
