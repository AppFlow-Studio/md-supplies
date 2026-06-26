import { sendGTMEvent } from '@next/third-parties/google'
import type { AnalyticsEvent } from './events'

export function track(event: AnalyticsEvent): void {
  sendGTMEvent(event as Record<string, unknown>)
}
