#!/usr/bin/env node
/**
 * Measures RENDERED text contrast and classifies every teal usage.
 *
 *   node scripts/audit-text-contrast.mjs [baseUrl]
 *
 * Static grep cannot answer the question that matters: the same class on a
 * navy panel and on white are different results, and an icon
 * is held to 3:1 rather than 4.5:1. So this walks the real pages, resolves each
 * element's computed colour against its EFFECTIVE background (climbing
 * ancestors past transparent), and applies the actual WCAG thresholds.
 *
 * Emits docs/audits/2026-08-02-catalog-cro/text-contrast-audit.md and a JSON
 * companion. Read-only: renders pages, changes nothing.
 */
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3000'
const OUT = 'docs/audits/2026-08-02-catalog-cro'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  '/', '/about', '/faq', '/contact', '/partners', '/industries',
  '/blog', '/blog/types-of-needles', '/cart', '/account',
  '/product/qa-no-rate', '/product/qa-out-of-stock', '/product/qa-backorder',
]

const PROBE = `() => {
  // Resolve ANY CSS colour to true sRGB bytes by letting the browser do it.
  // This theme is authored in oklch, and getComputedStyle happily returns
  // "oklch(1 0 0)" — regex-scraping the numbers out of that reads white as
  // rgb(1, 0, 0) and reports 1.17:1 on navy. Painting one pixel and reading it
  // back is format-agnostic and cannot drift as CSS colour syntax grows.
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1
  const ctx = cvs.getContext('2d', { willReadFrequently: true })
  const RESOLVED = new Map()
  const toRgb = (css) => {
    if (RESOLVED.has(css)) return RESOLVED.get(css)
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    const v = [d[0], d[1], d[2], d[3] / 255]
    RESOLVED.set(css, v)
    return v
  }
  const parse = (s) => toRgb(s)
  const lum = ([r,g,b]) => {
    const c = [r,g,b].map(v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4) })
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
  }
  const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)]; const hi=Math.max(x,y), lo=Math.min(x,y); return (hi+0.05)/(lo+0.05) }

  // Climb until an opaque background is found; default to white like a browser.
  const effectiveBg = (el) => {
    let n = el
    while (n) {
      const bg = getComputedStyle(n).backgroundColor
      const p = parse(bg)
      if (p.length >= 3 && (p[3] === undefined || p[3] > 0.5)) return [p[0],p[1],p[2]]
      n = n.parentElement
    }
    return [255,255,255]
  }

  const out = []
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    const fg = parse(cs.color).slice(0,3)
    if (fg.length < 3) continue

    // Does this element render its OWN text (not just inherit to children)?
    const ownText = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('')

    // An icon is the <svg> ITSELF, never an ancestor that merely contains one.
    // Matching any wrapper made every <section> holding an icon "fail" at 1:1,
    // because a container with no text has color === its own background.
    const isIconOnly = !ownText && el.tagName.toLowerCase() === 'svg'
    if (!ownText && !isIconOnly) continue

    const px = parseFloat(cs.fontSize)
    const weight = parseInt(cs.fontWeight, 10) || 400
    // WCAG "large text": >=24px, or >=18.66px when bold.
    const isLarge = px >= 24 || (px >= 18.66 && weight >= 700)

    // aria-hidden content is not exposed to assistive tech and carries no
    // information — breadcrumb chevrons, bullet dividers. It is decorative, so
    // the NON-TEXT 3:1 threshold applies rather than 4.5:1. Without this the
    // audit demands body-text contrast from a "›".
    const isDecorative = el.closest('[aria-hidden="true"]') !== null
    const required = (isIconOnly || isDecorative) ? 3.0 : (isLarge ? 3.0 : 4.5)

    const bg = effectiveBg(el)
    const r = ratio(fg, bg)

    out.push({
      color: 'rgb(' + fg.join(',') + ')',
      tag: el.tagName.toLowerCase(),
      isLink: el.closest('a') !== null,
      text: (ownText || '[icon]').slice(0, 45),
      px, weight, isLarge, isIconOnly, isDecorative,
      bg: 'rgb(' + bg.join(',') + ')',
      ratio: Math.round(r * 100) / 100,
      required,
      pass: r >= required,
      cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '')).slice(0, 90),
    })
  }
  return out
}`

const browser = await chromium.launch()
const page = await browser.newPage()
const all = []

for (const route of ROUTES) {
  try {
    const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 })
    if (!res || res.status() >= 400) { console.warn(`  skip ${route} (${res?.status()})`); continue }
    const found = await page.evaluate(eval(`(${PROBE})`))
    for (const f of found) all.push({ route, ...f })
    const bad = found.filter(f => !f.pass).length
    console.log(`  ${route.padEnd(28)} ${String(found.length).padStart(3)} text nodes, ${bad} failing`)
  } catch (e) {
    console.warn(`  skip ${route}: ${String(e.message).slice(0, 80)}`)
  }
}
await browser.close()

// ── Classify ────────────────────────────────────────────────────────────────
const cls = (r) => {
  if (r.pass) return 'already-compliant'
  if (r.isIconOnly) return "control-icon"
  if (r.isDecorative) return "decorative-non-text"
  if (r.isLarge) return 'large-text'
  return 'text-requiring-correction'
}
for (const r of all) r.classification = cls(r)

const counts = {}
for (const r of all) counts[r.classification] = (counts[r.classification] ?? 0) + 1

const failing = all.filter(r => r.classification === 'text-requiring-correction')
const uniqFail = new Map()
for (const f of failing) {
  const k = `${f.color}|${f.px}|${f.bg}|${f.isLink}|${f.weight}`
  if (!uniqFail.has(k)) uniqFail.set(k, { ...f, count: 0, routes: new Set(), samples: [] })
  const e = uniqFail.get(k); e.count++; e.routes.add(f.route)
  if (e.samples.length < 3) e.samples.push(f.text)
}

const md = [
  '# Rendered text-contrast audit',
  '',
  `Measured in a real browser against \`${BASE}\` — computed colour vs EFFECTIVE`,
  'background (climbing ancestors past transparent), with the actual WCAG',
  'thresholds applied: 4.5:1 normal text, 3:1 large text (>=24px, or >=18.66px',
  'bold) and 3:1 non-text/icons.',
  '',
  `Text nodes measured: **${all.length}** across ${ROUTES.length} routes.`,
  '',
  '## Classification',
  '',
  '| Class | Nodes |',
  '|---|---:|',
  ...['text-requiring-correction', 'already-compliant', 'large-text', 'control-icon', 'decorative-non-text']
    .map(k => `| ${k} | ${counts[k] ?? 0} |`),
  '',
  '## Distinct failures requiring correction',
  '',
  uniqFail.size === 0 ? '_None._' : '| Colour | Size | Bg | Link | Ratio | Needs | Nodes | Routes | Sample |',
  uniqFail.size === 0 ? '' : '|---|---:|---|:--:|---:|---:|---:|---:|---|',
  ...[...uniqFail.values()].sort((a, b) => a.ratio - b.ratio).map(f =>
    `| \`${f.color}\` | ${f.px}px | ${f.bg} | ${f.isLink ? 'yes' : 'no'} | **${f.ratio}:1** | ${f.required}:1 | ${f.count} | ${f.routes.size} | ${f.samples[0]?.replace(/\|/g, '/') ?? ''} |`),
  '',
  '## Note on coverage',
  '',
  'Category, subcategory and industry GRIDS are not covered: the QA store has',
  'no such collections, so those routes do not render. The product-card Brand',
  'line is the highest-risk uncovered surface — it is `text-teal-500` at 13px',
  'and only stays invisible here because QA fixtures carry no `custom.brand_name`.',
  '',
]
writeFileSync(join(OUT, 'text-contrast-audit.md'), md.join('\n'))
writeFileSync(join(OUT, 'text-contrast-audit.json'), JSON.stringify({ base: BASE, counts, nodes: all }, null, 2) + '\n')

console.log('\nClassification:', counts)
console.log(`Distinct failures: ${uniqFail.size}`)
console.log(`Wrote ${OUT}/text-contrast-audit.md`)
