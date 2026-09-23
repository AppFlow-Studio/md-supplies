// READ-ONLY. Full Partners/Brands logo audit (P0 follow-up to E4 — Brands +
// BunnyCDN Asset Pipeline).
//
// Walks every entry in lib/brands.ts (the full "Brands We Carry" registry)
// and lib/partners.ts (the manufacturer/partner cards + partner detail
// pages), resolves each logo directly against the BunnyCDN Storage API
// (bypassing the site's own Vercel bot-challenge, which blocks headless
// verification of https://mdsupplies.com/api/bunny/... from CI/scripts),
// and reports the exact fields this ticket's audit requires:
//   brand name, slug, source data record, logo path, resolved request URL,
//   HTTP response, rendered state (per BrandLogoImage's fallback contract),
//   reserved width/height, alt text, fallback behavior, destination validity.
//
// A card with no `logoFile` is NOT a failure — lib/brands.ts's contract is
// that `logo` is set only once a file is verified & uploaded, so those
// render the clean text fallback by design. A *configured* logoFile is a
// defect in two independent ways this audit checks for, both found live on
// 2026-09-04 (see docs/audits/2026-09-04-partners-brand-logo-audit.md):
//   1. It fails to resolve (non-2xx, or 2xx with a non-image content-type) —
//      renders the text fallback via BrandLogoImage's onError handler.
//   2. It resolves fine but is pure/near-pure white — nothing is "broken" by
//      any HTTP-level measure, but the mark is invisible on these white
//      cards (this was the actual Lumex regression: lumex.svg is a
//      brightness-0-invert-only mark meant for the navy partner-detail hero,
//      not the white "Brands We Carry" grid). Checked by rendering each
//      resolved image in a headless browser and sampling composited-on-white
//      luminance — the same signal a human eye uses, not a proxy for it.
//
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-brand-logos.ts
//
// Requires BUNNYCDN_STORAGE_ACCESS_KEY (+ optionally _HOSTNAME/_ZONE) in
// .env.local or the shell environment — the same credential the production
// app/api/bunny/[...path]/route.ts proxy uses.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { writeFileSync } from 'fs'
import { chromium, type Page } from '@playwright/test'
import { BRANDS, brandLogoUrl, brandHref, type Brand } from '../lib/brands'
import { PARTNERS, getActivePartners } from '../lib/partners'
import { serverEnv } from '../lib/env.server'

type Row = {
  name: string
  slug: string
  source: 'BRANDS' | 'BRANDS+PARTNERS'
  logoFile: string | undefined
  resolvedProxyUrl: string | undefined
  upstreamStatus: number | 'NO_LOGO_CONFIGURED' | 'ERROR'
  contentType: string | null
  visibility: 'n/a' | 'visible' | 'INVISIBLE (white-on-white)' | 'unchecked'
  renderedState: string
  width: number | undefined
  height: number | undefined
  altText: string
  destination: string | undefined
  destinationValid: boolean
  isHomepage: boolean
}

const IMAGE_CONTENT_TYPE = /^image\//

async function checkLogo(
  brand: Brand,
): Promise<{ status: number | 'ERROR'; contentType: string | null; bytes: ArrayBuffer | null }> {
  if (!brand.logoFile) return { status: 'ERROR', contentType: null, bytes: null }
  const upstreamUrl = `https://${serverEnv.bunnyCdnHostname}/${serverEnv.bunnyCdnZone}/brands/${encodeURIComponent(brand.logoFile)}`
  try {
    // Explicit timeout: a hung upstream connection must not stall the whole
    // audit (this loops over ~95 records sequentially in small batches).
    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { AccessKey: serverEnv.bunnyCdnAccessKey },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { status: res.status, contentType: res.headers.get('content-type'), bytes: null }
    return { status: res.status, contentType: res.headers.get('content-type'), bytes: await res.arrayBuffer() }
  } catch (err) {
    console.error(`  [ERROR] ${brand.slug}: ${(err as Error).message}`)
    return { status: 'ERROR', contentType: null, bytes: null }
  }
}

/**
 * Renders `bytes` (as `contentType`) composited on a white background and
 * returns true if it's effectively invisible there — the exact "white-on-white"
 * defect class found on 2026-09-04. Uses a data: URI so this never depends on
 * a running Next.js server or network access beyond the one already-fetched
 * BunnyCDN response.
 */
async function isInvisibleOnWhite(page: Page, bytes: ArrayBuffer, contentType: string): Promise<boolean> {
  const dataUri = `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`
  const { mean, stddev } = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    const w = img.naturalWidth || 1
    const h = img.naturalHeight || 1
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    let sum = 0
    let sumSq = 0
    let n = 0
    for (let i = 0; i < data.length; i += 4) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      sum += l
      sumSq += l * l
      n++
    }
    const mean = sum / n
    const variance = sumSq / n - mean * mean
    return { mean, stddev: Math.sqrt(Math.max(variance, 0)) }
  }, dataUri)
  return mean > 248 && stddev < 6
}

function destinationFor(brand: Brand): { destination: string | undefined; valid: boolean } {
  const destination = brandHref(brand)
  if (!destination) return { destination: undefined, valid: true } // no link is a valid, intentional state (§6.2)
  const activeSlugs = new Set(getActivePartners().map((p) => p.slug))
  return { destination, valid: activeSlugs.has(brand.partnerSlug!) }
}

async function main() {
  console.log(`Auditing ${BRANDS.length} brand records against BunnyCDN zone=${(() => {
    try {
      return serverEnv.bunnyCdnZone
    } catch {
      return '(unset)'
    }
  })()}...`)

  let credentialsConfigured = true
  try {
    void serverEnv.bunnyCdnAccessKey
  } catch {
    credentialsConfigured = false
  }

  const rows: Row[] = []
  const bytesBySlug = new Map<string, { bytes: ArrayBuffer; contentType: string }>()
  const BATCH = 8

  for (let i = 0; i < BRANDS.length; i += BATCH) {
    const batch = BRANDS.slice(i, i + BATCH)
    console.log(`  checking ${i + 1}-${Math.min(i + BATCH, BRANDS.length)} of ${BRANDS.length}...`)
    const results = await Promise.all(
      batch.map(async (brand) => {
        const proxyUrl = brandLogoUrl(brand)
        const { destination, valid } = destinationFor(brand)

        if (!brand.logoFile) {
          return {
            name: brand.name,
            slug: brand.slug,
            source: (brand.partnerSlug ? 'BRANDS+PARTNERS' : 'BRANDS') as Row['source'],
            logoFile: undefined,
            resolvedProxyUrl: undefined,
            upstreamStatus: 'NO_LOGO_CONFIGURED' as const,
            contentType: null,
            visibility: 'n/a' as const,
            renderedState: 'text fallback (by design — no logo configured)',
            width: brand.logoWidth,
            height: brand.logoHeight,
            altText: `${brand.name} logo`,
            destination,
            destinationValid: valid,
            isHomepage: Boolean(brand.homepage),
          }
        }

        const { status, contentType, bytes } = credentialsConfigured
          ? await checkLogo(brand)
          : { status: 'ERROR' as const, contentType: null, bytes: null }

        const ok = status === 200 && contentType !== null && IMAGE_CONTENT_TYPE.test(contentType)
        if (ok && bytes) bytesBySlug.set(brand.slug, { bytes, contentType: contentType! })

        const renderedState = !credentialsConfigured
          ? 'UNVERIFIED — BUNNYCDN_STORAGE_ACCESS_KEY not configured in this run'
          : ok
            ? 'logo renders'
            : `text fallback (BrandLogoImage onError) — upstream ${status}${contentType ? ` content-type=${contentType}` : ''}`

        return {
          name: brand.name,
          slug: brand.slug,
          source: (brand.partnerSlug ? 'BRANDS+PARTNERS' : 'BRANDS') as Row['source'],
          logoFile: brand.logoFile,
          resolvedProxyUrl: proxyUrl,
          upstreamStatus: status,
          contentType,
          visibility: ok ? ('unchecked' as const) : ('n/a' as const),
          renderedState,
          width: brand.logoWidth,
          height: brand.logoHeight,
          altText: `${brand.name} logo`,
          destination,
          destinationValid: valid,
          isHomepage: Boolean(brand.homepage),
        }
      }),
    )
    rows.push(...results)
  }

  // Second pass: for every logo that resolved 200 with an image content-type,
  // render it composited on white in a headless browser and sample luminance.
  // This is what actually caught the Lumex regression — HTTP status alone
  // cannot distinguish a working logo from one that's pure white.
  if (bytesBySlug.size > 0) {
    console.log(`\nChecking on-white visibility for ${bytesBySlug.size} resolved logo(s)...`)
    const browser = await chromium.launch()
    const page = await browser.newPage()
    let checked = 0
    for (const row of rows) {
      const entry = bytesBySlug.get(row.slug)
      if (!entry) continue
      checked++
      if (checked % 20 === 0) console.log(`  visibility ${checked}/${bytesBySlug.size}...`)
      const invisible = await isInvisibleOnWhite(page, entry.bytes, entry.contentType)
      row.visibility = invisible ? 'INVISIBLE (white-on-white)' : 'visible'
      if (invisible) {
        row.renderedState = 'renders, but INVISIBLE on white (pure/near-pure-white asset) — see lib/brands.ts comment; logoFile should be removed until re-uploaded'
      }
    }
    await browser.close()
  }

  const configuredRows = rows.filter((r) => r.logoFile)
  const failures = configuredRows.filter((r) => r.upstreamStatus !== 200)
  const invisibleOnWhite = configuredRows.filter((r) => r.visibility === 'INVISIBLE (white-on-white)')
  const brokenLinks = rows.filter((r) => !r.destinationValid)
  const unverified = rows.filter((r) => r.upstreamStatus === 'ERROR' && !credentialsConfigured)

  const lines: string[] = []
  lines.push('# Partners / Brands We Carry — Full Logo Audit')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  if (!credentialsConfigured) {
    lines.push('## ⚠ CREDENTIALS NOT CONFIGURED — every row below is UNVERIFIED')
    lines.push('')
    lines.push('`BUNNYCDN_STORAGE_ACCESS_KEY` was not set when this report was generated, so no request')
    lines.push('actually reached BunnyCDN storage — every `logoFile` is listed as UNVERIFIED, not confirmed')
    lines.push('working or confirmed broken. **Re-run this script with real storage credentials before')
    lines.push('treating this report as evidence for the PR.**')
    lines.push('')
    lines.push('```')
    lines.push("NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-brand-logos.ts")
    lines.push('```')
    lines.push('')
  }

  lines.push('## Summary')
  lines.push('')
  lines.push(`- Total brand records: **${BRANDS.length}**`)
  lines.push(`- Records with a configured \`logoFile\`: **${configuredRows.length}**`)
  lines.push(`- Records with NO \`logoFile\` (intentional text fallback): **${rows.length - configuredRows.length}**`)
  lines.push(`- Configured logos that failed to resolve (upstream != 200 or non-image content-type): **${failures.length}**`)
  lines.push(`- Configured logos that resolve fine but are INVISIBLE on white (pure/near-pure-white asset): **${invisibleOnWhite.length}**`)
  lines.push(`- Records with an invalid \`partnerSlug\` destination (points at an inactive/missing partner): **${brokenLinks.length}**`)
  lines.push(`- Total \`lib/partners.ts\` PARTNERS records: **${PARTNERS.length}** (active: ${getActivePartners().length})`)
  lines.push('')

  if (failures.length > 0 && credentialsConfigured) {
    lines.push('## ⚠ Brand logos failing to resolve (rendering the text fallback in production)')
    lines.push('')
    lines.push('| Brand | Slug | logoFile | Resolved proxy URL | Upstream status | Content-Type |')
    lines.push('|---|---|---|---|---|---|')
    for (const r of failures) {
      lines.push(`| ${r.name} | \`${r.slug}\` | \`${r.logoFile}\` | \`${r.resolvedProxyUrl}\` | ${r.upstreamStatus} | ${r.contentType ?? '(none)'} |`)
    }
    lines.push('')
  } else if (credentialsConfigured) {
    lines.push('**All configured brand logos resolved 200 with an image content-type.**')
    lines.push('')
  }

  if (invisibleOnWhite.length > 0) {
    lines.push('## ⚠ Brand logos that resolve fine but are INVISIBLE on white')
    lines.push('')
    lines.push('Nothing is broken by any HTTP-level measure — these all resolve 200 with a valid image')
    lines.push('content-type. The asset itself is pure/near-pure white, so it renders nothing visible on')
    lines.push('these white cards. `logoFile` should be removed for each of these (matching lib/brands.ts\'s')
    lines.push('existing "visually verified" contract) until a correct color variant is re-uploaded.')
    lines.push('')
    lines.push('| Brand | Slug | logoFile | Resolved proxy URL |')
    lines.push('|---|---|---|---|')
    for (const r of invisibleOnWhite) {
      lines.push(`| ${r.name} | \`${r.slug}\` | \`${r.logoFile}\` | \`${r.resolvedProxyUrl}\` |`)
    }
    lines.push('')
  } else if (credentialsConfigured && configuredRows.length > 0) {
    lines.push('**No configured brand logo is invisible-on-white.**')
    lines.push('')
  }

  if (brokenLinks.length > 0) {
    lines.push('## ⚠ Invalid destinations')
    lines.push('')
    lines.push('| Brand | Slug | partnerSlug | Destination |')
    lines.push('|---|---|---|---|')
    for (const r of brokenLinks) {
      lines.push(`| ${r.name} | \`${r.slug}\` | (see lib/brands.ts) | \`${r.destination}\` |`)
    }
    lines.push('')
  }

  lines.push('## Full record table')
  lines.push('')
  lines.push('| Brand | Slug | Source | logoFile | Resolved URL | Upstream | Rendered state | W×H | Alt text | Destination |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    lines.push(
      `| ${r.name} | \`${r.slug}\` | ${r.source} | ${r.logoFile ? `\`${r.logoFile}\`` : '—'} | ${r.resolvedProxyUrl ? `\`${r.resolvedProxyUrl}\`` : '—'} | ${r.upstreamStatus} | ${r.renderedState} | ${r.width ?? '?'}×${r.height ?? '?'} | ${r.altText} | ${r.destination ? `\`${r.destination}\`` : '(no link — intentional)'} |`,
    )
  }
  lines.push('')

  const report = lines.join('\n')
  const outPath = 'docs/audits/2026-09-04-partners-brand-logo-audit.md'
  writeFileSync(outPath, report)
  console.log(`\nWrote ${outPath}`)
  console.log(`Summary: ${rows.length} records, ${configuredRows.length} with a logo configured, ${failures.length} failing to resolve, ${invisibleOnWhite.length} invisible-on-white, ${brokenLinks.length} invalid destinations`)
  if (unverified.length > 0) {
    console.log(`\n⚠ ${unverified.length} records UNVERIFIED — re-run with BUNNYCDN_STORAGE_ACCESS_KEY set.`)
  }
}

main().catch((err) => {
  console.error('AUDIT FAILED:', err instanceof Error ? err.stack : err)
  process.exit(1)
})
