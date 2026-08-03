#!/usr/bin/env node
/**
 * DRY RUN ONLY — plans the tag→metaobject industry migration (Phase 8).
 * Performs NO Shopify writes and makes NO Shopify calls at all.
 *
 *   node scripts/industries-mapping-dryrun.mjs <catalog-full.csv> [--out <dir>]
 *
 * WHY THIS IS CSV-ONLY
 * The label tool resolves handles live because its input is a hand-authored
 * mapping. Here the input IS a full catalog export, which already carries the
 * authoritative product_id AND handle for every row — so resolving anything
 * over the network would add a production dependency and a rate-limit risk
 * while providing no identity we do not already hold. Read-only stays trivially
 * true.
 *
 * IDENTITY RULE (same as the label tool)
 *   product_id (GID or numeric) is the identity. `handle` is carried for human
 *   review only. SKU is NEVER an identity — the 2026-08-02 audit found 3,166
 *   SKUs spanning more than one product.
 *
 * WHAT IT DECIDES
 *   Only the SIX `industry:` values that actually exist on active products map
 *   to a proposed `industry` metaobject. Everything else is reported, never
 *   guessed. An industry page with no approved tag gets NO products invented
 *   for it — that is the whole point of the exercise.
 *
 * OUTPUTS (written to --out, applied to nothing)
 *   industry-current-to-proposed.csv  per-product current tags → proposed refs
 *   industry-affected-products.csv    one row per (industry, product) pair
 *   industry-rollback.json            each product's CURRENT industry tags
 *   industry-unmapped.csv             industry-ish tags with no approved target
 *   industry-summary.md               counts + the decisions a human must make
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [, , inputPath, ...rest] = process.argv
if (!inputPath) {
  console.error('Usage: node scripts/industries-mapping-dryrun.mjs <catalog-full.csv> [--out <dir>]')
  process.exit(2)
}
const outIdx = rest.indexOf('--out')
const OUT_DIR = outIdx >= 0 ? rest[outIdx + 1] : 'docs/audits/2026-08-02-catalog-cro'
mkdirSync(OUT_DIR, { recursive: true })

/**
 * The ONLY approved tag→metaobject mappings.
 *
 * Grounded in the July-7 export: these six are the complete set of `industry:`
 * values present on ACTIVE products. `occ-charities` deliberately has no
 * industry page — it is served by /solutions/occ as a category, so mapping it
 * to an industry metaobject would create a second competing OCC surface.
 *
 * Adding a row here is a product decision, not a code decision.
 */
const APPROVED = {
  'industry:urgent-care': 'urgent-care',
  'industry:hrt-surgery': 'hrt-clinics',
  'industry:home-care': 'home-health',
  'industry:clinic': 'clinics-doctors-offices',
  'industry:pharmacy': 'pharmacies',
  'industry:occ-charities': null, // intentionally NOT an industry page
}

/**
 * Industry pages that exist in the route table but have NO approved product
 * membership. Listed explicitly so the output states them as decisions
 * awaiting a human rather than silently omitting them.
 */
const UNBACKED_PAGES = [
  'ems', 'long-term-care', 'physical-therapy',
  'private-practice', 'dental', 'veterinary', 'community-health',
]

/** Minimal RFC4180-ish CSV parser (quoted fields, embedded commas/newlines). */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

function csvEscape(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const writeCsv = (path, header, rows) =>
  writeFileSync(path, [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n')

// ── Load ────────────────────────────────────────────────────────────────────
const rows = parseCsv(readFileSync(inputPath, 'utf8').replace(/^﻿/, ''))
const header = rows[0].map((h) => h.trim())
const col = (name) => header.indexOf(name)
for (const required of ['product_id', 'handle', 'status', 'tags']) {
  if (col(required) < 0) {
    console.error(`Input is missing the required column "${required}".`)
    process.exit(2)
  }
}

// The export is variant-level: collapse to unique products before counting, or
// every count is inflated by variant multiplicity.
const products = new Map()
for (const r of rows.slice(1)) {
  if (!r[col('product_id')]) continue
  const id = r[col('product_id')].trim()
  if (products.has(id)) continue
  products.set(id, {
    id,
    handle: r[col('handle')].trim(),
    status: r[col('status')].trim().toLowerCase(),
    tags: r[col('tags')].split(',').map((t) => t.trim()).filter(Boolean),
  })
}

// ── Plan ────────────────────────────────────────────────────────────────────
const proposed = []      // current-to-proposed, one row per product
const affected = []      // one row per (industry, product)
const rollback = {}      // product id → CURRENT industry tags (restore source)
const unmapped = new Map() // industry-ish tag → count
const perIndustry = new Map()

for (const p of products.values()) {
  const industryTags = p.tags.filter((t) => t.toLowerCase().startsWith('industry:'))
  if (industryTags.length === 0) continue

  // Rollback is recorded for EVERY product the migration would touch,
  // including inactive ones, so a restore is never partial.
  rollback[p.id] = { handle: p.handle, status: p.status, industryTags }

  const refs = []
  for (const tag of industryTags) {
    const key = tag.toLowerCase()
    if (!(key in APPROVED)) {
      unmapped.set(key, (unmapped.get(key) ?? 0) + 1)
      continue
    }
    const target = APPROVED[key]
    if (target === null) continue // approved, but deliberately not an industry page
    refs.push(target)
    if (p.status === 'active') {
      perIndustry.set(target, (perIndustry.get(target) ?? 0) + 1)
      affected.push([target, p.id, p.handle, tag])
    }
  }

  proposed.push([
    p.id,
    p.handle,
    p.status,
    industryTags.join('|'),
    [...new Set(refs)].join('|'),
    refs.length ? 'map' : 'no-approved-target',
  ])
}

// ── Write ───────────────────────────────────────────────────────────────────
writeCsv(
  join(OUT_DIR, 'industry-current-to-proposed.csv'),
  ['product_id', 'handle', 'status', 'current_industry_tags', 'proposed_industry_refs', 'decision'],
  proposed,
)
writeCsv(
  join(OUT_DIR, 'industry-affected-products.csv'),
  ['industry', 'product_id', 'handle', 'source_tag'],
  affected,
)
writeCsv(
  join(OUT_DIR, 'industry-unmapped.csv'),
  ['industry_tag', 'product_count', 'note'],
  [...unmapped.entries()].map(([t, c]) => [t, c, 'no approved industry metaobject — requires a client decision']),
)
writeFileSync(
  join(OUT_DIR, 'industry-rollback.json'),
  JSON.stringify(
    { generatedFrom: inputPath, generatedAt: new Date().toISOString(), note:
      'CURRENT industry: tags per product, captured BEFORE any migration. Restore source if the metaobject migration is ever applied and must be reverted.',
      products: rollback },
    null, 2,
  ) + '\n',
)

const lines = []
lines.push('# Industry migration — DRY RUN (no writes performed)\n')
lines.push(`Source: \`${inputPath}\`  `)
lines.push(`Unique products: **${products.size.toLocaleString()}**  `)
lines.push(`Products carrying ≥1 \`industry:\` tag: **${Object.keys(rollback).length.toLocaleString()}**\n`)
lines.push('## Proposed ACTIVE membership per industry metaobject\n')
lines.push('| Industry metaobject | Active products | Source tag |')
lines.push('|---|---:|---|')
for (const [tag, target] of Object.entries(APPROVED)) {
  if (target === null) continue
  lines.push(`| \`${target}\` | ${(perIndustry.get(target) ?? 0).toLocaleString()} | \`${tag}\` |`)
}
lines.push('\nCounts OVERLAP — a product may belong to several industries.\n')
lines.push('## Deliberately not migrated\n')
lines.push('- `industry:occ-charities` — served by `/solutions/occ` as a category. Mapping it to an industry metaobject would create a second competing OCC surface.\n')
lines.push('## Industry pages with NO approved product membership\n')
lines.push('These have no `industry:` tag in the export. They are NOT given products here — inventing membership is the failure mode this migration exists to prevent.\n')
for (const s of UNBACKED_PAGES) lines.push(`- \`${s}\` — requires a client decision (create a real assortment, or retire the page)`)
lines.push('')
if (unmapped.size) {
  lines.push('## Unmapped `industry:` tags found in the export\n')
  lines.push('| Tag | Products |')
  lines.push('|---|---:|')
  for (const [t, c] of [...unmapped.entries()].sort((a, b) => b[1] - a[1])) lines.push(`| \`${t}\` | ${c} |`)
  lines.push('')
}
lines.push('## Applying this plan\n')
lines.push('Not performed here and not authorized. Applying it requires, in order:')
lines.push('1. Create the `industry` metaobject definition (see `docs/industry-architecture.md`).')
lines.push('2. Create the `custom.industries` product metafield.')
lines.push('3. Create one automated collection per approved industry.')
lines.push('4. Write metafield values from `industry-affected-products.csv`.')
lines.push('5. Keep `industry-rollback.json` as the restore source.\n')
lines.push('Each step is independently reversible. Do not combine them.\n')
writeFileSync(join(OUT_DIR, 'industry-summary.md'), lines.join('\n'))

console.log(`Products: ${products.size}`)
console.log(`With industry tags: ${Object.keys(rollback).length}`)
for (const [k, v] of perIndustry) console.log(`  ${k}: ${v} active`)
if (unmapped.size) console.log(`Unmapped tags: ${[...unmapped.keys()].join(', ')}`)
console.log(`\nWrote 5 files to ${OUT_DIR}. NO Shopify writes performed.`)
