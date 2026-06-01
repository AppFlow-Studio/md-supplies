const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    title
    handle
    vendor
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
`

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
          quantityAvailable
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
      brandName:          metafield(namespace: "custom", key: "brand_name")                          { value }
      unitsPerOrder:      metafield(namespace: "custom", key: "units_per_order")                     { value }
      quantityOfUnits:    metafield(namespace: "custom", key: "quantity_of_units")                   { value }
      orderSize:          metafield(namespace: "custom", key: "order_size")                          { value }
      material:           metafield(namespace: "custom", key: "material")                            { value }
      use:                metafield(namespace: "custom", key: "use")                                 { value }
      features:           metafield(namespace: "custom", key: "features")                            { value }
      color:              metafield(namespace: "custom", key: "color")                               { value }
      sterility:          metafield(namespace: "custom", key: "sterility")                           { value }
      thickness:          metafield(namespace: "custom", key: "thickness")                           { value }
      gloveSize:          metafield(namespace: "custom", key: "glove_size")                          { value }
      needleGauge:        metafield(namespace: "custom", key: "needle_gauge")                        { value }
      needleLength:       metafield(namespace: "custom", key: "needle_length")                       { value }
      sizeLength:         metafield(namespace: "custom", key: "size_length_")                        { value }
      estimatedRestockDate: metafield(namespace: "custom", key: "estimated_back_order_restock_date") { value }
      testsFor:           metafield(namespace: "custom", key: "tests_for")                           { value }
      detectableDrugs:    metafield(namespace: "custom", key: "detectable_drugs")                    { value }
      adulterants:        metafield(namespace: "custom", key: "adulterants")                         { value }
      otherFeatures:      metafield(namespace: "custom", key: "other_features")                      { value }
      typeList:           metafield(namespace: "custom", key: "type")                                { value }
      customBadge1:       metafield(namespace: "custom", key: "custom_badge_1")                      { value }
      customBadge2:       metafield(namespace: "custom", key: "custom_badge_2")                      { value }
      customBadge3:       metafield(namespace: "custom", key: "custom_badge_3")                      { value }
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
