import { cookies } from 'next/headers';
import type { ShopifyResponse } from './types';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
const STOREFRONT_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2026-04/graphql.json`;

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
  };
  if (country && country !== 'US') {
    headers['Shopify-Storefront-Buyer-Country'] = country;
  }

  const res = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    ...fetchOptions,
  });

  if (!res.ok) {
    throw new Error(`Storefront API HTTP ${res.status}: ${res.statusText}`);
  }

  const json: ShopifyResponse<T> = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('\n'));
  }

  return json.data;
}
