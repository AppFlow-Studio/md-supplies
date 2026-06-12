export { buildMetadata } from './metadata'
export { buildCanonical } from './canonical'
export { buildRobots, STAGING_GUARD } from './robots'
export { buildOg } from './og'
export { getSitemapUrls } from './sitemap'
export { getRobotsConfig } from './robots-config'
export type {
  PageType,
  MetadataInput,
  CanonicalInput,
  CanonicalStrategy,
  RobotsInput,
} from './types'
