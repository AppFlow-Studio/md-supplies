export const GET_COLLECTIONS = `#graphql
  query GetCollections($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        title
        handle
        description
        image { id url altText width height }
      }
    }
  }
`;

export const GET_COLLECTION_META = `#graphql
  query GetCollectionMeta($handle: String!) {
    collection(handle: $handle) {
      id
      title
      handle
    }
  }
`;

export const GET_COLLECTION_HERO = `#graphql
  query GetCollectionHero($handle: String!) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      image { id url altText width height }
      seo {
        title
        description
      }
    }
  }
`;

export const GET_COLLECTION = `#graphql
  query GetCollection(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      image { id url altText width height }
      seo {
        title
        description
      }
      products(
        first: $first
        after: $after
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        nodes {
          id
          title
          handle
          vendor
          availableForSale
          tags
          # DEV-LABEL-01: single backorder source, shared with the PDP so
          # card and PDP can never disagree.
          # Public brand. Cards must never fall back to the Shopify vendor
          # field (the fulfilling vendor) — see lib/brand.ts.
          brandName: metafield(namespace: "custom", key: "brand_name") { value }
          # DEV-SHIP-04: ETA fields are compatibility/live-theme only — never
          # displayed. custom.backorder alone triggers the Backorder label.
          estimatedRestockDate: metafield(namespace: "custom", key: "estimated_back_order_restock_date") { value }
          backorderRestockEta: metafield(namespace: "custom", key: "backorder_restock_eta") { value }
          backorder: metafield(namespace: "custom", key: "backorder") { value }
          # DEV-SHIP-02: merchant-controlled gate for the Free Shipping badge,
          # ANDed with the shipping resolver's confirmation — see
          # lib/shipping-resolver/free-shipping-gate.ts.
          freeShipping: metafield(namespace: "custom", key: "free_shipping") { value }
          # The store's own RX declaration. Selected here so grid cards can
          # evaluate the SAME tag∪metafield union as the PDP and the cart
          # (lib/rx-gate.ts). Without it the 40 ACTIVE metafield-only RX
          # products found in the 2026-08-02 audit carry no RX indicator on any
          # category/industry grid. Fails closed: if the definition lacks
          # Storefront access this returns null and detection falls back to the
          # tag, which is the pre-existing behaviour — never wider-then-broken.
          isRxOnly: metafield(namespace: "custom", key: "is_rx_only") { value }
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
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        filters {
          id
          label
          type
          values { id label count input }
        }
      }
    }
  }
`;

export const GET_COLLECTIONS_SLIM = `#graphql
  query GetCollectionsSlim($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        handle
        title
        description
        descriptionHtml
        updatedAt
        image {
          id
          url
          altText
          width
          height
        }
        seo {
          title
          description
        }
      }
    }
  }
`;

export const GET_COLLECTIONS_AUDIT = `#graphql
  query GetCollectionsAudit($first: Int!) {
    collections(first: $first) {
      nodes {
        handle
        title
        image { url }
        seo { title description }
        products(first: 1) {
          nodes { id }
        }
      }
    }
  }
`;

export const GET_COLLECTION_FILTERS_ONLY = `#graphql
  query GetCollectionFiltersOnly($handle: String!) {
    collection(handle: $handle) {
      handle
      products(first: 1) {
        filters {
          id
          label
          type
          values { id label count input }
        }
      }
    }
  }
`;

export const GET_COLLECTIONS_WITH_PRODUCT_SAMPLE = `#graphql
  query GetCollectionsWithProductSample($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      nodes {
        handle
        title
        products(first: 50) {
          nodes { handle }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const GET_COLLECTION_PRODUCT_CARDS = `#graphql
  query GetCollectionProductCards($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first, sortKey: BEST_SELLING) {
        nodes {
          handle
          title
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 1) { nodes { url altText } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

// DEV-SEARCH-01: IDs-only membership page for server-side search-scope
// enforcement on collections without a registry tag scope (OCC).
export const GET_COLLECTION_PRODUCT_IDS = `#graphql
  query GetCollectionProductIds($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      products(first: $first, after: $after) {
        nodes { id }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export const GET_COLLECTIONS_FOR_SITEMAP = `#graphql
  query GetCollectionsForSitemap($first: Int!) {
    collections(first: $first) {
      nodes {
        handle
        updatedAt
      }
    }
  }
`;

export const GET_ALL_COLLECTION_HANDLES = `#graphql
  query GetAllCollectionHandles($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      nodes {
        handle
        title
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
