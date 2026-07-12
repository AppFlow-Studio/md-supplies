import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/log-error', () => ({ logServerError: vi.fn() }))

import { logServerError } from '@/lib/log-error'
import { POST } from '../route'

const mockLogServerError = vi.mocked(logServerError)

describe('POST /api/csp-report', () => {
  it('logs a well-formed violation report and returns 204', async () => {
    mockLogServerError.mockClear()
    const body = JSON.stringify({
      'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'inline' },
    })
    const req = new Request('http://localhost/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report' },
      body,
    })

    const res = await POST(req)

    expect(res.status).toBe(204)
    expect(mockLogServerError).toHaveBeenCalledWith('csp-violation', expect.any(Error))
  })

  it('still returns 204 on a malformed body (no retry storm)', async () => {
    mockLogServerError.mockClear()
    const req = new Request('http://localhost/api/csp-report', {
      method: 'POST',
      body: 'not json',
    })

    const res = await POST(req)

    expect(res.status).toBe(204)
    expect(mockLogServerError).not.toHaveBeenCalled()
  })
})
