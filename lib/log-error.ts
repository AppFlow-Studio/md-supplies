import 'server-only'

// Wall-clock timestamp for a log line, sourced from `performance` rather than
// `new Date()`/`Date.now()`.
//
// Under cacheComponents, Next extends the `Date` class so that reading the
// clock during a prerender (`new Date()` / `Date.now()`) is treated as
// uncached IO and ABORTS the prerender — which is what broke the newly-static
// /category/[slug] build the moment its render logged a diagnostic (the
// success log fires on every prerender). `performance` is deliberately left
// unextended by Next ("reserve `Date` for output, `performance` for
// introspection" — node-environment-extensions/date.js), so
// `performance.timeOrigin + performance.now()` gives a real epoch-ms reading
// that the prerender guard ignores, and `new Date(ms)` with an explicit
// argument is likewise unguarded. Result: identical ISO output, no prerender
// abort, no forced dynamic — these logs stay side-effects, never data.
function logTimestamp(): string {
  return new Date(performance.timeOrigin + performance.now()).toISOString()
}

export function logServerError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  console.error(JSON.stringify({
    level: 'error',
    context,
    message,
    ts: logTimestamp(),
  }))
}

/**
 * Structured diagnostic for a category-page render, distinguishing WHY a page
 * came back empty/degraded (item 8/9 of the nav-remediation ticket): a
 * legitimate empty collection is not the same failure as an invalid handle,
 * a Storefront error, or a subcategory-scan failure that only lost the
 * footer list. Never includes stack traces or internal error text — this is
 * a customer-facing-route diagnostic, not an error dump.
 */
export type CategoryDiagnosticOutcome =
  | 'ok'
  | 'collection_missing'
  | 'fetch_error'
  | 'subcategory_scan_failed'

export function logCategoryEvent(event: {
  route: string
  handle: string
  outcome: CategoryDiagnosticOutcome
  productCount?: number
}): void {
  console.log(JSON.stringify({
    level: event.outcome === 'ok' ? 'info' : 'warn',
    context: 'category-page',
    ...event,
    ts: logTimestamp(),
  }))
}
