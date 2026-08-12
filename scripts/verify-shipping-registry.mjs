#!/usr/bin/env node
// Runs as `prebuild` (npm auto-invokes it before `build`). Guards against the
// silent-failure mode this exists to prevent: SHIPPING_RESOLVER_ENABLED=true
// shipping to production while the registry file is missing or corrupt,
// which makes every Free Shipping badge quietly disappear (the resolver's
// runtime loader fails closed and just falls back to neutral copy — safe for
// users, but invisible to whoever shipped the build). This script turns that
// into a loud build failure instead.
//
// Deliberately lightweight: full schema validation still happens in the real
// runtime loader (lib/shipping-resolver/data.ts). This only checks the two
// things that make the file usable at all — present, and byte-for-byte the
// artifact we expect — so it stays cheap to run on every build.

import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const enabled = process.env.SHIPPING_RESOLVER_ENABLED === 'true'
if (!enabled) {
  process.exit(0)
}

const path = process.env.SHIPPING_FACTS_PATH ?? 'data/shipping-facts-v3.json'

// Mirrors lib/shipping-resolver/data.ts's DEFAULT_PINNED_PAYLOAD_SHA256 —
// kept in sync manually since this script can't import path-aliased TS.
// This is the post-eol-normalization hash (see .gitattributes and the
// comment in data.ts) — the hash of the file as git actually checks it out,
// not of the raw CRLF source export.
const DEFAULT_PINNED_PAYLOAD_SHA256 =
  '91bee79cb48d29e027606e90b1e291ca5c0dc5ff6665c1327e709f924951d552'
const pinnedChecksum = process.env.SHIPPING_FACTS_CHECKSUM_SHA256 ?? DEFAULT_PINNED_PAYLOAD_SHA256

function fail(message) {
  console.error(`\n[verify-shipping-registry] ${message}`)
  console.error(
    '[verify-shipping-registry] SHIPPING_RESOLVER_ENABLED=true but the production shipping registry is not usable — Free Shipping would silently render nothing. Failing the build instead of shipping that state.\n',
  )
  process.exit(1)
}

if (!existsSync(path)) {
  fail(`no file at ${path}.`)
}

let raw
try {
  raw = readFileSync(path)
} catch (err) {
  fail(`failed to read ${path}: ${err.message}`)
}

const actualChecksum = createHash('sha256').update(raw).digest('hex')
if (actualChecksum !== pinnedChecksum) {
  fail(
    `checksum mismatch for ${path}: expected ${pinnedChecksum}, got ${actualChecksum}. If this file was intentionally replaced, set SHIPPING_FACTS_CHECKSUM_SHA256 to match.`,
  )
}

try {
  JSON.parse(raw.toString('utf8'))
} catch (err) {
  fail(`${path} is not valid JSON: ${err.message}`)
}

console.log(`[verify-shipping-registry] OK — ${path} present and checksum-verified.`)
