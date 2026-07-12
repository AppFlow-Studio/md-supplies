import { safeJsonLd } from '@/lib/safe-json-ld'
import { buildBreadcrumbListSchema } from '@/lib/schema'

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

/**
 * The single JSON-LD breadcrumb emitter: a thin <script> wrapper around
 * lib/schema's `buildBreadcrumbListSchema`, so every page emits a
 * structurally identical BreadcrumbList (audit I2 consolidated the two
 * divergent builders into this one).
 */
export function BreadcrumbSchema({ items, currentUrl }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLd(buildBreadcrumbListSchema(items, currentUrl)),
      }}
    />
  )
}
