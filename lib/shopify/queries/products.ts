const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
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
        compareAtPrice { amount currencyCode }
        availableForSale
      }
    }
  }
`;

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
      images(first: 20) {
        nodes { id url altText width height }
      }
      variants(first: 100) {
        nodes {
          id
          title
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
      metafields(identifiers: [
        { namespace: "specs", key: "datasheet_url" }
        { namespace: "specs", key: "dimensions" }
      ]) {
        key
        value
        namespace
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
