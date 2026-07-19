import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scanRxDocument, isScanRequired } from '../rx-scan'

const BODY = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer // %PDF

function textResponse(status: number, text: string) {
  return { ok: status < 400, status, text: async () => text }
}

beforeEach(() => {
  vi.stubEnv('RX_SCAN_CLAMAV_URL', 'https://clamav.internal/api/v1/scan')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('scanRxDocument', () => {
  it('is skipped (not an error) when no scanner is configured', async () => {
    vi.stubEnv('RX_SCAN_CLAMAV_URL', '')
    expect(await scanRxDocument(BODY, 'f.pdf')).toEqual({ status: 'skipped' })
  })

  it('posts the file and reports clean for a clamav-rest-api clean result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      textResponse(200, JSON.stringify({ data: { result: [{ is_infected: false, viruses: [] }] } })),
    )
    vi.stubGlobal('fetch', fetchMock)
    expect(await scanRxDocument(BODY, 'f.pdf')).toEqual({ status: 'clean' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://clamav.internal/api/v1/scan')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('reports infected with the signature name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      textResponse(200, JSON.stringify({
        data: { result: [{ is_infected: true, viruses: ['Eicar-Signature'] }] },
      })),
    ))
    expect(await scanRxDocument(BODY, 'f.pdf')).toEqual({
      status: 'infected',
      signature: 'Eicar-Signature',
    })
  })

  it('understands the plain-text clamav-rest contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(200, 'Everything ok : true\n')))
    expect(await scanRxDocument(BODY, 'f.pdf')).toEqual({ status: 'clean' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(200, 'stream: Eicar-Signature FOUND\n')))
    expect((await scanRxDocument(BODY, 'f.pdf')).status).toBe('infected')
  })

  it('sends the bearer token when configured', async () => {
    vi.stubEnv('RX_SCAN_AUTH_TOKEN', 'scan-secret')
    const fetchMock = vi.fn().mockResolvedValue(textResponse(200, 'OK'))
    vi.stubGlobal('fetch', fetchMock)
    await scanRxDocument(BODY, 'f.pdf')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer scan-secret' })
  })

  it('treats network failures, HTTP errors, and garbage responses as errors — never clean', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    expect((await scanRxDocument(BODY, 'f.pdf')).status).toBe('error')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(500, 'boom')))
    expect((await scanRxDocument(BODY, 'f.pdf')).status).toBe('error')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(200, '<html>login page</html>')))
    expect((await scanRxDocument(BODY, 'f.pdf')).status).toBe('error')
  })
})

describe('isScanRequired', () => {
  it("is true only when RX_SCAN_REQUIRED is exactly 'true'", () => {
    vi.stubEnv('RX_SCAN_REQUIRED', 'true')
    expect(isScanRequired()).toBe(true)
    vi.stubEnv('RX_SCAN_REQUIRED', '')
    expect(isScanRequired()).toBe(false)
  })
})
