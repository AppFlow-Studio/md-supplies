// READ-ONLY analysis. Parses both Ahrefs backlink exports, dedupes by exact
// Target URL, and emits a unified JSON inventory for the P0 SEO migration
// integrity ticket. No writes to proxy.ts or any app file.
//
// Run: node scripts/seo-migration/parse-csvs.mjs
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT_DIR = path.join(__dirname, '..', '..', 'docs', 'audits', '2026-09-04-p0-seo-migration-integrity')

const FILE_A = path.join(AUDIT_DIR, 'mdsupplies.com-broken-backlinks-subdomains_2026-04-26_19-10-19(3).csv')
const FILE_B = path.join(AUDIT_DIR, 'mdsupplies.com-backlinks-subdomains_2026-09-01_13-28-23.csv')

// Minimal RFC4180 CSV parser (handles quoted fields, embedded commas, embedded
// quotes doubled as "", and embedded newlines inside quoted fields).
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === ',') { row.push(field); field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += c; i++
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  const header = rows[0]
  return rows.slice(1).filter(r => r.length > 1 || (r.length === 1 && r[0] !== '')).map(r => {
    const obj = {}
    header.forEach((h, idx) => { obj[h] = r[idx] ?? '' })
    return obj
  })
}

function extractPath(rawUrl) {
  try {
    // Target URLs are absolute (http/https, with/without www). Keep the exact
    // path+query as-authored (encoding intact) — this is the literal string a
    // browser/bot would request, which is what proxy.ts must match against.
    const u = new URL(rawUrl)
    return { host: u.host, protocol: u.protocol, pathAndQuery: u.pathname + u.search }
  } catch {
    return { host: '', protocol: '', pathAndQuery: rawUrl }
  }
}

function classifyType(pathAndQuery, typeCol) {
  const p = pathAndQuery.split('?')[0]
  if (typeCol === 'image' || /\.(gif|png|jpe?g|webp|svg)$/i.test(p)) return 'image'
  if (p === '/' || p === '') return 'root'
  if (/^\/(supplies-by-vendor|Durable-Equipment-Medical\.html)/i.test(p)) return 'vendor'
  if (/^\/articles\//i.test(p)) return 'article'
  if (/category|categories|collections/i.test(p)) return 'category'
  if (/medical-supply-store|medical-supplies-/i.test(p)) return 'product'
  return 'page'
}

const rowsA = parseCsv(readFileSync(FILE_A, 'utf8'))
const rowsB = parseCsv(readFileSync(FILE_B, 'utf8'))

console.error(`File A (broken-backlinks, 2026-04-26): ${rowsA.length} rows`)
console.error(`File B (backlinks, 2026-09-01): ${rowsB.length} rows`)

const targets = new Map() // key: exact target URL string -> record

function ingest(rows, sourceLabel) {
  for (const r of rows) {
    const rawTarget = r['Target URL']
    if (!rawTarget) continue
    const key = rawTarget.trim()
    const { host, protocol, pathAndQuery } = extractPath(key)
    const type = classifyType(pathAndQuery, r['Type'])
    if (!targets.has(key)) {
      targets.set(key, {
        targetUrl: key,
        host,
        protocol,
        pathAndQuery,
        type,
        sources: [],
        referringPages: [],
        isSpamAny: false,
        targetHttpCodes: new Set(),
      })
    }
    const rec = targets.get(key)
    rec.sources.push(sourceLabel)
    rec.referringPages.push({
      source: sourceLabel,
      referringUrl: r['Referring page URL'] || '',
      referringTitle: r['Referring page title'] || '',
      anchor: r['Anchor'] || '',
      leftContext: r['Left context'] || '',
      rightContext: r['Right context'] || '',
      domainRating: r['Domain rating'] || '',
      isSpam: (r['Is spam'] || '').toLowerCase() === 'true',
      redirectChainUrls: r['Redirect Chain URLs'] || '',
      redirectChainStatus: r['Redirect Chain status codes'] || '',
      targetHttpCode: r['Target page HTTP code'] || r['Referring page HTTP code'] || '',
    })
    if ((r['Is spam'] || '').toLowerCase() === 'true') rec.isSpamAny = true
    if (r['Target page HTTP code']) rec.targetHttpCodes.add(r['Target page HTTP code'])
  }
}

ingest(rowsA, 'A:broken-backlinks-2026-04-26')
ingest(rowsB, 'B:backlinks-2026-09-01')

const unified = [...targets.values()].map(rec => ({
  ...rec,
  targetHttpCodes: [...rec.targetHttpCodes],
  bothFiles: rec.sources.includes('A:broken-backlinks-2026-04-26') && rec.sources.includes('B:backlinks-2026-09-01'),
}))

unified.sort((a, b) => a.type.localeCompare(b.type) || a.pathAndQuery.localeCompare(b.pathAndQuery))

const byType = {}
for (const u of unified) byType[u.type] = (byType[u.type] || 0) + 1

console.error('Unique targets:', unified.length)
console.error('By type:', JSON.stringify(byType, null, 2))
console.error('Image targets:', unified.filter(u => u.type === 'image').length)

writeFileSync(path.join(AUDIT_DIR, 'unified-targets.json'), JSON.stringify(unified, null, 2))
console.error('Wrote', path.join(AUDIT_DIR, 'unified-targets.json'))
