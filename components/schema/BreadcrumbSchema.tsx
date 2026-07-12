import { safeJsonLd } from '@/lib/safe-json-ld'
import { getNonce } from '@/lib/csp-nonce'

interface BreadcrumbItem {
  name: string
  item: string
}

interface Props {
  items: BreadcrumbItem[]
}

export async function BreadcrumbSchema({ items }: Props) {
  const nonce = await getNonce()
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  }
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
