import 'server-only'

export function logServerError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  console.error(JSON.stringify({
    level: 'error',
    context,
    message,
    ts: new Date().toISOString(),
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
    ts: new Date().toISOString(),
  }))
}
