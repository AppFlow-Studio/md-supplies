import { SITE_URL } from '@/lib/seo/constants'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function buildBreadcrumbListSchema(
  items: BreadcrumbItem[],
  currentUrl?: string,
) {
  const allItems: BreadcrumbItem[] = [{ label: 'Home', href: '/' }, ...items]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, i) => {
      const isLast = i === allItems.length - 1
      const itemUrl = item.href
        ? `${SITE_URL}${item.href}`
        : isLast && currentUrl
          ? currentUrl
          : undefined

      return {
        '@type': 'ListItem',
        position: i + 1,
        name: item.label,
        ...(itemUrl !== undefined ? { item: itemUrl } : {}),
      }
    }),
  }
}
