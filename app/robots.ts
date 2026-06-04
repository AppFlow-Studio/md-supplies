import type { MetadataRoute } from 'next'
import { getRobotsConfig } from '@/lib/seo/robots-config'

export default function robots(): MetadataRoute.Robots {
  return getRobotsConfig()
}
