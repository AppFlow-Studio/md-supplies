import { safeJsonLd } from '@/lib/safe-json-ld'
import { getNonce } from '@/lib/csp-nonce'
import { buildBreadcrumbListSchema } from '@/lib/schema/breadcrumb'

interface BreadcrumbItem {
  label: string
  /** Root-relative path (e.g. `/blog`). Omit on the final crumb. */
  href?: string
}

interface Props {
  /** Crumbs after Home — the builder prepends Home itself. */
  items: BreadcrumbItem[]
  /** Absolute URL of the current page, used as the final crumb's `item`. */
  currentUrl?: string
}

export async function BreadcrumbSchema({ items, currentUrl }: Props) {
  const nonce = await getNonce()
  const schema = buildBreadcrumbListSchema(items, currentUrl)
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
