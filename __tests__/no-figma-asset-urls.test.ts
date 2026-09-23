// __tests__/no-figma-asset-urls.test.ts
//
// P0 (Partners hero, 2026-09-04): app/partners/page.tsx shipped a
// `figma.com/api/mcp/asset/<id>` URL as a production <img src> — an
// ephemeral, session-scoped link the Figma Dev-Mode MCP server hands out
// while a developer is pulling design context, not a public/persistent
// asset host. It 404s outside that Figma session and was never in the CSP
// img-src allowlist (lib/csp.ts) either.
//
// This guards the whole class of regression, not just the one hero: no
// committed app/ or components/ source may reference figma.com as an asset
// URL. Real design assets belong in /public (see /images/about/warehouse.png)
// or BunnyCDN via the /api/bunny proxy (see lib/brands.ts).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['app', 'components']
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__'])

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

describe('no component ships a Figma dev-tool asset URL', () => {
  it('no app/ or components/ source references figma.com/api/mcp/asset outside of a comment', () => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) =>
      /figma\.com\/api\/mcp\/asset/.test(stripComments(readFileSync(f, 'utf8'))),
    )
    expect(offenders).toEqual([])
  })
})
