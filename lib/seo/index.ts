export { buildMetadata } from './metadata'
export { buildCanonical } from './canonical'
export { buildRobots, STAGING_GUARD } from './robots'
export { buildOg } from './og'
export { getSitemapUrls } from './sitemap'
export { getRobotsConfig } from './robots-config'
export { trimDescription } from './text'
export type {
  PageType,
  MetadataInput,
  CanonicalInput,
  CanonicalStrategy,
  RobotsInput,
} from './types'

// SEO database helpers
export { getCategorySeo, getSubcategorySeo } from './categorySeo'
export { getIndustrySeo } from './industrySeo'
export { getPartnerSeo } from './partnerSeo'
export { getSolutionSeo } from './solutionSeo'
export { getBlogSeo } from './blogSeo'
export type { PageSEO, FAQItem, ContentSection } from './seoTypes'
export type { IndustrySeoOverride } from './industrySeo'
export type { PartnerSeoData } from './partnerSeo'
export type { SolutionSeoData } from './solutionSeo'
export type { BlogSeoData } from './blogSeo'
