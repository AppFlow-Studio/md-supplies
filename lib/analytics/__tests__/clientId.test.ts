import { describe, it, expect } from 'vitest'
import { clientIdFromGaCookie } from '../clientId'

describe('clientIdFromGaCookie', () => {
  it('extracts the client_id from a standard _ga cookie value', () => {
    expect(clientIdFromGaCookie('GA1.1.1234567890.1700000000')).toBe('1234567890.1700000000')
  })

  it('handles a different version/depth prefix', () => {
    expect(clientIdFromGaCookie('GA1.2.987654321.1699999999')).toBe('987654321.1699999999')
  })

  it('returns null for an empty string', () => {
    expect(clientIdFromGaCookie('')).toBeNull()
  })

  it('returns null when the value has too few segments', () => {
    expect(clientIdFromGaCookie('GA1.1')).toBeNull()
  })
})
