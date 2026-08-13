// Meta-description / title audit for the 30 category + industry detail routes
// against a RUNNING server, so it measures what is actually served rather than
// what the registry intends.
//
//   BASE=http://localhost:3000 node scripts/audit-meta-descriptions.mjs

import fs from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:3000'

const src = fs.readFileSync('lib/category-tree.ts', 'utf8')
const CATEGORY_SLUGS = [...src.matchAll(/collectionHandle: '([^']+)'/g)]
  .map((m) => m[1])
  .map((h) => (h === 'face-coverings' ? 'face-masks' : h))

const INDUSTRY_SLUGS = ['urgent-care', 'hrt-clinics', 'home-health', 'clinics-doctors-offices', 'pharmacies']

const pick = (html, re) => {
  const m = html.match(re)
  return m ? m[1].replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim() : ''
}

const rows = []
for (const [kind, slugs, prefix] of [
  ['category', CATEGORY_SLUGS, '/category/'],
  ['industry', INDUSTRY_SLUGS, '/industries/'],
]) {
  for (const slug of slugs) {
    const route = prefix + slug
    const html = await fetch(BASE + route).then((r) => r.text())
    rows.push({
      kind,
      route,
      title: pick(html, /<title>([^<]*)<\/title>/),
      description: pick(html, /<meta name="description" content="([^"]*)"/),
      h1: pick(html, /<h1[^>]*>([^<]*)</),
      ogDescription: pick(html, /<meta property="og:description" content="([^"]*)"/),
    })
  }
}

const problems = []
const seenTitle = new Map()
const seenDesc = new Map()

for (const r of rows) {
  if (!r.title) problems.push(`${r.route}: MISSING title`)
  if (!r.description) problems.push(`${r.route}: MISSING meta description`)
  if (!r.h1) problems.push(`${r.route}: MISSING h1`)
  // Google truncates around 160; under ~70 usually means the field fell back to
  // something too thin to be a real description.
  if (r.description && r.description.length < 70) {
    problems.push(`${r.route}: meta description only ${r.description.length} chars — "${r.description}"`)
  }
  if (r.description && r.description.length > 165) {
    problems.push(`${r.route}: meta description ${r.description.length} chars (will truncate)`)
  }
  if (r.title && r.title.length > 65) problems.push(`${r.route}: title ${r.title.length} chars (will truncate)`)
  if (r.ogDescription && r.description && r.ogDescription !== r.description) {
    problems.push(`${r.route}: og:description disagrees with meta description`)
  }
  for (const [map, val, label] of [[seenTitle, r.title, 'title'], [seenDesc, r.description, 'description']]) {
    if (!val) continue
    if (map.has(val)) problems.push(`${r.route}: duplicate ${label} — also on ${map.get(val)}`)
    else map.set(val, r.route)
  }
}

for (const r of rows) {
  console.log(`${r.route}\n   h1:    ${r.h1}\n   title: (${r.title.length}) ${r.title}\n   desc:  (${r.description.length}) ${r.description}`)
}
console.log(`\n${problems.length ? 'PROBLEMS:' : 'No problems found.'}`)
for (const p of problems) console.log('  ' + p)

fs.mkdirSync('audit/live', { recursive: true })
fs.writeFileSync('audit/live/meta-audit.json', JSON.stringify({ rows, problems }, null, 2))
