import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/log-error', () => ({ logServerError: vi.fn() }))

import { submitUrlToIndexNow, INDEXNOW_KEY } from '../indexnow'
import { logServerError } from '@/lib/log-error'

describe('submitUrlToIndexNow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  })

  it('POSTs to the IndexNow endpoint with host, key, keyLocation, and the submitted URL', async () => {
    await submitUrlToIndexNow('https://mdsupplies.com/product/exam-gloves-3xl')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.indexnow.org/indexnow')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      host: 'mdsupplies.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://mdsupplies.com/${INDEXNOW_KEY}.txt`,
      urlList: ['https://mdsupplies.com/product/exam-gloves-3xl'],
    })
  })

  it('never throws when the fetch itself rejects (network failure)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    await expect(submitUrlToIndexNow('https://mdsupplies.com/product/x')).resolves.toBeUndefined()
    expect(logServerError).toHaveBeenCalledWith('indexnow-submit', expect.any(Error))
  })

  it('never throws when the endpoint responds with a non-OK status', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 })
    await expect(submitUrlToIndexNow('https://mdsupplies.com/product/x')).resolves.toBeUndefined()
    expect(logServerError).toHaveBeenCalled()
  })

  it('never logs the key itself, only the submitted URL and outcome', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 })
    await submitUrlToIndexNow('https://mdsupplies.com/product/x')
    const loggedArgs = (logServerError as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(JSON.stringify(loggedArgs)).not.toContain(INDEXNOW_KEY)
  })
})

// Final-review fix wave (Fix 3): local webhook testing tunnels SITE_URL
// through ngrok (docs/audits/2026-08-seo-remediation/FINAL-RESULTS-P1.md) —
// without a staging guard, a webhook fired during local testing would submit
// that tunnel's host to the LIVE IndexNow API under the site's real key.
// IS_STAGING (lib/site-config.ts) is the existing guard for this exact class
// of problem (lib/seo/robots-config.ts already uses it for the symmetric
// noindex-on-non-production case).
describe('submitUrlToIndexNow — environment guard (IS_STAGING)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  })

  it('does not call fetch when IS_STAGING is true', async () => {
    vi.doMock('@/lib/log-error', () => ({ logServerError: vi.fn() }))
    vi.doMock('@/lib/site-config', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/site-config')>()),
      IS_STAGING: true,
    }))
    const { submitUrlToIndexNow: submitStaging } = await import('../indexnow')

    await submitStaging('https://some-ngrok-tunnel.ngrok-free.app/product/x')

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('still calls fetch when IS_STAGING is false (production)', async () => {
    vi.doMock('@/lib/log-error', () => ({ logServerError: vi.fn() }))
    vi.doMock('@/lib/site-config', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/site-config')>()),
      IS_STAGING: false,
    }))
    const { submitUrlToIndexNow: submitProd } = await import('../indexnow')

    await submitProd('https://mdsupplies.com/product/x')

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
