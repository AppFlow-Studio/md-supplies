import { describe, it, expect, vi, beforeEach } from 'vitest'

const send = vi.fn()

vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send } }),
  FROM_EMAIL: 'noreply@test.com',
}))

import { sendFormEmail } from '@/lib/forms/email'

const base = {
  to: 'inbox@test.com',
  replyTo: 'submitter@clinic.com',
  subject: '[Contact] Hello',
  text: 'body',
  formName: 'contact',
}

beforeEach(() => {
  send.mockReset()
  vi.restoreAllMocks()
})

describe('sendFormEmail', () => {
  it('returns ok with the message id on a successful send', async () => {
    send.mockResolvedValue({ data: { id: 'email_123' }, error: null })
    const result = await sendFormEmail(base)
    expect(result.ok).toBe(true)
    expect(result.id).toBe('email_123')
  })

  it('sends to the configured "to" address with from + replyTo', async () => {
    send.mockResolvedValue({ data: { id: 'x' }, error: null })
    await sendFormEmail(base)
    expect(send).toHaveBeenCalledOnce()
    const arg = send.mock.calls[0][0]
    expect(arg.to).toBe('inbox@test.com')
    expect(arg.from).toBe('noreply@test.com')
    expect(arg.replyTo).toBe('submitter@clinic.com')
  })

  it('returns failure (no swallowing) when Resend returns an error object', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'slow down', statusCode: 429 },
    })
    const result = await sendFormEmail(base)
    expect(result.ok).toBe(false)
  })

  it('returns failure when Resend throws', async () => {
    send.mockRejectedValue(new Error('network down'))
    const result = await sendFormEmail(base)
    expect(result.ok).toBe(false)
  })

  it('never logs PII (the subject) on failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockResolvedValue({
      data: null,
      error: { name: 'application_error', message: 'boom', statusCode: 500 },
    })
    await sendFormEmail({ ...base, subject: '[Sourcing] Pharmacy — Dr. Jane Smith' })
    for (const call of errorSpy.mock.calls) {
      const serialized = JSON.stringify(call)
      expect(serialized).not.toContain('Dr. Jane Smith')
    }
  })
})
