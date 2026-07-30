import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('BUNNYCDN_STORAGE_ACCESS_KEY', 'bunny-key')

import {
  buildRxDocumentPath,
  contentTypeForRxPath,
  customerFolderId,
  deleteRxDocument,
  isOwnRxDocumentPath,
  sniffRxContentType,
  RX_STORAGE_PREFIX,
  RX_ALLOWED_TYPES,
} from '../rx-storage'

const GID = 'gid://shopify/Customer/7412345'

describe('customerFolderId', () => {
  it('extracts the numeric id from the gid', () => {
    expect(customerFolderId(GID)).toBe('7412345')
  })
  it('rejects non-numeric tails (no path injection via forged gid)', () => {
    expect(() => customerFolderId('gid://shopify/Customer/../../etc')).toThrow()
    expect(() => customerFolderId('7412345/extra')).toThrow()
  })
})

describe('buildRxDocumentPath', () => {
  it('builds an unguessable path under the RX prefix in the owner folder', () => {
    const path = buildRxDocumentPath(GID, 'application/pdf')
    expect(path).toMatch(new RegExp(`^${RX_STORAGE_PREFIX}/7412345/[0-9a-f-]{36}\\.pdf$`))
  })
  it('rejects disallowed content types', () => {
    expect(() => buildRxDocumentPath(GID, 'image/svg+xml')).toThrow()
    expect(() => buildRxDocumentPath(GID, 'text/html')).toThrow()
  })
  it('allows exactly the approved types', () => {
    expect(Object.keys(RX_ALLOWED_TYPES).sort()).toEqual([
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    ])
  })
})

describe('isOwnRxDocumentPath', () => {
  it('accepts only paths inside the customer own folder', () => {
    expect(isOwnRxDocumentPath(`${RX_STORAGE_PREFIX}/7412345/a.pdf`, GID)).toBe(true)
    expect(isOwnRxDocumentPath(`${RX_STORAGE_PREFIX}/999/a.pdf`, GID)).toBe(false)
    expect(isOwnRxDocumentPath(`categories/x.webp`, GID)).toBe(false)
    // prefix trickery: folder must match exactly, not as a string prefix
    expect(isOwnRxDocumentPath(`${RX_STORAGE_PREFIX}/74123456/a.pdf`, GID)).toBe(false)
  })
})

function bytes(...values: (number | string)[]): ArrayBuffer {
  const out: number[] = []
  for (const v of values) {
    if (typeof v === 'string') out.push(...Array.from(v, (c) => c.charCodeAt(0)))
    else out.push(v)
  }
  return new Uint8Array(out).buffer
}

describe('sniffRxContentType (forged-MIME threat)', () => {
  it('detects the four allowed types by magic bytes', () => {
    expect(sniffRxContentType(bytes('%PDF-1.7 rest'))).toBe('application/pdf')
    expect(sniffRxContentType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe('image/jpeg')
    expect(sniffRxContentType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe('image/png')
    expect(sniffRxContentType(bytes('RIFF', 0x00, 0x00, 0x00, 0x00, 'WEBP'))).toBe('image/webp')
  })

  it('rejects HTML/script content regardless of the declared MIME type', () => {
    expect(sniffRxContentType(bytes('<html><script>alert(1)</script>'))).toBe(null)
    expect(sniffRxContentType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBe(null)
  })

  it('rejects empty and truncated payloads', () => {
    expect(sniffRxContentType(new ArrayBuffer(0))).toBe(null)
    expect(sniffRxContentType(bytes(0xff, 0xd8))).toBe(null)
    expect(sniffRxContentType(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBe(null)
  })
})

describe('contentTypeForRxPath', () => {
  it('derives the response type from the allowlisted extension only', () => {
    expect(contentTypeForRxPath('rx-documents/1/a.pdf')).toBe('application/pdf')
    expect(contentTypeForRxPath('rx-documents/1/a.jpg')).toBe('image/jpeg')
    expect(contentTypeForRxPath('rx-documents/1/a.png')).toBe('image/png')
    expect(contentTypeForRxPath('rx-documents/1/a.webp')).toBe('image/webp')
  })
  it('returns null for anything outside the allowlist', () => {
    expect(contentTypeForRxPath('rx-documents/1/a.svg')).toBe(null)
    expect(contentTypeForRxPath('rx-documents/1/a.html')).toBe(null)
    expect(contentTypeForRxPath('rx-documents/1/noext')).toBe(null)
  })
})

describe('deleteRxDocument', () => {
  it('issues an authenticated DELETE against the storage API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    expect(await deleteRxDocument('rx-documents/7412345/x.pdf')).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('rx-documents/7412345/x.pdf')
    expect(init.method).toBe('DELETE')
    expect(init.headers.AccessKey).toBeTruthy()
    vi.unstubAllGlobals()
  })

  it('returns false instead of throwing on failure (upload already succeeded)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await deleteRxDocument('rx-documents/7412345/x.pdf')).toBe(false)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await deleteRxDocument('rx-documents/7412345/x.pdf')).toBe(false)
    vi.unstubAllGlobals()
  })
})
