import { safeJsonLd } from '@/lib/safe-json-ld'
import { getNonce } from '@/lib/csp-nonce'

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

export async function BlogPostingSchema({
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
  const nonce = await getNonce()
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
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
