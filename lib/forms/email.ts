import { getResend, FROM_EMAIL } from '@/lib/resend'

/**
 * Send a form email through Resend with explicit provider-failure handling.
 *
 * Resend's `emails.send()` resolves with `{ data, error }` and does NOT throw on
 * an API-level failure. The naive `await send()` therefore swallows provider
 * errors and reports success. This helper inspects `error` (and catches thrown
 * exceptions) so the caller can return a real failure to the client (DEV-22).
 *
 * Logging is PII-free: we log a generated request id plus the provider's
 * response metadata (status / error name / message id) — never the subject or
 * body, which contain the submitter's name and message.
 */
export async function sendFormEmail(opts: {
  to: string
  replyTo: string
  subject: string
  text: string
  formName: string
}): Promise<{ ok: boolean; id?: string }> {
  const requestId = crypto.randomUUID()

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
    })

    if (error) {
      console.error(`[${opts.formName}] email delivery failed`, {
        requestId,
        provider: error.name,
        statusCode: error.statusCode,
      })
      return { ok: false }
    }

    console.info(`[${opts.formName}] email delivered`, {
      requestId,
      messageId: data?.id,
    })
    return { ok: true, id: data?.id }
  } catch (err) {
    console.error(`[${opts.formName}] email send threw`, {
      requestId,
      error: (err as Error)?.name ?? 'Error',
    })
    return { ok: false }
  }
}
