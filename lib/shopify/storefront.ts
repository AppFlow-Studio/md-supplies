import type { ShopifyResponse } from './types';

const STOREFRONT_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2026-04/graphql.json`;

export async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
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
