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

// Summary list for the dashboard / orders table. No line items — none of the list
// views render them (the detail page fetches its own full data below).
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
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

// Full order detail. The Customer Account API has no root `order(id:)` query, so we
// fetch through the customer's orders connection and match by number in the page.
// Field shapes follow the Customer Account API schema (flat LineItem, `subtotal` /
// `totalShipping`, `fulfillments` connection with `trackingInformation`).
export const GET_ORDER_DETAILS = `#graphql
  query GetOrderDetails($first: Int!) {
    customer {
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          number
          processedAt
          financialStatus
          fulfillmentStatus
          totalPrice { amount currencyCode }
          subtotal { amount currencyCode }
          totalShipping { amount currencyCode }
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
              sku
              variantTitle
              image { url altText }
              price { amount currencyCode }
              totalPrice { amount currencyCode }
            }
          }
          fulfillments(first: 5) {
            nodes {
              trackingInformation {
                company
                number
                url
              }
            }
          }
        }
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
