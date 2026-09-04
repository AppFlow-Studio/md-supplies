// READ-ONLY. Builds the authoritative unified legacy-target inventory
// (Workstream A), the fixture file the regression suite runs against
// (Workstream F), and the Izzy exceptions handoff — all from the two Ahrefs
// exports plus the classification decisions made in this ticket (image
// matches verified in image-search-results.json; page targets verified by
// running them through the real proxy() in simulate-current.mts).
//
// Run (after simulate-current.mts and match-images.mts have refreshed their
// output files):
//   npx tsx scripts/seo-migration/build-inventory.mts
import { readFileSync, writeFileSync } from 'fs'

type ReferringPage = { referringUrl: string; anchor: string }
type UnifiedTarget = {
  targetUrl: string
  pathAndQuery: string
  type: string
  sources: string[]
  isSpamAny: boolean
  referringPages: ReferringPage[]
}
type BehaviorResult = { pathAndQuery: string; status?: number; location: string | null }

const DIR = 'docs/audits/2026-09-04-p0-seo-migration-integrity'
const unified = JSON.parse(readFileSync(`${DIR}/unified-targets.json`, 'utf8')) as UnifiedTarget[]
const currentBehavior = JSON.parse(readFileSync(`${DIR}/current-behavior.json`, 'utf8')) as BehaviorResult[]

const behaviorByPath = new Map<string, BehaviorResult>(currentBehavior.map((r) => [r.pathAndQuery, r]))

// Hand classification for the 22 image targets — see the rationale comments
// on the corresponding REDIRECT_ENTRIES rows in proxy.ts for the 410s, and
// docs/audits/2026-09-04-p0-seo-migration-integrity/EXCEPTIONS.md for the
// "needs Izzy review" / "spam, no recovery" set. Kept here as one source of
// truth so the inventory, the exceptions doc, and the test fixtures cannot
// drift from each other.
type ImageDecision = { status: 'preserve-410' | 'preserve-301-image' | 'needs-review' | 'no-recovery-spam'; rationale: string; candidate?: string }
const IMAGE_DECISIONS: Record<string, ImageDecision> = {
  '/sup/images/free-shipping-yellow.png': { status: 'preserve-410', rationale: 'UI badge now rendered as a component (ProductBadges.tsx), not a static image — no equivalent asset exists to serve.' },
  '/sup/images/IIUR93PAQ6.gif': { status: 'no-recovery-spam', rationale: 'Referring domain is a parked/spam page (negroidhaven.com, query-only URL); anchor "Drive medical supplies cheap" has no product-identifying signal.' },
  '/sup/images/JD8EJSY7CV.gif': { status: 'no-recovery-spam', rationale: 'Referring domain is a low-DR spam page (journeyintoindia.com, query-only URL); anchor "Dme supplies discount" has no product-identifying signal.' },
  '/sup/images/productImages/15ULWMDK6A.gif': { status: 'needs-review', rationale: 'Anchor "safety goggles with side shields" has no confident exact-SKU match in the live catalog (search returns bathtub safety rails, not eyewear).', candidate: 'no eye-protection category currently stocked under this name — confirm with Izzy whether one exists' },
  '/sup/images/productImages/3Y3PKD2E6Q.gif': { status: 'preserve-301-image', rationale: 'Category match is unambiguous and low-risk (commodity item): Alcohol Prep Pad. Redirected directly to the live Dukal SKU CDN image (handle alcohol-prep-pad) rather than an HTML page.', candidate: 'https://cdn.shopify.com/s/files/1/0821/0989/0793/files/857-4000.jpg?v=1786100370 (Dukal alcohol-prep-pad)' },
  '/sup/images/productImages/53DADEVYIN.gif': { status: 'needs-review', rationale: 'Anchor "PVC commode chair" — catalog has bariatric/aluminum commode chairs but no plain PVC variant found; material mismatch.', candidate: '/product/bariatric-drop-arm-bedside-commode-chair — unverified' },
  '/sup/images/productImages/5K5N96KZBM.gif': { status: 'no-recovery-spam', rationale: 'Anchor "ladies chef on sale pants" is off-topic (apparel, not medical supplies) — no relevant target exists to invent.' },
  '/sup/images/productImages/7CXML2268H.gif': { status: 'preserve-410', rationale: 'Dynarex Tattoo Needles 1203RL — vendor/product search returns no match; not carried in current catalog.' },
  '/sup/images/productImages/7HQXDFWJ49.gif': { status: 'preserve-410', rationale: 'Dynarex Tattoo Needles 1201RL — vendor/product search returns no match; not carried in current catalog.' },
  '/sup/images/productImages/979PEK3F66.gif': { status: 'needs-review', rationale: 'Anchor "pediatric mobility chair" — catalog has adult commode/transport chairs, no pediatric-specific match found.', candidate: 'none found — confirm with Izzy whether a pediatric mobility line exists' },
  '/sup/images/productImages/FF2KL9HABG.gif': { status: 'needs-review', rationale: 'Anchor "MedPride Hydrogel Wound Dressing Sheet 4x4" — search returns adhesive bandages (Shield Line), not hydrogel dressings or the MedPride vendor; no confident match.', candidate: 'none found — confirm with Izzy whether MedPride hydrogel dressings are still stocked' },
  '/sup/images/productImages/FKJEB33I41.gif': { status: 'preserve-410', rationale: 'Dynarex/FrancGenessa Tattoo Needles 1207RL — vendor/product search returns no match; not carried in current catalog.' },
  '/sup/images/productImages/K8J9ZVU2GY.gif': { status: 'preserve-410', rationale: 'Dynarex Tattoo Needles 1201RL Round Liner — vendor/product search returns no match; not carried in current catalog.' },
  '/sup/images/productImages/MXCUT572QP.gif': { status: 'needs-review', rationale: 'Anchor "synthetic vinyl gloves" — catalog carries nitrile/latex gloves; no vinyl-specific SKU found.', candidate: 'none found — confirm with Izzy whether vinyl gloves are still stocked' },
  '/sup/images/productImages/PREGWANPVK.gif': { status: 'needs-review', rationale: 'Anchor "sterile disposable scalpels" — top search hit (handle qa-min-order-700) looks like a synthetic QA-only fixture product, not a real catalog SKU; unverifiable from this environment.', candidate: 'unverified — re-run against production Storefront API' },
  '/sup/images/productImages/RQZYQP73KJ.gif': { status: 'needs-review', rationale: 'Anchor "pharmaceutical spatula" — no relevant match (search returns sterilization pouches, a foot stool); needs manual catalog check.', candidate: 'none found' },
  '/sup/images/productImages/VLPUK8KBSY.gif': { status: 'preserve-410', rationale: 'Dynarex Tattoo Needles 1209RL Round Liner (referring page is Russian-language, recoverwordfile.org) — vendor/product search returns no match; not carried in current catalog.' },
  '/sup/images/productImages/WEVSAQ14IE.gif': { status: 'preserve-410', rationale: 'Vision Laboratories requisition form — a service/paperwork document, not a stocked product; zero search hits.' },
  '/sup/images/productImages/WRW2B797FM.gif': { status: 'preserve-410', rationale: 'Hospira Lactated Ringers Solution IV bag — injectable pharmaceutical; same DEA/compliance retirement basis as the existing Pharmaceuticals/Injectables 410 entries. No live match.' },
  '/sup/images/productImages/XMP2E37F1N.gif': { status: 'no-recovery-spam', rationale: 'Anchor "tailored chef pants" is off-topic (apparel, not medical supplies) — no relevant target exists to invent.' },
  '/sup/images/productImages/XYZPG89DSJ.gif': { status: 'needs-review', rationale: 'Anchor "USCG type 2 life jacket" — plausible match to Kemp USA Adult Life Jacket products, but compliance-sensitive (USCG Type II approval) so identity should be confirmed by Izzy before redirecting, not assumed from a title-text search.', candidate: '/product/kemp-usa-life-jacket-red-black-adult — plausible, unverified' },
  '/sup/images/productImages/ZTLE7VFV3C.gif': { status: 'preserve-410', rationale: 'Rx Destroyer drug disposal system — vendor/product search returns no relevant match (biohazard bags, pill crusher); not carried in current catalog.' },
}

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function pageTestId(targetUrl: string, source: string) {
  return `${source === 'A:broken-backlinks-2026-04-26' ? 'A' : 'B'}-${fnv1aHex(targetUrl)}`
}

type InventoryRow = {
  exactLegacyUrl: string
  type: string
  referringContext: string | undefined
  anchor: string | undefined
  spamFlag: boolean
  currentResponse: number
  expectedResponse: number
  finalDestination: string
  status: string
  rationale: string
  testCaseId: string
}
type FixtureRow = {
  testCaseId: string
  pathAndQuery: string
  type: string
  expectedStatus: number
  expectedLocationContains: string | null
  passthrough: boolean
  classification?: ImageDecision['status']
}

const inventoryRows: InventoryRow[] = []
const fixtureRows: FixtureRow[] = []

for (const target of unified) {
  const isImage = target.type === 'image'
  const testId = pageTestId(target.targetUrl, target.sources[0])

  if (isImage) {
    const decision = IMAGE_DECISIONS[target.pathAndQuery]
    if (!decision) throw new Error(`No classification decision for image target ${target.pathAndQuery}`)
    const status =
      decision.status === 'preserve-410' ? '410 (intentional retirement)' :
      decision.status === 'preserve-301-image' ? '301 (recovered — resolves to a live image asset)' :
      decision.status === 'no-recovery-spam' ? 'intentional no-recovery (spam/off-topic source)' :
      'Needs Izzy SEO review'
    // proxy() itself only ever returns 410, a 301 (image recovery), or a 200
    // pass-through (a page 404 happens downstream, after proxy() has already
    // let the request through to Next's router) — so the fixture asserts
    // what proxy() actually returns, while the human-readable inventory
    // documents the real-world eventual outcome (404) for anything proxy()
    // does not intercept.
    const proxyStatus = decision.status === 'preserve-410' ? 410 : decision.status === 'preserve-301-image' ? 301 : 200
    const eventualStatus = decision.status === 'preserve-410' ? 410 : decision.status === 'preserve-301-image' ? 301 : 404
    inventoryRows.push({
      exactLegacyUrl: target.targetUrl,
      type: 'image',
      referringContext: target.referringPages[0]?.referringUrl,
      anchor: target.referringPages[0]?.anchor,
      spamFlag: target.isSpamAny,
      currentResponse: eventualStatus,
      expectedResponse: eventualStatus,
      finalDestination: decision.candidate ?? 'n/a',
      status,
      rationale: decision.rationale,
      testCaseId: testId,
    })
    fixtureRows.push({
      testCaseId: testId,
      pathAndQuery: target.pathAndQuery,
      type: 'image',
      expectedStatus: proxyStatus,
      expectedLocationContains: decision.status === 'preserve-301-image' ? 'cdn.shopify.com' : null,
      passthrough: proxyStatus === 200,
      classification: decision.status,
    })
    continue
  }

  const behavior = behaviorByPath.get(target.pathAndQuery)
  if (!behavior) throw new Error(`No simulated behavior for page target ${target.pathAndQuery}`)
  const expectedStatus = behavior.status ?? 200
  inventoryRows.push({
    exactLegacyUrl: target.targetUrl,
    type: target.type,
    referringContext: target.referringPages[0]?.referringUrl,
    anchor: target.referringPages[0]?.anchor,
    spamFlag: target.isSpamAny,
    currentResponse: expectedStatus,
    expectedResponse: expectedStatus,
    finalDestination: behavior.location ?? (target.pathAndQuery === '/' ? '(homepage, no redirect needed)' : 'n/a'),
    status: expectedStatus === 301 ? '301' : expectedStatus === 410 ? '410' : 'pass-through (200, already canonical or homepage)',
    rationale: expectedStatus === 301 ? 'Recovered via T4 baseline REDIRECT_ENTRIES' : expectedStatus === 410 ? 'Intentional removal (DEA/compliance or non-inventory vendor)' : 'Homepage — no action needed',
    testCaseId: testId,
  })
  fixtureRows.push({
    testCaseId: testId,
    pathAndQuery: target.pathAndQuery,
    type: target.type,
    expectedStatus,
    expectedLocationContains: behavior.location ? new URL(behavior.location).pathname : null,
    passthrough: expectedStatus === 200,
  })
}

writeFileSync(`${DIR}/unified-inventory.json`, JSON.stringify(inventoryRows, null, 2))
writeFileSync('__tests__/fixtures/seo-migration-targets.json', JSON.stringify(fixtureRows, null, 2))

// Markdown inventory (Workstream A required artifact)
const header = '| Legacy URL | Type | Spam? | Current | Expected | Destination | Status | Rationale | Test ID |\n|---|---|---|---|---|---|---|---|---|\n'
const md = header + inventoryRows.map(r =>
  `| \`${r.exactLegacyUrl}\` | ${r.type} | ${r.spamFlag} | ${r.currentResponse} | ${r.expectedResponse} | ${r.finalDestination} | ${r.status} | ${r.rationale} | ${r.testCaseId} |`
).join('\n')
writeFileSync(`${DIR}/unified-inventory.md`, md + '\n')

console.log('Rows:', inventoryRows.length, '| Fixtures:', fixtureRows.length)
console.log('Wrote unified-inventory.json, unified-inventory.md, __tests__/fixtures/seo-migration-targets.json')
