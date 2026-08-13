#!/usr/bin/env node
/**
 * `npm audit` with a reviewed, documented exception list.
 *
 *   node scripts/audit-with-exceptions.mjs [--level high]
 *
 * WHY NOT PLAIN `npm audit --audit-level=high`:
 * it was a step inside the main CI job, ahead of build and the secret scan. The
 * moment it went red — on a transitive advisory with no in-range fix — it took
 * the build and the secret scan down with it, so the checks that actually gate
 * a release stopped reporting. Splitting the job fixes the ordering; this
 * script fixes the signal, so the job is red for NEW problems rather than
 * permanently red for a known, argued one.
 *
 * Exceptions live in docs/security/dependency-risk-exceptions.md, which must
 * carry the path, the exposure argument and an exit condition for each.
 * Anything not on the list fails. Nothing is deleted or suppressed: accepted
 * advisories are still printed on every run.
 */
import { execFileSync } from 'node:child_process'

const levelIdx = process.argv.indexOf('--level')
const LEVEL = levelIdx >= 0 ? process.argv[levelIdx + 1] : 'high'
const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
const MIN = RANK[LEVEL] ?? 3

/**
 * Accepted advisories, keyed by GHSA id. Keep in lockstep with
 * docs/security/dependency-risk-exceptions.md — the `reason` here is a
 * one-line pointer, the argument lives in the doc.
 *
 * All three below clear together via `next@16.3.0`, tracked as its own PR.
 */
const ACCEPTED = new Map([
  ['GHSA-f88m-g3jw-g9cj', 'sharp<-next: libvips CVEs; build-side processing of first-party images only. Exit: next@16.3.0'],
  ['GHSA-qx2v-qp2m-jg93', 'postcss<-next: build-time, first-party CSS only. Exit: next@16.3.0'],
  ['GHSA-6g55-p6wh-862q', 'postcss<-next: build-time, first-party CSS only. Exit: next@16.3.0'],
  ['GHSA-r28c-9q8g-f849', 'postcss<-next: build-time, first-party CSS only. Exit: next@16.3.0'],
  ['GHSA-fxqj-rqcc-2cmp', 'postcss<-next: build-time, first-party CSS only. Exit: next@16.3.0'],
])

let raw
try {
  // npm audit exits non-zero when it finds anything — that is the normal path
  // here, so read stdout from the error rather than treating it as a failure.
  raw = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: true })
} catch (e) {
  raw = e.stdout || ''
}
if (!raw.trim()) {
  console.error('audit produced no output — treating as failure rather than a pass')
  process.exit(1)
}

const report = JSON.parse(raw)
const vulns = report.vulnerabilities ?? {}

const unexpected = []
const accepted = []

for (const [pkg, v] of Object.entries(vulns)) {
  if ((RANK[v.severity] ?? 0) < MIN) continue
  // `via` holds advisory objects for the package itself, or plain strings
  // naming the package it inherits from.
  const advisories = (v.via ?? []).filter((x) => typeof x === 'object')
  if (advisories.length === 0) {
    // Purely inherited: judged via the package it comes from, not separately.
    continue
  }
  for (const a of advisories) {
    const id = a.url?.split('/').pop() ?? a.source ?? 'unknown'
    const entry = { pkg, id, severity: a.severity ?? v.severity, title: (a.title ?? '').slice(0, 90) }
    if (ACCEPTED.has(id)) accepted.push({ ...entry, reason: ACCEPTED.get(id) })
    else unexpected.push(entry)
  }
}

if (accepted.length) {
  console.log(`\nACCEPTED (documented in docs/security/dependency-risk-exceptions.md):`)
  for (const a of new Map(accepted.map((x) => [x.id, x])).values()) {
    console.log(`  - [${a.severity}] ${a.pkg} ${a.id}`)
    console.log(`      ${a.reason}`)
  }
}

if (unexpected.length) {
  const uniq = [...new Map(unexpected.map((x) => [x.id + x.pkg, x])).values()]
  console.error(`\nUNREVIEWED advisories at or above "${LEVEL}" — ${uniq.length}:`)
  for (const u of uniq) console.error(`  - [${u.severity}] ${u.pkg} ${u.id}  ${u.title}`)
  console.error(
    '\nEither fix them, or add an entry to docs/security/dependency-risk-exceptions.md\n' +
    'with the dependency path, the exposure argument and an exit condition, and\n' +
    'mirror the id into ACCEPTED in this script. Check `fixAvailable` in\n' +
    '`npm audit --json` first — the human-readable output says "No fix available"\n' +
    'for a package even when a fix exists via its parent.',
  )
  process.exit(1)
}

console.log(`\nNo unreviewed advisories at or above "${LEVEL}".`)
