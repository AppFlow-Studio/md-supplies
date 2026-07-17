const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    title
    handle
    vendor
    availableForSale
    tags
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

          selectedOptions { name value }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
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
      productFilters {
        id
        label
        type
        values { id label count input }
      }
      nodes {
        ... on Product {
          id
          title
          handle
          vendor
          availableForSale
          tags
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
            }
          }
        }
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
