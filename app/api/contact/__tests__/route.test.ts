import { describe, it, expect, vi, beforeEach } from 'vitest'

const send = vi.fn()

vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send } }),
  FROM_EMAIL: 'noreply@test.com',
  TO_EMAIL: 'team@test.com',
  SOURCING_TO_EMAIL: 'sourcing@test.com',
}))

import { POST } from '@/app/api/contact/route'
import { SUBJECTS } from '@/lib/forms/schema'

const HOST = 'shop.example.com'

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://${HOST}/api/contact`, {
    method: 'POST',
    headers: {
      host: HOST,
      origin: `https://${HOST}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = {
  name: 'Dr. Jane Smith',
  email: 'jane@clinic.com',
  subject: SUBJECTS[0],
  message: 'I have a question about pricing.',
}

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ data: { id: 'email_123' }, error: null })
})

describe('POST /api/contact', () => {
  it('sends and returns 200 on a valid payload', async () => {
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('delivers to the contact inbox', async () => {
    await POST(post(valid))
    expect(send.mock.calls[0][0].to).toBe('team@test.com')
  })

  it('returns 502 when Resend responds with an error object (no swallowing)', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'application_error', message: 'boom', statusCode: 500 },
    })
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
  })

  it('returns 403 on a cross-origin request', async () => {
    const res = await POST(post(valid, { origin: 'https://evil.net' }))
    expect(res.status).toBe(403)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(post('{not json'))
    expect(res.status).toBe(400)
  })

  it('returns 413 on an oversize body', async () => {
    const res = await POST(post({ ...valid, message: 'a'.repeat(20_000) }))
    expect(res.status).toBe(413)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 with field errors on a missing message', async () => {
    const res = await POST(post({ ...valid, message: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fields.message).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when the honeypot is filled', async () => {
    const res = await POST(post({ ...valid, website: 'x' }))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 502 when Resend fails', async () => {
    send.mockRejectedValue(new Error('resend 500'))
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
  })
})
