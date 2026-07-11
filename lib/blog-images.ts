import type { BlogArticleSummary, ProductImage } from '@/lib/shopify/types'
import { getBlogImagePath } from '@/lib/bunnycdn'

/**
 * Curated hero images for blog articles, stored on BunnyCDN under `blogs/`.
 * Shopify articles currently have no featured image, so these fill the gap;
 * if an article ever gets an image in Shopify, that one wins (see withBlogImage).
 */

// All blog hero images were produced at the same size.
const BLOG_IMAGE_WIDTH = 2752
const BLOG_IMAGE_HEIGHT = 1536

const BLOG_IMAGE_FILES: Record<string, string> = {
  'understanding-surgical-sutures-types-uses-and-characteristics': 'surgical-sutures.jpeg',
  'what-to-do-when-you-dont-want-to-vaccinate-your-child': 'vaccinate-your-kid.jpeg',
  'back-to-school-immunization-requirements-ensuring-a-healthy-school-year': 'school-immunization.jpeg',
  'urgent-care-startup-checklist': 'urgent-care-startup.jpeg',
  'mens-health-a-comprehensive-guide-to-well-being': 'mens-health.jpeg',
  'the-evolution-and-benefits-of-lightweight-walkers': 'lightweight-walkers.jpeg',
  'hormone-pellets-a-comprehensive-overview': 'hormone-pellets-overview.jpeg',
  'understanding-respiratory-syncytial-virus-rsv-how-to-know-if-you-have-rsv-rsv-symptoms-prevention-tips': 'understanding-rsv.jpeg',
  'hepatitis-awareness-understanding-the-impact-and-prevention-of-liver-inflammation': 'hepatitis-awareness.jpeg',
  'comprehensive-bariatric-solutions-obesity-treatment-supportive-care-and-medication': 'comprehensive-bariatric-solutions.jpeg',
  'understanding-hiv': 'understanding-hiv.jpeg',
  'a-guide-to-digestive-health': 'digestive-health-guide.jpeg',
  'tips-for-managing-your-weight': 'tips-for-weight-management.jpeg',
  'a-step-forward-your-guide-to-the-best-medical-walking-boots-for-injury-recovery': 'medical-walking-boots.jpeg',
  'everything-you-need-to-know-about-influenza-a-b-tests': 'influenza-a-b-tests.jpeg',
  'clia-waived-flu-covid-combo-tests-2024': 'flu-and-covid-combo-tests.jpeg',
  'luer-lock-vs-luer-slip-syringes-what-s-the-difference-which-should-you-choose': 'luer-lock-vs-slip-syringes.jpeg',
  'where-to-buy-bulk-donation-items-online-for-occ-shoeboxes-women-s-shelters-more': 'bulk-donation-items.jpeg',
  'ready-to-open-an-urgent-care-clinic-here-s-the-full-medical-supply-checklist-you-ll-need': 'ready-to-open-urgent-care.jpeg',
  'best-trocar-kits-for-hormone-pellet-therapy-fast-us-shipping-for-hrt-clinics': 'best-trocar-kits-for-hpt.jpeg',
}

/** CDN hero image for an article handle, shaped like a Shopify ProductImage. */
export function getBlogImage(handle: string, title?: string): ProductImage | null {
  const file = BLOG_IMAGE_FILES[handle]
  if (!file) return null
  return {
    id: `blog-image-${handle}`,
    url: getBlogImagePath(file),
    altText: title ?? null,
    width: BLOG_IMAGE_WIDTH,
    height: BLOG_IMAGE_HEIGHT,
  }
}

/** Fills in the CDN hero image on articles that have none in Shopify. */
export function withBlogImage<T extends Pick<BlogArticleSummary, 'handle' | 'title' | 'image'>>(
  article: T,
): T {
  if (article.image) return article
  return { ...article, image: getBlogImage(article.handle, article.title) }
}
