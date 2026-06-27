import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('logServerError', () => {
  it('logs a structured JSON object to console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logServerError } = await import('@/lib/log-error')
    logServerError('storefront', new Error('fetch failed'))
    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.context).toBe('storefront')
    expect(logged.message).toBe('fetch failed')
    expect(logged.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    spy.mockRestore()
  })

  it('handles non-Error values', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logServerError } = await import('@/lib/log-error')
    logServerError('cart', 'something bad')
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.message).toBe('something bad')
    spy.mockRestore()
  })

  it('does not log stack trace in output', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logServerError } = await import('@/lib/log-error')
    const err = new Error('oops')
    err.stack = 'Error: oops\n    at lib/shopify/storefront.ts:42'
    logServerError('storefront', err)
    const raw = spy.mock.calls[0][0]
    expect(raw).not.toContain('stack')
    expect(raw).not.toContain('storefront.ts')
    spy.mockRestore()
  })
})
