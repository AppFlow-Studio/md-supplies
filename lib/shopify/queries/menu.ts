export const GET_MENU = `#graphql
  query GetMenu($handle: String = "main-menu") {
    menu(handle: $handle) {
      id title
      items {
        id title type url tags
        items {
          id title type url
          items { id title url }
        }
      }
    }
  }
`
