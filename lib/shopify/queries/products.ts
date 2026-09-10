// DEV-LAUNCH-07: every query built on this fragment feeds ShopifyProductCard
// (partner product listings via GET_PRODUCTS_BY_VENDOR, PDP "You May Also
// Like"/"Frequently Bought With" via GET_PRODUCT_RECS, etc.) — the exact same
// component GET_COLLECTION's card grid uses. Without these three fields the
// card silently degrades: no brand line even when an approved brand_name
// exists, no RX badge for the 40 ACTIVE metafield-only RX products, and a
// backordered item reads as plain "Out of Stock" instead of its restock date.
// Selected here so every ShopifyProductCard consumer agrees with the category
// grid and the PDP, not just the ones that happened to ask.
const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    title
    handle
    vendor
    availableForSale
    tags
    brandName: metafield(namespace: "custom", key: "brand_name") { value }
    # DEV-SHIP-04: both ETA fields are queried for compatibility/live-theme use
    # only — the custom storefront never displays, announces, or infers
    # Backorder status from either. custom.backorder alone is the sole trigger.
    estimatedRestockDate: metafield(namespace: "custom", key: "estimated_back_order_restock_date") { value }
    backorderRestockEta: metafield(namespace: "custom", key: "backorder_restock_eta") { value }
    backorder: metafield(namespace: "custom", key: "backorder") { value }
    isRxOnly: metafield(namespace: "custom", key: "is_rx_only") { value }
    # DEV-SHIP-02: merchant-controlled gate for the Free Shipping badge,
    # ANDed with the shipping resolver's own confirmation — see
    # lib/shipping-resolver/free-shipping-gate.ts. Selected here so every
    # ShopifyProductCard consumer (cards, recs, Quick Add) can evaluate it.
    freeShipping: metafield(namespace: "custom", key: "free_shipping") { value }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    images(first: 1) {
      nodes { id url altText width height }
    }
    variants(first: 1) {
      nodes {
        id
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        availableForSale
        # Quick Add fix (2026-08-14): native variant-media assignment, same
        # field the PDP already reads (LG-03). Without this, QuickAddContent
        # always shows the product's first image regardless of the selected
        # variant/color.
        image { id url altText width height }
      }
    }
  }
`

// Metafields require Storefront API "Read access" enabled per definition in Shopify Admin
// (Settings → Custom data → Products → [field] → Storefront access: on).
// Fields returning null despite real data = closed access gate.
export const GET_PRODUCT = `#graphql
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      vendor
      availableForSale
      tags
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      compareAtPriceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      images(first: 20) {
        nodes { id url altText width height }
      }
      variants(first: 100) {
        nodes {
          id
          title
          sku
          barcode
          availableForSale
          # Shopify's own variant-media assignment (LG-03) — never inferred
          # from filename/option text. Falls back to the shared product
          # gallery client-side when a variant has no assigned image.
          image { id url altText width height }

          selectedOptions { name value }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }

          # AeroWalk pilot (2026-08-14) — proposed contract, see
          # docs/launch/2026-08-14-variant-field-contract.md. Resolves to
          # null on every variant until Izzy's write lands; ProductView
          # already handles null gracefully via resolveVariantValue.
          manufacturerNumber: metafield(namespace: "custom", key: "manufacturer_item_number") { value }
          orderSize: metafield(namespace: "custom", key: "order_size") { value }
          unitsPerOrder: metafield(namespace: "custom", key: "units_per_order") { value }
          description: metafield(namespace: "custom", key: "variant_description") { value }

          # LG-04 packaging breakdown (2026-08-17) — additive to order_size/
          # units_per_order, no product-level fallback. Izzy: "totals are only
          # ever stored where the source states one outright" — blank means no
          # data, not zero, so these three are independently optional.
          innerPackQuantity: metafield(namespace: "custom", key: "inner_pack_quantity") { value }
          packsPerCase: metafield(namespace: "custom", key: "packs_per_case") { value }
          totalOrderQuantity: metafield(namespace: "custom", key: "total_order_quantity") { value }
        }
      }
      options {
        id
        name
        values
      }
      seo {
        title
        description
      }
      collections(first: 10) {
        nodes { handle title }
      }
      # normalizeProduct maps a full set of metafields, but none were being
      # requested, so every one resolved to null. Two of them cause real harm and
      # are on the assignment, so they are fetched here.
      #
      # brandName: the PDP renders brandName ?? vendor. With brandName null it
      # fell through to vendor on every product, which prints MedPlus on a
      # Dukal-branded bandage (product 8692868743384, SKU DUK 7609). vendor is the
      # FULFILLER and disagrees with brand on 51% of active products, so the
      # fallback was wrong for about half the catalogue.
      #
      # Both definitions are storefront-readable (PUBLIC_READ), verified live.
      # The remaining metafields normalizeProduct maps are still unfetched: adding
      # them changes what the spec sections render, which needs review rather than
      # a quiet switch-on.
      brandName: metafield(namespace: "custom", key: "brand_name") { value }
      # DEV-SHIP-04 (final business rule): both ETA fields below are queried
      # and normalized for compatibility/live-theme use only. custom.backorder
      # is the SOLE trigger for the Backorder label — the PDP never displays,
      # announces, or infers anything from either ETA field.
      estimatedRestockDate: metafield(namespace: "custom", key: "estimated_back_order_restock_date") { value }
      backorderRestockEta: metafield(namespace: "custom", key: "backorder_restock_eta") { value }
      backorder: metafield(namespace: "custom", key: "backorder") { value }
      # RX: the gate UNIONs the compliance:rx-only tag with the store's own
      # declaration. The tag set is a strict SUBSET of this metafield (40 active
      # prescription products carry the metafield and no tag), so the PDP must
      # read both or its badge disagrees with the cart gate.
      isRxOnly: metafield(namespace: "custom", key: "is_rx_only") { value }
      # DEV-SHIP-02: merchant-controlled gate for the Free Shipping badge.
      # Never trusted alone — ANDed with the shipping resolver's own
      # standard-free + effective_rate_class=FREE confirmation before the
      # PDP renders a claim (lib/shipping-resolver/free-shipping-gate.ts).
      freeShipping: metafield(namespace: "custom", key: "free_shipping") { value }
      # LG-04 fallback source: custom.order_size / custom.units_per_order also
      # exist at PRODUCT level (10,001 / 8,210 products — confirmed in Izzy's
      # 2026-08-14 field contract). ProductView's resolveVariantValue already
      # reads product.orderSize/product.unitsPerOrder as the fallback when a
      # variant carries no override, but nothing selected them at product
      # level until now, so that fallback was silently always null.
      orderSize: metafield(namespace: "custom", key: "order_size") { value }
      unitsPerOrder: metafield(namespace: "custom", key: "units_per_order") { value }
      # H-01 — Vendor Shipping & Returns. Confirmed by Izzy's 2026-08-14 field
      # contract as the live theme's actual source: custom.shipping_returns,
      # rich_text_field, PUBLIC_READ, populated on 10,001 products. Value is a
      # Shopify rich-text JSON AST — flattened by
      # lib/policy/rich-text.ts:shopifyRichTextToPlainParagraphs before it
      # reaches resolveReturnPolicy's vendorPolicyText.
      shippingReturns: metafield(namespace: "custom", key: "shipping_returns") { value }
    }
  }
`;

export const GET_PRODUCTS = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProducts($first: Int!, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse) {
      nodes { ...ProductCard }
    }
  }
`;

export const GET_PRODUCTS_BY_VENDOR = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProductsByVendor(
    $query: String!
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) {
    products(
      first: $first
      after: $after
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      nodes { ...ProductCard }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

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
`;

// Root-level equivalent of GET_COLLECTION's products connection, for
// tag-derived listings (L2 subcategory pages) that have no backing Shopify
// collection to query. Mirrors GET_COLLECTION's product field selection and
// its pageInfo/filters shape exactly, so callers can treat the two
// connections identically (see lib/category-results-source.ts).
//
// Goes through Query.search(...), NOT Query.products(...): Shopify's root
// products() field does not accept a `filters` argument at all (only
// Collection.products does) — confirmed live against this store's API
// (2026-04), which returned "Field 'products' doesn't accept argument
// 'filters'" when the old GET_PRODUCTS_BY_TAG_FILTERED tried it. Query.search
// is the only root-level field that supports faceted filtering, via its
// productFilters argument — this is exactly why SEARCH_PRODUCTS (below) was
// already built on search() rather than products(). This query mirrors that
// same pattern, just with the richer field selection (images/variants,
// first: 6/10) that the L2 category grid needs, instead of SEARCH_PRODUCTS's
// lighter first: 1/1 selection built for the smaller search UI.
//
// search's `nodes` field returns a union (SearchResultItem), so the product
// field selection must be wrapped in `... on Product { ... }`.
export const SEARCH_PRODUCTS_BY_TAG = `#graphql
  query SearchProductsByTag(
    $query: String!
    $first: Int!
    $after: String
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) {
    search(
      query: $query
      first: $first
      after: $after
      sortKey: $sortKey
      reverse: $reverse
      productFilters: $filters
      types: PRODUCT
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      # NO \`productFilters\` SELECTION HERE — deliberate, and load-bearing.
      #
      # Measured live against this store's Storefront API (2026-08-26): on
      # \`Query.search\`, asking for the \`productFilters\` FIELD in the same
      # operation that passes a non-empty \`productFilters:\` ARGUMENT makes the
      # API drop the \`query\` scope entirely and answer for the filter alone,
      # across the whole catalogue. Reproduced 3/3 with a query that matches
      # nothing:
      #
      #   search(query: "tag:\\"subcategory:zzz-does-not-exist\\"",
      #          productFilters: [{productMetafield:{namespace:"custom",
      #                            key:"customer_filter_category",
      #                            value:"Shower Commode"}}])
      #     · with    productFilters selected -> totalCount 8, 8 nodes
      #     · without productFilters selected -> totalCount 0, 0 nodes
      #
      # Removing the field is what restores scoping. Real impact before this
      # change, same run: /category/apparel with one Brand filter rendered
      # products from a 1,000-product whole-catalogue set instead of the 39
      # Apparel products that match, and every L2 subcategory page did the
      # same (Home Care -> Bedside Commodes, "Shower Commode": 8 products
      # returned for a facet that counted 1).
      #
      # Facets for search-sourced routes now come from SEARCH_SCOPED_FACETS
      # below, which never passes the argument, plus exact per-value counts
      # from lib/catalog/exact-facet-counts.ts. Do not re-add this field.
      nodes {
        ... on Product {
          id
          title
          handle
          vendor
          availableForSale
          tags
          # DEV-LABEL-01: single backorder source, shared with the PDP.
          # Public brand — never fall back to the Shopify vendor field
          # (the fulfilling vendor). See lib/brand.ts.
          brandName: metafield(namespace: "custom", key: "brand_name") { value }
          # DEV-SHIP-04: ETA fields are compatibility/live-theme only — never
          # displayed. custom.backorder alone triggers the Backorder label.
          estimatedRestockDate: metafield(namespace: "custom", key: "estimated_back_order_restock_date") { value }
          backorderRestockEta: metafield(namespace: "custom", key: "backorder_restock_eta") { value }
          backorder: metafield(namespace: "custom", key: "backorder") { value }
          freeShipping: metafield(namespace: "custom", key: "free_shipping") { value }
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          images(first: 6) {
            nodes { id url altText width height }
          }
          variants(first: 10) {
            nodes {
              id
              title
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              availableForSale
              image { id url altText width height }
            }
          }
        }
      }
    }
  }
`;

/**
 * Facets for a search-sourced product set (L2 subcategory routes and the
 * `productSet: 'tag'` L1s), scoped by `query` alone.
 *
 * Takes NO `productFilters` argument by design — see the long comment in
 * SEARCH_PRODUCTS_BY_TAG: passing one alongside a `productFilters` selection
 * silently discards the `query` scope. With no argument the response is
 * correctly scoped, which makes this the only trustworthy way to learn which
 * facet groups and values exist for a tag-scoped product set.
 *
 * The `count` each value carries is still Shopify's, and Shopify's is wrong
 * here — measured 2026-08-26, the same query returns "Bedside Commodes = 17"
 * at `first: 1` and "= 24" at `first: 20` for a set where the true figure is
 * 32. Callers replace these counts via lib/catalog/exact-facet-counts.ts;
 * only the group/value/label/input structure is taken from this response.
 */
export const SEARCH_SCOPED_FACETS = `#graphql
  query SearchScopedFacets($query: String!) {
    search(query: $query, types: PRODUCT, first: 1) {
      totalCount
      productFilters {
        id
        label
        type
        values { id label count input }
      }
    }
  }
`;

/**
 * Builds a single operation that asks `Query.search` for N independent
 * `totalCount`s — one per facet value — all under the same `query` scope.
 *
 * One aliased request instead of N round-trips: 86 aliases (the widest
 * search-sourced route, Apparel) answered in ~1.7s on 2026-08-26, and the
 * usual L2 page needs ~10. `productFilters` is NEVER selected here, so each
 * alias keeps its `query` scope and its `totalCount` is exact — which is the
 * whole point: the number shown next to a facet value is the number of
 * products clicking it returns.
 */
export function buildSearchFacetCountsQuery(count: number): string {
  const args = Array.from({ length: count }, (_, i) => `$f${i}: [ProductFilter!]`).join(', ');
  const fields = Array.from(
    { length: count },
    (_, i) => `c${i}: search(query: $query, types: PRODUCT, first: 1, productFilters: $f${i}) { totalCount }`,
  ).join('\n    ');
  return `#graphql
  query SearchFacetCounts($query: String!, ${args}) {
    ${fields}
  }
`;
}

// Account Favorites view (DEV-FAV-01): resolves the customer's saved product
// IDs to live card data through the SAME fragment every other card grid uses
// — never a second pricing/availability computation. `nodes` returns one
// entry per input id, `null` for anything Shopify can no longer resolve
// (deleted, or not visible to the Storefront API — unpublished/archived).
// Callers treat a null as an orphan to drop, both from the rendered list and
// from the persisted favorite record (lib/shopify/favorites-admin.ts
// pruneCustomerFavorites).
export const GET_PRODUCTS_BY_IDS = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        ...ProductCard
      }
    }
  }
`;

export const GET_PRODUCT_CARD_BY_HANDLE = `#graphql
  query GetProductCardByHandle($handle: String!) {
    product(handle: $handle) {
      handle
      title
      priceRange {
        minVariantPrice { amount currencyCode }
      }
      images(first: 1) {
        nodes { url altText }
      }
    }
  }
`;

export const GET_PRODUCT_CARD_FULL = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProductCardFull($handle: String!) {
    product(handle: $handle) {
      ...ProductCard
    }
  }
`;

export const GET_PRODUCT_RECS = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProductRecs($handle: String!) {
    related: productRecommendations(productHandle: $handle, intent: RELATED) {
      ...ProductCard
    }
    complementary: productRecommendations(productHandle: $handle, intent: COMPLEMENTARY) {
      ...ProductCard
    }
  }
`;

// Cheap existence check for the review write route: confirms a
// client-supplied Shopify GID still resolves to a real product before
// forwarding a review to TrustShop, without pulling a full product payload.
export const GET_PRODUCT_EXISTS_BY_ID = `#graphql
  query GetProductExistsById($id: ID!) {
    product(id: $id) {
      id
    }
  }
`;

export const GET_ALL_PRODUCT_HANDLES = `#graphql
  query GetAllProductHandles($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        handle
        updatedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_ALL_PRODUCT_TAGS = `#graphql
  query GetAllProductTags($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        handle
        tags
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
