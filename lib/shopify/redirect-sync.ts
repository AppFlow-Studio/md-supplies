// Pure transform logic for regenerating docs/redirects-ready.json from
// Shopify's live URL Redirect list (scripts/sync-redirects.ts). Kept
// free of 'server-only' / network code so it can be unit tested without
// mocking fetch — see lib/shopify/__tests__/redirect-sync.test.ts.
//
// Why this exists at all: the 2026-09-15 incident (Bilal → izzy Slack thread)
// was caused by docs/redirects-ready.json being a hand-compiled snapshot
// frozen since June — every Shopify consolidation after that point created a
// real Shopify URL Redirect that the headless site never picked up, because
// nothing kept the file in sync. Shopify is the merchant-facing tool ops
// actually uses (Izzy/Sardor create redirects there when they merge/retire a
// product), so it is the source of truth; this file exists to make
// regenerating the local snapshot from it a mechanical, reviewable step
// instead of a manual "diff the two lists by hand" exercise.

export type RawRedirect = { from: string; to: string }

// Only `/products/<handle>` → `/products/<handle>` rows belong in this file.
// proxy.ts's PRODUCT_REDIRECTS map is built from exactly this shape (it
// rewrites the plural `to` to the singular live route — see proxy.ts's
// header comment). Every other Shopify URL Redirect shape (a collection
// redirect, a page redirect, an arbitrary external target, etc.) is either
// already covered by proxy.ts's hand-written REDIRECT_ENTRIES or is out of
// scope for the bulk product table, so it is reported separately rather than
// silently folded in or silently dropped.
const PRODUCT_PATH = /^\/products\/[^/?#]+$/

export function isProductShapeRedirect(row: RawRedirect): boolean {
  return PRODUCT_PATH.test(row.from) && PRODUCT_PATH.test(row.to)
}

export type ChainResolution = {
  resolved: RawRedirect[]
  /** `from` keys whose chain never terminated within MAX_HOPS — a real cycle
      (A -> B -> A) or a pathological chain length, either of which needs a
      human look rather than a silently-wrong single-hop guess. */
  unresolvedCycles: string[]
}

const MAX_HOPS = 10

/**
 * Shopify redirects can chain (retiring product B, which product A already
 * redirects to, creates A -> B -> C without touching A's row). proxy.ts's
 * invariant is single-hop only (see its header comment and the "no chains"
 * tests in __tests__/proxy.test.ts), so every chain is walked here to its
 * final live target before the file is written — exactly the by-hand fix the
 * 2026-09-15 commit applied to 36 rows, generalized so it never needs doing
 * by hand again.
 */
export function resolveRedirectChains(rows: RawRedirect[]): ChainResolution {
  const byFrom = new Map(rows.map((r) => [r.from, r.to]))
  const resolved: RawRedirect[] = []
  const unresolvedCycles: string[] = []

  for (const { from } of rows) {
    const seen = new Set<string>([from])
    let target = byFrom.get(from)!
    let hops = 0
    while (byFrom.has(target) && hops < MAX_HOPS) {
      if (seen.has(target)) {
        unresolvedCycles.push(from)
        target = byFrom.get(from)! // fall back to the direct (still-wrong) hop; caller must not write this
        break
      }
      seen.add(target)
      target = byFrom.get(target)!
      hops++
    }
    resolved.push({ from, to: target })
  }

  return { resolved, unresolvedCycles }
}

export type RedirectDiff = {
  added: RawRedirect[]
  removed: RawRedirect[]
  changed: { from: string; oldTo: string; newTo: string }[]
  unchanged: number
}

export function diffRedirects(previous: RawRedirect[], next: RawRedirect[]): RedirectDiff {
  const prevByFrom = new Map(previous.map((r) => [r.from, r.to]))
  const nextByFrom = new Map(next.map((r) => [r.from, r.to]))

  const added: RawRedirect[] = []
  const changed: { from: string; oldTo: string; newTo: string }[] = []
  let unchanged = 0

  for (const [from, to] of nextByFrom) {
    const oldTo = prevByFrom.get(from)
    if (oldTo === undefined) added.push({ from, to })
    else if (oldTo !== to) changed.push({ from, oldTo, newTo: to })
    else unchanged++
  }

  const removed = previous.filter((r) => !nextByFrom.has(r.from))

  return { added, removed, changed, unchanged }
}

export function sortRedirects(rows: RawRedirect[]): RawRedirect[] {
  return [...rows].sort((a, b) => a.from.localeCompare(b.from))
}
