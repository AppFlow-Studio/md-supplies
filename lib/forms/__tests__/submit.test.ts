import { describe, it, expect, vi, beforeEach } from 'vitest'

const track = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (e: unknown) => track(e) }))

import { submitForm } from '@/lib/forms/submit'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  track.mockReset()
  vi.restoreAllMocks()
})

describe('submitForm', () => {
  it('returns ok and fires the analytics event on a 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })))
    const event = { event: 'form_submit', form_name: 'contact' }

    const result = await submitForm({ url: '/api/contact', payload: {}, analyticsEvent: event })

    expect(result.ok).toBe(true)
    expect(track).toHaveBeenCalledWith(event)
  })

  it('does NOT fire analytics on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Email delivery failed' })),
    )

    const result = await submitForm({
      url: '/api/contact',
      payload: {},
      analyticsEvent: { event: 'form_submit', form_name: 'contact' },
    })

    expect(result.ok).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })

  it('surfaces field errors from a 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(400, { error: 'Validation failed', fields: { email: 'Enter a valid email' } }),
        ),
    )

    const result = await submitForm({ url: '/api/contact', payload: {} })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fields?.email).toBe('Enter a valid email')
    }
    expect(track).not.toHaveBeenCalled()
  })

  it('does NOT fire analytics on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const result = await submitForm({
      url: '/api/contact',
      payload: {},
      analyticsEvent: { event: 'form_submit', form_name: 'contact' },
    })

    expect(result.ok).toBe(false)
    expect(track).not.toHaveBeenCalled()
  })
})
