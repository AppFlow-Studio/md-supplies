import { safeJsonLd } from '@/lib/safe-json-ld'

interface Props {
  name: string
  description: string
  url: string
}

export function WebPageSchema({ name, description, url }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
