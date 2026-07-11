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
