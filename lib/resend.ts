import { Resend } from 'resend'
import { serverEnv } from '@/lib/env.server'

export const FROM_EMAIL = serverEnv.resendFromEmail
export const TO_EMAIL   = serverEnv.resendToEmail

/**
 * Sourcing requests go to a dedicated inbox when configured, falling back to the
 * shared contact inbox so a lead is never dropped if the var is unset (DEV-22).
 */
export const SOURCING_TO_EMAIL = process.env.RESEND_SOURCING_TO_EMAIL ?? TO_EMAIL

let client: Resend | null = null

export function getResend(): Resend {
  if (!client) {
    client = new Resend(serverEnv.resendApiKey)
  }
  return client
}
