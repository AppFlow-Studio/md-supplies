import { sendGTMEvent } from '@next/third-parties/google'

export function track(event: Record<string, unknown>): void {
  sendGTMEvent(event)
}
