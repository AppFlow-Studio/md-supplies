import type { Page } from '@playwright/test'

/**
 * The catalog result-count element (CategoryResults.tsx: `<p role="status"
 * aria-live="polite">`). NOT `page.getByRole('status')` — app/loading.tsx's
 * root route-loading fallback also uses `role="status"` (no aria-live), and
 * during a transient loading state (e.g. OCC's canonical collection not
 * resolving on the QA store) that locator resolves to the skeleton instead
 * and hangs waiting for text that never arrives.
 */
export function resultStatus(page: Page) {
  return page.locator('p[role="status"]')
}
