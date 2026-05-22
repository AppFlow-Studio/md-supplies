// Customer Account API queries — uses customerFetch() from lib/shopify/customer.ts

export const GET_CUSTOMER = `#graphql
  query GetCustomer {
    customer {
      id
      firstName
      lastName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
      defaultAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
        phoneNumber
      }
    }
  }
`;

export const GET_CUSTOMER_ORDERS = `#graphql
  query GetCustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          number
          processedAt
          financialStatus
          fulfillmentStatus
          totalPrice { amount currencyCode }
          lineItems(first: 5) {
            nodes {
              title
              quantity
              variant {
                id
                title
                price { amount currencyCode }
                image { id url altText width height }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export const GET_ORDER = `#graphql
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      number
      processedAt
      financialStatus
      fulfillmentStatus
      totalPrice { amount currencyCode }
      subtotalPrice { amount currencyCode }
      totalShippingPrice { amount currencyCode }
      totalTax { amount currencyCode }
      shippingAddress {
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
      }
      lineItems(first: 50) {
        nodes {
          title
          quantity
          originalTotalPrice { amount currencyCode }
          variant {
            id
            title
            price { amount currencyCode }
            selectedOptions { name value }
            image { id url altText width height }
          }
        }
      }
      fulfillments(first: 5) {
        trackingCompany
        trackingInfo { number url }
      }
    }
  }
`;

export const GET_CUSTOMER_ADDRESSES = `#graphql
  query GetCustomerAddresses($first: Int!) {
    customer {
      addresses(first: $first) {
        nodes {
          id
          firstName
          lastName
          address1
          address2
          city
          province
          country
          zip
          phoneNumber
        }
      }
    }
  }
`;
