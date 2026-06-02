interface Props {
  title: string
  description: string
  url: string
  featuredImage: string
  publishedAt: string
  modifiedAt?: string
  authorName: string
  publisherName: string
  publisherLogo: string
}

export function BlogPostingSchema({
  title,
  description,
  url,
  featuredImage,
  publishedAt,
  modifiedAt,
  authorName,
  publisherName,
  publisherLogo,
}: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    image: featuredImage,
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogo,
      },
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
