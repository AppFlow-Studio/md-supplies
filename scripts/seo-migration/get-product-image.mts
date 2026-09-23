// READ-ONLY. Fetches the live featured image URL for a given product handle
// (QA store, per .env) so a confident Case-1/2 image recovery can point at a
// real, current asset URL rather than a guessed one.
//
// Run: NODE_OPTIONS='--conditions=react-server' npx tsx scripts/seo-migration/get-product-image.mts <handle>
import 'server-only'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

import { storefrontFetch } from '../../lib/shopify/storefront'

const QUERY = `#graphql
  query ProductImage($handle: String!) {
    product(handle: $handle) {
      title
      handle
      vendor
      featuredImage { url altText width height }
      images(first: 3) { nodes { url altText } }
    }
  }
`

type Response = {
  product: {
    title: string
    handle: string
    vendor: string
    featuredImage: { url: string; altText: string | null; width: number; height: number } | null
    images: { nodes: { url: string; altText: string | null }[] }
  } | null
}

const handle = process.argv[2]
if (!handle) {
  console.error('Usage: get-product-image.mts <handle>')
  process.exit(1)
}

const result = await storefrontFetch<Response>(QUERY, { handle }, { cache: 'no-store' })
console.log(JSON.stringify(result, null, 2))
