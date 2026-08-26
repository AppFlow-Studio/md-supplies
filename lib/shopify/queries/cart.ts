const CART_FRAGMENT = `#graphql
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    attributes { key value }
    buyerIdentity {
      customer { id }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            sku
            # The variant's own unit price, distinct from this line's cost
            # below: a no-rate-for-destination line still carries a positive
            # price here even though its cost.totalAmount is zeroed out. This
            # is what lets the cart tell a genuinely unpriced product apart
            # from a priced one Shopify simply can't ship (DEV-LAUNCH-09).
            price { amount currencyCode }
            selectedOptions { name value }
            product {
              id
              title
              handle
              vendor
              tags
              # RX detection reads the tag AND the store's own declaration:
              # the tag set is a strict subset of this metafield (40 active
              # prescription products carry the metafield but no tag).
              # See lib/rx-gate.ts and the 2026-08-02 catalog audit.
              isRxOnly: metafield(namespace: "custom", key: "is_rx_only") { value }
              # DEV-LABEL-01: single backorder source, shared with the card/PDP.
              # DEV-SHIP-04: ETA fields are compatibility/live-theme only —
              # never displayed. custom.backorder alone triggers the label.
              estimatedRestockDate: metafield(namespace: "custom", key: "estimated_back_order_restock_date") { value }
              backorderRestockEta: metafield(namespace: "custom", key: "backorder_restock_eta") { value }
              backorder: metafield(namespace: "custom", key: "backorder") { value }
              # DEV-SHIP-02: merchant-controlled gate for the Free Shipping
              # badge, ANDed with the shipping resolver's confirmation before
              # attachCartShippingDisplay attaches the line's shippingDisplay.
              freeShipping: metafield(namespace: "custom", key: "free_shipping") { value }
              images(first: 1) {
                nodes { id url altText width height }
              }
            }
          }
        }
        cost {
          totalAmount { amount currencyCode }
        }
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
    }
  }
`;

export const CREATE_CART = `#graphql
  ${CART_FRAGMENT}
  mutation CreateCart($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const ADD_CART_LINES = `#graphql
  ${CART_FRAGMENT}
  mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const UPDATE_CART_LINES = `#graphql
  ${CART_FRAGMENT}
  mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const REMOVE_CART_LINES = `#graphql
  ${CART_FRAGMENT}
  mutation RemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const GET_CART = `#graphql
  ${CART_FRAGMENT}
  query GetCart($cartId: ID!) {
    cart(id: $cartId) { ...CartFields }
  }
`;

// RX gate prerequisite: associates the signed-in customer with the cart so
// the checkout (and the future validation-app enforcement) can read the
// customer's compliance metafields. MUST run before every checkout handoff.
export const CART_BUYER_IDENTITY_UPDATE = `#graphql
  ${CART_FRAGMENT}
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const SET_CART_ATTRIBUTES = `#graphql
  ${CART_FRAGMENT}
  mutation SetCartAttributes($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;
