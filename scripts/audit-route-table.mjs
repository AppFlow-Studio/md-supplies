// Renders audit/live/route-audit.json (written by audit-live-routes.mjs) as a
// markdown table for docs/audits. Split from the fetcher so the table can be
// regenerated without re-hitting the Storefront API.
//
//   node scripts/audit-route-table.mjs

import fs from 'node:fs'

const rows = JSON.parse(fs.readFileSync('audit/live/route-audit.json', 'utf8'))

const header = [
  '| Route | Product source | Products | Facets rendered (registry order, live value count) | Live but not approved (dropped) | Approved but not published by S&D |',
  '|---|---|---:|---|---|---|',
]

const cell = (v) => (v && v.length ? v.join(', ') : '—')

const body = rows.map((r) => {
  const facets = r.rendered
    .map((f) => (f.values === null ? f.label : `${f.label} (${f.values})`))
    .join(' › ')
  return `| \`${r.route}\` | ${r.source} | ${r.total} | ${facets} | ${cell(r.droppedByRegistry)} | ${cell(r.registeredNotLive)} |`
})

fs.writeFileSync('audit/live/route-table.md', [...header, ...body].join('\n') + '\n')
console.log(`Wrote audit/live/route-table.md (${rows.length} routes)`)
