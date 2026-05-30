export const GET_BLOGS_WITH_ARTICLES = `#graphql
  query GetBlogsWithArticles($first: Int = 20) {
    blogs(first: 5) {
      nodes {
        handle
        title
        articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
          nodes {
            id
            handle
            title
            excerpt
            publishedAt
            author { name }
            image { id url altText width height }
            tags
          }
        }
      }
    }
  }
`

export const GET_ARTICLE = `#graphql
  query GetArticle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      handle
      title
      articleByHandle(handle: $articleHandle) {
        id
        handle
        title
        contentHtml
        excerpt
        publishedAt
        author { name }
        image { url altText width height }
        tags
      }
    }
  }
`

export const GET_ALL_ARTICLE_HANDLES = `#graphql
  query GetAllArticleHandles {
    blogs(first: 10) {
      nodes {
        handle
        articles(first: 50) {
          nodes { handle }
        }
      }
    }
  }
`

export const GET_BLOG_HANDLES = `#graphql
  query GetBlogHandles {
    blogs(first: 10) {
      nodes { handle }
    }
  }
`
