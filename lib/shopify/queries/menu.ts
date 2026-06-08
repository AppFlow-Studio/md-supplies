export const GET_MENU = `#graphql
  query GetMenu($handle: String!) {
    menu(handle: $handle) {
      id
      title
      items {
        id
        title
        url
        type
        tags
        items {
          id
          title
          url
          type
          tags
          items {
            id
            title
            url
          }
        }
      }
    }
  }
`;
