import { sendGTMEvent } from '@next/third-parties/google'
import type { AnalyticsEvent } from './events'

/**
 * Single push point for every dataLayer event on the storefront.
 *
 * Why the `ecommerce: null` reset (DEV-TRACK-01): GTM does not REPLACE the
 * dataLayer model on push, it recursively MERGES into it — and it merges
 * arrays by index rather than swapping them. So a `view_item_list` carrying 24
 * items followed by a `select_item` carrying 1 leaves items[1..23] from the
 * list still sitting in the model, and the GA4 tag reads all 24. Google's own
 * ecommerce guide requires clearing the object first
 * (developers.google.com/tag-platform/tag-manager/ecommerce, "Clear the
 * ecommerce object"). Doing it here rather than at each of the ~8 call sites
 * means a new ecommerce event physically cannot forget it.
 *
 * Non-ecommerce events (page_view, form_submit, favorite_*) skip the reset —
 * pushing a null they never set would be noise.
 */
export function track(event: AnalyticsEvent): void {
  if ('ecommerce' in event) {
    sendGTMEvent({ ecommerce: null })
  }
  sendGTMEvent(event as Record<string, unknown>)
}
