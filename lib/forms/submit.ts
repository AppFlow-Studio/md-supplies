import { track } from '@/lib/analytics/track'
import type { AnalyticsEvent } from '@/lib/analytics/events'

/**
 * Client-side form submission with a hard guarantee: success — and the
 * `form_submit` analytics event — are reported ONLY when the server confirms
 * delivery with a 2xx. This is the fix for the false-success bug (DEV-21): the
 * UI must never show success on a 500.
 *
 * The analytics event passed in must contain non-PII fields only (the caller is
 * responsible for not putting name/email/phone/message into it).
 */

export type SubmitResult =
  | { ok: true }
  | { ok: false; fields?: Record<string, string>; error?: string }

export async function submitForm(opts: {
  url: string
  payload: unknown
  analyticsEvent?: AnalyticsEvent
}): Promise<SubmitResult> {
  let res: Response
  try {
    res = await fetch(opts.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts.payload),
    })
  } catch {
    return { ok: false, error: 'network' }
  }

  if (!res.ok) {
    let fields: Record<string, string> | undefined
    let error: string | undefined
    try {
      const body = await res.json()
      fields = body?.fields
      error = body?.error
    } catch {
      // Non-JSON error body — fall through with a generic error.
    }
    return { ok: false, fields, error }
  }

  if (opts.analyticsEvent) track(opts.analyticsEvent)
  return { ok: true }
}
