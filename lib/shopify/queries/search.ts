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
      }
    }
  }
`;
