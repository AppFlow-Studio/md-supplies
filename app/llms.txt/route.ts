import { SITE_URL } from '@/lib/seo/constants'

// llms.txt — a curated, machine-readable map of the site for LLM crawlers
// (https://llmstxt.org). Closeout §12.2. Lists the canonical hub pages only;
// product/category/blog detail URLs live in sitemap.xml.
export async function GET(): Promise<Response> {
  const body = `# MDSupplies

> MDSupplies.com is a medical supply ecommerce company serving clinics, urgent care centers, HRT practices, home care agencies, and customers nationwide.

## Shop
- [All Categories](${SITE_URL}/categories): Browse every product category.
- [Industries](${SITE_URL}/industries): Medical supplies organized by facility type.
- [Partners](${SITE_URL}/partners): Brands and manufacturers we carry.
- [OCC / Charity Program](${SITE_URL}/solutions/occ): Operation Christmas Child and charity sourcing.

## Company
- [About](${SITE_URL}/about): Who we are and how we work.
- [Blog](${SITE_URL}/blog): Buying guides and clinical product education.
- [Contact](${SITE_URL}/contact): Get in touch with our team.
- [FAQ](${SITE_URL}/faq): Common ordering, shipping, and account questions.
- [Returns](${SITE_URL}/returns): Return policy and process.

## Data
- [Sitemap](${SITE_URL}/sitemap.xml): Full list of indexable URLs.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
