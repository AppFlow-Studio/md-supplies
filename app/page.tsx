import { storefrontFetch } from '@/lib/shopify/storefront';
import { GET_PRODUCTS } from '@/lib/shopify/queries/products';
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections';
import type { Product, Collection } from '@/lib/shopify/types';

export default async function Home() {
  const [products, collections] = await Promise.all([
    storefrontFetch<{ products: { nodes: Product[] } }>(GET_PRODUCTS, {
      first: 4,
      sortKey: 'BEST_SELLING',
    }),
    storefrontFetch<{ collections: { nodes: Collection[] } }>(GET_COLLECTIONS, {
      first: 6,
    }),
  ]);

  console.log('=== PRODUCTS ===');
  console.log(JSON.stringify(products.products.nodes, null, 2));

  console.log('=== COLLECTIONS ===');
  console.log(JSON.stringify(collections.collections.nodes, null, 2));

  return (
    <main className="p-8 font-sans">
      <p className="text-muted text-sm">Check the terminal for logged Shopify data.</p>
    </main>
  );
}
