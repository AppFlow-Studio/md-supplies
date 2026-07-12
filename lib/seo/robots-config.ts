import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { STAGING_GUARD } from './robots'

/**
 * Returns the robots.txt configuration for the site.
 *
 * Required environment variables (set in deployment, not in .env.local):
 *  - NEXT_PUBLIC_SITE_URL=https://mdsupplies.com  (canonical production domain)
 *  - NEXT_PUBLIC_IS_STAGING=true                   (staging deployments only — forces noindex)
 */
// /category-browse/ is the internal dynamic twin of /category/ (proxy
// rewrite target for ?sort/filter/page) — never crawled directly.
// /search is deliberately NOT listed: it is noindex,follow via its page
// metadata (pageType 'utility'), and a robots disallow would both conflict
// with that (crawlers can't see the noindex) and be redundant (audit L19).
const DISALLOWED_PATHS = ['/api/', '/account/', '/cart', '/internal/', '/b2b', '/category-browse/']

// Explicit AI-crawler posture (audit L5): these bots are ALLOWED, under the
// same path restrictions as everyone else. Being explicit documents the
// decision — product/category content is deliberately exposed to AI answer
// engines as a discovery channel.
const ALLOWED_AI_CRAWLERS = [
  'GPTBot',             // OpenAI training
  'ChatGPT-User',       // OpenAI on-demand user fetches
  'OAI-SearchBot',      // OpenAI search index
  'ClaudeBot',          // Anthropic training
  'Claude-User',        // Anthropic on-demand user fetches
  'Claude-SearchBot',   // Anthropic search index
  'PerplexityBot',      // Perplexity index
  'Perplexity-User',    // Perplexity on-demand user fetches
  'Google-Extended',    // Gemini training opt-in token
  'Applebot-Extended',  // Apple AI training opt-in token
  'CCBot',              // Common Crawl (feeds most open-web training sets)
  'meta-externalagent', // Meta AI training
]

export function getRobotsConfig(isStaging: boolean = STAGING_GUARD): MetadataRoute.Robots {
  if (isStaging) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ALLOWED_AI_CRAWLERS,
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      // Bytespider (ByteDance) ignores crawl-rate conventions and hammers
      // catalogs; no discovery upside — blocked outright.
      {
        userAgent: 'Bytespider',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
