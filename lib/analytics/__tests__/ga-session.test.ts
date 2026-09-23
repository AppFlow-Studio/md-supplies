import { describe, it, expect } from 'vitest'
import {
  sessionFromGaCookie,
  parseCookieHeader,
  readGaIdentifiers,
} from '@/lib/analytics/clientId'

describe('sessionFromGaCookie', () => {
  it('reads session id and number from a real _ga_<id> value', () => {
    expect(sessionFromGaCookie('GS1.1.1700000000.3.1.1700000060.0.0.0')).toEqual({
      sessionId: '1700000000',
      sessionNumber: '3',
    })
  })

  it('accepts the GS2 $-delimited format GA4 also ships', () => {
    // GS2 packs the fields rather than using dot positions; `s` is the session
    // id and `o` the session number.
    expect(sessionFromGaCookie('GS2.1.s1700000000$o5$g1$t1700000060$j0$l0$h0')).toEqual({
      sessionId: '1700000000',
      sessionNumber: '5',
    })
  })

  it('defaults the GS2 session number when that field is absent', () => {
    expect(sessionFromGaCookie('GS2.1.s1700000000$g1')?.sessionNumber).toBe('1')
  })

  it.each(['', 'GS1.1', 'nonsense', 'XX1.1.123.4'])('rejects %j', (value) => {
    expect(sessionFromGaCookie(value)).toBeNull()
  })
})

describe('parseCookieHeader', () => {
  it('splits a document.cookie string and decodes values', () => {
    expect(parseCookieHeader('_ga=GA1.1.99.88; _ga_ABC=GS1.1.7.2.1')).toEqual({
      _ga: 'GA1.1.99.88',
      _ga_ABC: 'GS1.1.7.2.1',
    })
  })

  it('ignores malformed fragments without throwing', () => {
    expect(parseCookieHeader('; =novalue; good=1')).toEqual({ good: '1' })
  })
})

describe('readGaIdentifiers', () => {
  it('finds the session cookie without knowing the measurement ID', () => {
    // The measurement ID lives in the GTM container, not in this repo, so the
    // _ga_<ID> cookie name cannot be constructed — it has to be discovered.
    const jar = parseCookieHeader('_ga=GA1.1.555.666; _ga_G8Q2ZZ=GS1.1.1700000000.4.1.0')
    expect(readGaIdentifiers(jar)).toEqual({
      clientId: '555.666',
      session: { sessionId: '1700000000', sessionNumber: '4' },
    })
  })

  it('reports nulls rather than throwing when GA has not set its cookies', () => {
    expect(readGaIdentifiers({ cart_id: 'x' })).toEqual({ clientId: null, session: null })
  })

  it('skips an unparseable _ga_ cookie and keeps looking', () => {
    const jar = parseCookieHeader('_ga_BAD=garbage; _ga_GOOD=GS1.1.42.9.1')
    expect(readGaIdentifiers(jar).session?.sessionId).toBe('42')
  })
})
