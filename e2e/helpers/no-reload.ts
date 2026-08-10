import type { Page } from '@playwright/test'

/**
 * Shared proof that a catalog interaction never causes a browser DOCUMENT
 * load. Originally inline in e2e/no-reload.spec.ts (Phase 12); factored out
 * so DEV-LAUNCH-06's filter/sort/pagination specs can reuse the exact same
 * technique instead of duplicating it.
 *
 * Technique: stamp a value on `window` after first load. A real document
 * navigation wipes it. If it survives every interaction, the App Router
 * updated in place.
 */
export async function stampWindow(page: Page) {
  await page.evaluate(() => {
    ;(window as unknown as Record<string, unknown>).__noReloadSentinel = 'alive'
  })
}

export async function sentinelSurvived(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as Record<string, unknown>).__noReloadSentinel === 'alive',
  )
}

/** Counts real document requests (not RSC/fetch/XHR) after instrumentation. */
export function trackDocumentLoads(page: Page): { count: () => number } {
  let documentLoads = 0
  page.on('request', (req) => {
    if (req.resourceType() === 'document' && req.isNavigationRequest()) documentLoads++
  })
  return { count: () => documentLoads }
}
