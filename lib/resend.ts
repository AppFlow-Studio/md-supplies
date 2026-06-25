import { Resend } from 'resend'

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@mdsupplies.com'
export const TO_EMAIL   = process.env.RESEND_TO_EMAIL   ?? 'team@mdsupplies.com'

/**
 * Sourcing requests go to a dedicated inbox when configured, falling back to the
 * shared contact inbox so a lead is never dropped if the var is unset (DEV-22).
 */
export const SOURCING_TO_EMAIL = process.env.RESEND_SOURCING_TO_EMAIL ?? TO_EMAIL

let client: Resend | null = null

/**
 * Lazily construct the Resend client.
 *
 * The key is read inside the handler rather than at import time so a missing
 * `RESEND_API_KEY` does not crash `next build` or preview deployments — it only
 * throws when an email is actually sent. Callers wrap sends in try/catch and
 * surface a 500, so a missing key degrades gracefully at runtime.
 */
export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set — add it to .env.local')
  }
  if (!client) {
    client = new Resend(apiKey)
  }
  return client
}
