import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { WholesalePricing } from '../WholesalePricing'
import { FACILITY_TYPES } from '@/lib/forms/schema'

const track = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (e: unknown) => track(e) }))

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(cleanup)
beforeEach(() => {
  track.mockReset()
  vi.restoreAllMocks()
})

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Faculty Name/i), { target: { value: 'Dr. Jane Smith' } })
  fireEvent.change(screen.getByLabelText(/Your Email/i), { target: { value: 'jane@clinic.com' } })
  fireEvent.change(screen.getByLabelText(/Select Faculty Type/i), {
    target: { value: FACILITY_TYPES[0] },
  })
}

describe('WholesalePricing', () => {
  it("shows the server's error message when the API rejects the submission", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(403, {
          error: 'This form is only available to customers in the United States and Canada.',
        }),
      ),
    )

    render(<WholesalePricing />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT APPLICATION/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This form is only available to customers in the United States and Canada.',
      ),
    )
    expect(track).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the server gives no error text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(502, {})))

    render(<WholesalePricing />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT APPLICATION/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again or email us directly.',
      ),
    )
  })

  it('sends elapsedMs based on time since mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    render(<WholesalePricing />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT APPLICATION/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(typeof body.elapsedMs).toBe('number')
  })
})
