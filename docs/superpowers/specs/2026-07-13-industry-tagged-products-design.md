# Industry Pages: Real Tagged Products via Category Product Card

## Problem

Industry detail pages (`/industries/[industry-slug]`) currently source their "Popular
Products" section from a static 1:1 `collectionHandle` mapping in `lib/industries.ts`,
rendered with the lightweight `FeaturedProductCard` (`{handle, title, image, price}`).

Products in Shopify have now been tagged by industry (`industry:*` tags), so industries
can be populated from real tag-matched products instead of (or in addition to) the
collection mapping. The card should match the one used on category detail pages
(`ShopifyProductCard`) for visual and analytics consistency.

## Current state of the `industry:*` tags (verified against live catalog, 7,385 products)

Only 6 of the 12 industries in `lib/industries.ts` have any `industry:*` tag applied,
and none of the tag slugs match the industry page slugs exactly:

| Tag | Product count | Industry page (slug) |
|---|---|---|
| `industry:urgent-care` | 4344 | `urgent-care` |
| `industry:clinic` | 6389 | `clinics-doctors-offices` |
| `industry:home-care` | 3091 | `home-health` |
| `industry:hrt-surgery` | 531 | `hrt-clinics` |
| `industry:pharmacy` | 282 | `pharmacies` |
| `industry:occ-charities` | 106 | *(no matching page — left unmapped)* |

The remaining 6 pages (`ems`, `long-term-care`, `physical-therapy`, `private-practice`,
`dental`, `veterinary`, `community-health`) have zero tagged products today.

## Approach

Add an explicit, per-industry `tag` mapping. Industries with a mapping fetch products
by Storefront tag query; industries without one keep the existing collection-based
fetch, untouched. This avoids blocking the feature on the catalog team finishing all
tagging, and avoids guessing at a slug-derived tag that doesn't match reality.

`industry:occ-charities` is left unmapped — it doesn't clearly correspond to any
existing industry page and no page should silently absorb it.

## Design

### 1. Data layer — `lib/industries.ts`

Add an optional field to the `Industry` type:

```ts
export type Industry = {
  name: string
  slug: string
  collectionHandle: string
  tag?: string   // NEW — Shopify product tag for this industry, e.g. "industry:hrt-surgery"
  description: string
  image: string
  buyerType: string
  faq?: FAQ[]
}
```

Set `tag` on exactly these 5 entries:

- `urgent-care` → `tag: 'industry:urgent-care'`
- `hrt-clinics` → `tag: 'industry:hrt-surgery'`
- `home-health` → `tag: 'industry:home-care'`
- `clinics-doctors-offices` → `tag: 'industry:clinic'`
- `pharmacies` → `tag: 'industry:pharmacy'`

All other entries omit `tag`.

### 2. Query layer — `lib/shopify/queries/products.ts`

Add `GET_PRODUCTS_BY_TAG`, structurally identical to the existing
`GET_PRODUCTS_BY_VENDOR` (both wrap the Storefront `products(query: $query)` search
field and return the shared `ProductCard` fragment), but named for this call site
instead of overloading the vendor-named export:

```ts
export const GET_PRODUCTS_BY_TAG = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProductsByTag(
    $query: String!
    $first: Int!
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse, query: $query) {
      nodes { ...ProductCard }
    }
  }
`
```

### 3. Fetch logic — `app/industries/[industry-slug]/page.tsx`

Replace the current single `GET_COLLECTION`-only fetch with a branch on
`industryStatic.tag`:

- **If `tag` is set:** fetch via `GET_PRODUCTS_BY_TAG` with
  `query: \`tag:"${industryStatic.tag}"\``, `first: 6`, `sortKey: 'BEST_SELLING'`.
- **If not:** keep the existing `GET_COLLECTION` fetch by `collectionHandle` (same
  `first: 6`, `sortKey: 'BEST_SELLING'` as today).

In both branches, assign the resulting `CollectionProduct[]` nodes directly to
`relevantProducts` — remove the current down-mapping to the lightweight
`{handle, title, image, price}` shape.

`getSubcategories(industryStatic.collectionHandle)` is unaffected and keeps running
for all industries regardless of tag mapping.

### 4. Type change — `types/industry.ts`

Change `Industry.relevantProducts` from `IndustryProduct[]` to
`CollectionProduct[]` (imported from `@/lib/shopify/types`).

Verified this field is only read by `components/b2b/IndustryPage.tsx` and only
written by `app/industries/[industry-slug]/page.tsx`. The `IndustryProduct` type
and `FeaturedProductCard` component remain unchanged and continue to be used as-is by
`PartnerDetail.tsx`, `ArticlePage.tsx`, and `AnimatedOCCProducts.tsx` — none of those
read `Industry.relevantProducts`, so they are unaffected by this type change.

### 5. Render — `components/b2b/IndustryPage.tsx`

In the "Popular Products" section:

- Replace `FeaturedProductCard` with `ShopifyProductCard`
  (`@/components/store/ShopifyProductCard`) — the same card used on category detail
  pages.
- Change the grid classes from `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` to
  `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`, matching `ProductGrid`'s breakpoints on
  the category page, for visual parity.
- Do not pass `categorySlug` (tag-matched products can span multiple collections) —
  cards fall back to linking at `/product/{handle}`.
- Pass `itemListId={\`industry-${industry.slug}-featured\`}` and
  `itemListName={\`${industry.name} Featured Products\`}`, plus `index` and
  `imagePriority={index < 3}` for the first row, matching category page conventions.
- Include `ViewItemListTracker` (already used by `ProductGrid` on category pages) so
  GA4 `view_item_list` tracking is consistent between the two page types.

## Out of scope

- No pagination or full browsable grid — stays a small featured band (6 products,
  best-selling sort), matching today's behavior.
- No change to `FeaturedProductCard`, `IndustryProduct`, `PartnerDetail.tsx`,
  `ArticlePage.tsx`, or `AnimatedOCCProducts.tsx`.
- No new industry page for `industry:occ-charities`.
- No change to the 7 untagged industries' fetch behavior (still collection-based).
- No change to `lib/cluster-links.ts` cross-linking (industry↔category links stay
  collection-handle keyed).

## Testing

- Existing tests: `lib/__tests__/industries.test.ts`,
  `app/industries/__tests__/metadata.test.ts` — verify they still pass with the new
  `tag` field and changed `relevantProducts` type.
- Add coverage for: tag-mapped industry fetch path builds the correct `query` string;
  untagged industry falls back to collection fetch; `IndustryPage` renders
  `ShopifyProductCard` with expected props.
