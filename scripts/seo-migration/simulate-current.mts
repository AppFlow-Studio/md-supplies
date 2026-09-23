// READ-ONLY simulation. Runs every non-image unified target through the
// CURRENT proxy() normalization + REDIRECT_ENTRIES/PRODUCT_REDIRECTS/etc to
// see what already resolves vs what is still a gap or an encoding miss.
// No app files are modified.
//
// Run: npx tsx scripts/seo-migration/simulate-current.mts
import { readFileSync, writeFileSync } from 'fs'
import Module, { createRequire } from 'module'
import type { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

type ModuleWithResolve = typeof Module & {
  _resolveFilename: (request: string, ...rest: unknown[]) => string
}

const moduleWithResolve = Module as ModuleWithResolve
const origResolve = moduleWithResolve._resolveFilename
moduleWithResolve._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === 'next/server') return require.resolve('./next-server-stub.cjs')
  return origResolve.call(this, request, ...rest)
}

const { proxy } = await import('../../proxy')

type UnifiedTarget = { pathAndQuery: string; type: string }

const AUDIT_DIR = 'docs/audits/2026-09-04-p0-seo-migration-integrity'
const data = JSON.parse(readFileSync(`${AUDIT_DIR}/unified-targets.json`, 'utf8')) as UnifiedTarget[]
const pages = data.filter((d) => d.type !== 'image')

function fakeRequest(pathAndQuery: string): NextRequest {
  const [pathname, search] = pathAndQuery.split(/\?([\s\S]*)/)
  const url = `https://mdsupplies.com${pathAndQuery}`
  return {
    nextUrl: { pathname, search: search ? '?' + search : '' },
    url,
    cookies: { has: () => false },
    headers: new Map(),
  } as unknown as NextRequest
}

const results = pages.map((p) => {
  let res: Response | undefined
  let error: string | undefined
  try {
    res = proxy(fakeRequest(p.pathAndQuery))
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }
  return {
    pathAndQuery: p.pathAndQuery,
    type: p.type,
    status: res?.status,
    location: res?.headers.get('Location') ?? null,
    error,
  }
})

writeFileSync(`${AUDIT_DIR}/current-behavior.json`, JSON.stringify(results, null, 2))
for (const r of results) {
  console.log(`${String(r.status ?? (r.error ? 'ERR' : 'PASS-THROUGH')).padEnd(14)} ${r.pathAndQuery}${r.location ? '  -> ' + r.location : ''}${r.error ? '  ERROR: ' + r.error : ''}`)
}
