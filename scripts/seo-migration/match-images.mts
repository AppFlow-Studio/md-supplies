// READ-ONLY. For each historic image target, search the LIVE Shopify catalog
// (QA store, per .env) by keywords pulled from the referring anchor/context
// text, and record candidate product matches (title, handle, featured image
// URL) for manual classification (Case 1/2/3/4). No writes to the store.
//
// Run: NODE_OPTIONS='--conditions=react-server' npx tsx scripts/seo-migration/match-images.mts
import 'server-only'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

import { readFileSync, writeFileSync } from 'fs'
import { storefrontFetch } from '../../lib/shopify/storefront'
import { SEARCH_PRODUCTS } from '../../lib/shopify/queries/search'

type UnifiedTarget = { pathAndQuery: string; type: string }
type ProductNode = {
  title: string
  handle: string
  vendor: string
  availableForSale: boolean
  featuredImage?: { url: string } | null
  images?: { nodes: { url: string }[] } | null
}
type SearchResponse = { search?: { nodes?: ProductNode[] } }
type Candidate = { title: string; handle: string; vendor: string; availableForSale: boolean; image: string | null }

const AUDIT_DIR = 'docs/audits/2026-09-04-p0-seo-migration-integrity'
const data = JSON.parse(readFileSync(`${AUDIT_DIR}/unified-targets.json`, 'utf8')) as UnifiedTarget[]
const images = data.filter((d) => d.type === 'image')

// Hand-picked search terms per image target, derived from anchor/context text
// (the only signal tying a legacy filename to a product identity).
const QUERY_OVERRIDES: Record<string, string> = {
  '/sup/images/free-shipping-yellow.png': '', // site-wide UI badge, not a product — skip search
  '/sup/images/IIUR93PAQ6.gif': '', // generic "Drive medical supplies cheap" — no product-specific signal
  '/sup/images/JD8EJSY7CV.gif': '', // generic "Dme supplies discount" — no product-specific signal
  '/sup/images/productImages/15ULWMDK6A.gif': 'safety goggles side shields',
  '/sup/images/productImages/3Y3PKD2E6Q.gif': 'alcohol prep pads',
  '/sup/images/productImages/53DADEVYIN.gif': 'PVC commode chair',
  '/sup/images/productImages/5K5N96KZBM.gif': '', // "ladies chef pants" — off-topic, not medical
  '/sup/images/productImages/7CXML2268H.gif': 'Dynarex tattoo needle 1203RL',
  '/sup/images/productImages/7HQXDFWJ49.gif': 'Dynarex tattoo needle 1201RL',
  '/sup/images/productImages/979PEK3F66.gif': 'pediatric mobility chair',
  '/sup/images/productImages/FF2KL9HABG.gif': 'MedPride hydrogel wound dressing',
  '/sup/images/productImages/FKJEB33I41.gif': 'Dynarex tattoo needle 1207RL',
  '/sup/images/productImages/K8J9ZVU2GY.gif': 'Dynarex tattoo needle 1201RL round liner',
  '/sup/images/productImages/MXCUT572QP.gif': 'vinyl gloves',
  '/sup/images/productImages/PREGWANPVK.gif': 'disposable scalpels',
  '/sup/images/productImages/RQZYQP73KJ.gif': 'pharmaceutical spatula',
  '/sup/images/productImages/VLPUK8KBSY.gif': 'Dynarex tattoo needle 1209RL round liner',
  '/sup/images/productImages/WEVSAQ14IE.gif': 'requisition form',
  '/sup/images/productImages/WRW2B797FM.gif': 'lactated ringers IV bag',
  '/sup/images/productImages/XMP2E37F1N.gif': '', // "tailored chef pants" — off-topic, not medical
  '/sup/images/productImages/XYZPG89DSJ.gif': 'life jacket',
  '/sup/images/productImages/ZTLE7VFV3C.gif': 'Rx Destroyer drug disposal',
}

async function search(query: string): Promise<Candidate[]> {
  if (!query) return []
  const result = await storefrontFetch<SearchResponse>(SEARCH_PRODUCTS, { query, first: 5, after: null }, { cache: 'no-store' })
  return (result.search?.nodes ?? []).map((n) => ({
    title: n.title,
    handle: n.handle,
    vendor: n.vendor,
    availableForSale: n.availableForSale,
    image: n.featuredImage?.url ?? n.images?.nodes?.[0]?.url ?? null,
  }))
}

async function main() {
  const results: { pathAndQuery: string; query: string | undefined; candidates: Candidate[]; error?: string }[] = []
  for (const img of images) {
    const q = QUERY_OVERRIDES[img.pathAndQuery]
    let candidates: Candidate[] = []
    let error: string | undefined
    try {
      candidates = await search(q ?? '')
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
    results.push({ pathAndQuery: img.pathAndQuery, query: q, candidates, error })
    console.log(img.pathAndQuery, '| query:', JSON.stringify(q), '| hits:', candidates.length)
    for (const c of candidates) console.log('   ->', c.title, '|', c.handle, '| vendor:', c.vendor, '| avail:', c.availableForSale)
  }
  writeFileSync(`${AUDIT_DIR}/image-search-results.json`, JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
