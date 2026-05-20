export const SEARCH_PRODUCTS = `#graphql
  query SearchProducts($query: String!, $first: Int!) {
    search(query: $query, first: $first, types: PRODUCT) {
      totalCount
      nodes {
        ... on Product {
          id
          title
          handle
          availableForSale
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
              availableForSale
            }
          }
        }
      }
    }
  }
`;
