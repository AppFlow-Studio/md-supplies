import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('BUNNYCDN_STORAGE_ACCESS_KEY', 'bunny-key')

import {
  buildRxDocumentPath,
  customerFolderId,
  isOwnRxDocumentPath,
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
