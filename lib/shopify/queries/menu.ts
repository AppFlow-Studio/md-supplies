export const GET_MENU = `#graphql
  query GetMenu($handle: String = "main-menu") {
    menu(handle: $handle) {
      id
      title
      items {
        title
        url
        type
        tags
        id title type url tags
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
