import { describe, it, expect, vi, beforeEach } from 'vitest'

const send = vi.fn()

vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send } }),
  FROM_EMAIL: 'noreply@test.com',
  TO_EMAIL: 'team@test.com',
  SOURCING_TO_EMAIL: 'sourcing@test.com',
}))

import { POST } from '@/app/api/sourcing/route'
import { FACILITY_TYPES } from '@/lib/forms/schema'

const HOST = 'shop.example.com'

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://${HOST}/api/sourcing`, {
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
  phone: '+1 (555) 000-0000',
  facultyType: FACILITY_TYPES[0],
}

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ data: { id: 'email_123' }, error: null })
})

describe('POST /api/sourcing', () => {
  it('sends and returns 200 on a valid payload', async () => {
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('delivers to the dedicated sourcing inbox', async () => {
    await POST(post(valid))
    expect(send.mock.calls[0][0].to).toBe('sourcing@test.com')
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
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 413 on an oversize body', async () => {
    const res = await POST(post({ ...valid, name: 'a'.repeat(20_000) }))
    expect(res.status).toBe(413)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 with field errors on an invalid email', async () => {
    const res = await POST(post({ ...valid, email: 'nope' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fields.email).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 on unknown fields', async () => {
    const res = await POST(post({ ...valid, role: 'admin' }))
    expect(res.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when the honeypot is filled', async () => {
    const res = await POST(post({ ...valid, website: 'http://spam' }))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 502 when Resend fails', async () => {
    send.mockRejectedValue(new Error('resend 500'))
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
  })

  it('does not leak CRLF header injection into the email subject', async () => {
    await POST(post({ ...valid, name: 'Jane\r\nBcc: evil@x.com' }))
    expect(send).toHaveBeenCalledOnce()
    const arg = send.mock.calls[0][0]
    expect(arg.subject).not.toMatch(/[\r\n]/)
  })
})
