// READ-ONLY check for Task 14 (Bilal 2026-08-19 addendum): does the live
// `trocars-trocar-kits` collection's `custom.customer_filter_category` facet
// ("Category" per lib/filter-registry.ts's M.customerCategory) return any
// combined value whose `label` contains a literal `|` character? If so, the
// metafield is a single_line_text_field storing pipe-joined text and Shopify
// is returning it as ONE facet value. If not — e.g. it's already a
// list.single_line_text_field — Shopify emits one facet value per list entry
// and there is nothing to split.
//
// Also cross-checks the "four products have multiple Trocar categories"
// claim: counts the collection's total distinct products and compares to
// the sum of the Category facet values' counts. If sum > total, some
// products are counted under 2+ category values already (a list metafield
// correctly fanning out), which would corroborate the claim without any
// pipe ever appearing.
//
// Uses the existing read-only GET_COLLECTION_FILTERS_ONLY /
// GET_COLLECTION_PRODUCT_IDS queries (no writes, no Admin API). Mirrors
// scripts/audit-industry-facet-coverage.ts's env/auth setup.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/verify-trocar-category-pipe-labels.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { storefrontFetch } from '../lib/shopify/storefront';
import { GET_COLLECTION_FILTERS_ONLY, GET_COLLECTION_PRODUCT_IDS } from '../lib/shopify/queries/collections';

type FilterValue = { id: string; label: string; count: number; input: string };
type Filter = { id: string; label: string; type: string; values: FilterValue[] };
type FiltersData = { collection: { handle: string; products: { filters: Filter[] } } | null };
type IdsData = {
  collection: { products: { nodes: { id: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } | null;
};

const HANDLE = 'trocars-trocar-kits';

async function countTotalProducts(): Promise<number> {
  let after: string | null = null;
  let total = 0;
  for (let page = 0; page < 40; page++) {
    const data: IdsData = await storefrontFetch(
      GET_COLLECTION_PRODUCT_IDS,
      { handle: HANDLE, first: 250, after },
      { cache: 'no-store' },
    );
    if (!data.collection) return total;
    total += data.collection.products.nodes.length;
    if (!data.collection.products.pageInfo.hasNextPage) break;
    after = data.collection.products.pageInfo.endCursor;
  }
  return total;
}

async function main() {
  console.log(`Querying collection handle "${HANDLE}" for its product filters...`);
  const data = await storefrontFetch<FiltersData>(
    GET_COLLECTION_FILTERS_ONLY,
    { handle: HANDLE },
    { cache: 'no-store' },
  );

  if (!data.collection) {
    console.log(`No collection found for handle "${HANDLE}" on this store.`);
    return;
  }

  const filters = data.collection.products.filters;
  console.log(`Found ${filters.length} filters on collection "${data.collection.handle}":`);
  for (const f of filters) {
    console.log(`\n- filter id=${f.id}  label="${f.label}"  type=${f.type}  (${f.values.length} values)`);
  }

  const categoryFilter = filters.find(
    (f) => f.id.includes('customer_filter_category') || f.label.toLowerCase() === 'category',
  );

  if (!categoryFilter) {
    console.log(
      `\nNo facet matching "customer_filter_category" / label "Category" found among: ${filters.map((f) => f.id).join(', ')}`,
    );
    return;
  }

  console.log(`\n=== Category facet (id="${categoryFilter.id}", type=${categoryFilter.type}) raw values ===`);
  let anyPipe = false;
  let sumCounts = 0;
  for (const v of categoryFilter.values) {
    const hasPipe = v.label.includes('|');
    if (hasPipe) anyPipe = true;
    sumCounts += v.count;
    console.log(
      `  id=${v.id}  label=${JSON.stringify(v.label)}  count=${v.count}  input=${v.input}` +
        (hasPipe ? '  <-- CONTAINS PIPE' : ''),
    );
  }

  console.log(
    `\nConclusion: ${anyPipe ? 'At least one label contains a literal "|".' : 'No label contains a literal "|" — facet already emits one value per category, or no live data exhibits combined labels.'}`,
  );

  const totalProducts = await countTotalProducts();
  console.log(`\nTotal distinct products in collection: ${totalProducts}`);
  console.log(`Sum of Category facet value counts: ${sumCounts}`);
  console.log(
    sumCounts > totalProducts
      ? `Sum exceeds total by ${sumCounts - totalProducts} — that many products are counted under 2+ category values (list metafield fanning out correctly, corroborates "multiple categories" claim with zero pipes).`
      : 'Sum does not exceed total distinct product count — no evidence of multi-category products in this facet data.',
  );
}

main().catch((err) => {
  console.error('CHECK FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
