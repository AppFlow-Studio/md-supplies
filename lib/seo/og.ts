import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
} from './constants'
import type { PageType } from './types'

function ogType(pageType: PageType): 'website' | 'article' {
  if (pageType === 'blog-article') return 'article'
  return 'website'
}

interface OgInput {
  pageType: PageType
  title: string
  description: string
  url: string
  image?: string
}

/**
 * Builds the `openGraph` and `twitter` sections for a Next.js Metadata object.
 * The OG image slot is always populated — falls back to the default site OG image.
 */
export function buildOg(input: OgInput) {
  const { pageType, title, description, url, image } = input
  const imageUrl = image?.trim() || DEFAULT_OG_IMAGE

  return {
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: imageUrl, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: title }],
      type: ogType(pageType),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [imageUrl],
    },
  }
}
