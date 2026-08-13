import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    shopifyStoreDomain: 'test.myshopify.com',
    shopifyAdminClientId: 'client-id',
    shopifyAdminClientSecret: 'client-secret',
  },
}))

import { getAdminAccessToken, __resetAdminTokenCacheForTests } from '../admin-token'

function tokenResponse(accessToken: string, expiresIn: number) {
  return {
    ok: true,
    text: async () => '',
    json: async () => ({ access_token: accessToken, expires_in: expiresIn }),
  }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  __resetAdminTokenCacheForTests()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getAdminAccessToken', () => {
  it('exchanges client credentials for an access token against the configured shop', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse('shpua_abc', 3600))
    vi.stubGlobal('fetch', fetchMock)

    const token = await getAdminAccessToken()

    expect(token).toBe('shpua_abc')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://test.myshopify.com/admin/oauth/access_token')
    const body = new URLSearchParams(init.body as string)
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('client_id')).toBe('client-id')
    expect(body.get('client_secret')).toBe('client-secret')
  })

  it('reuses a cached token instead of re-exchanging while it is still valid', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse('shpua_abc', 3600))
    vi.stubGlobal('fetch', fetchMock)

    await getAdminAccessToken()
    const second = await getAdminAccessToken()

    expect(second).toBe('shpua_abc')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('re-exchanges once the cached token is within the expiry safety margin', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('shpua_first', 3600))
      .mockResolvedValueOnce(tokenResponse('shpua_second', 3600))
    vi.stubGlobal('fetch', fetchMock)

    await getAdminAccessToken()
    // 3600s expiry, 60s safety margin -> considered stale at +3541s
    vi.advanceTimersByTime(3541_000)
    const second = await getAdminAccessToken()

    expect(second).toBe('shpua_second')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares one in-flight exchange across concurrent callers', async () => {
    let resolveFetch!: (v: unknown) => void
    const pending = new Promise((resolve) => {
      resolveFetch = resolve
    })
    const fetchMock = vi.fn().mockReturnValueOnce(pending)
    vi.stubGlobal('fetch', fetchMock)

    const first = getAdminAccessToken()
    const second = getAdminAccessToken()
    resolveFetch(tokenResponse('shpua_shared', 3600))

    expect(await first).toBe('shpua_shared')
    expect(await second).toBe('shpua_shared')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not cache a failed exchange, so a retry can succeed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'bad creds',
      })
      .mockResolvedValueOnce(tokenResponse('shpua_retry', 3600))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAdminAccessToken()).rejects.toThrow(/client_credentials exchange failed/)
    await expect(getAdminAccessToken()).resolves.toBe('shpua_retry')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
