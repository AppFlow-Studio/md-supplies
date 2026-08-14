export const PREDICTIVE_SEARCH = `#graphql
  query Predictive($q: String!, $limit: Int = 6) {
    predictiveSearch(query: $q, limit: $limit, types: [PRODUCT, COLLECTION, QUERY]) {
      products { id title handle featuredImage { url altText } }
      collections { id title handle }
      queries { text styledText }
    }
  }
`;

export const SEARCH_PRODUCTS = `#graphql
  query SearchProducts(
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
      totalCount
      productFilters {
        id label type
        values { id label count input }
      }
      pageInfo {
        hasNextPage endCursor
      }
      nodes {
        ... on Product {
          id
          title
          handle
          vendor
          availableForSale
          tags
          # DEV-SHIP-04: SEARCH_PRODUCTS (the /search page) previously had no
          # backorder selection at all, so a product with custom.backorder=true
          # never showed the Backorder label in search results. ETA fields are
          # compatibility/live-theme only — never displayed; custom.backorder
          # alone triggers the label.
          estimatedRestockDate: metafield(namespace: "custom", key: "estimated_back_order_restock_date") { value }
          backorderRestockEta: metafield(namespace: "custom", key: "backorder_restock_eta") { value }
          backorder: metafield(namespace: "custom", key: "backorder") { value }
          # DEV-SHIP-03: merchant-controlled gate for the Free Shipping
          # badge, ANDed with the shipping resolver's confirmation — see
          # lib/shipping-resolver/free-shipping-gate.ts. Without this
          # selection, /search results never carried a shippingDisplay at
          # all (attachCardShippingDisplay was never called on them either
          # — see app/search/page.tsx).
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
              image { id url altText width height }
            }
          }
        }
      }
    }
  }
`;
