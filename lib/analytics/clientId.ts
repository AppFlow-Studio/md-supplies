/**
 * Readers for the two first-party cookies GA4's own JS writes, so the
 * storefront can hand GA4's identity across the headless → Shopify checkout
 * boundary (see shopify/web-pixel-purchase.js for the receiving end).
 *
 * Nothing here mints or stores an identifier of its own — these only parse
 * what gtag.js already set. No PII is involved: both values are opaque
 * pseudonymous counters.
 */

/**
 * Extract the GA4 client_id from a `_ga` cookie value.
 *
 * `_ga` looks like `GA1.<depth>.<clientId>` where clientId is itself two
 * dotted segments (`1234567890.1700000000`). The `GA1.<depth>.` prefix
 * varies, so we drop the first two segments and keep the rest.
 * Returns null when the value is missing or malformed.
 */
export function clientIdFromGaCookie(cookie: string): string | null {
  if (!cookie) return null
  const parts = cookie.split('.')
  if (parts.length < 4) return null
  return parts.slice(2).join('.')
}

export interface GaSession {
  sessionId: string
  sessionNumber: string
}

/**
 * Extract session_id + session_number from a `_ga_<CONTAINER>` cookie value.
 *
 * Format is `GS<v>.<depth>.<sessionId>.<sessionNumber>.<engaged>.<…>`, e.g.
 * `GS1.1.1700000000.3.1.1700000060.0.0.0`. GA4 has shipped both `GS1` and
 * `GS2` prefixes, so the prefix is matched loosely and position — not the
 * version — determines the fields.
 *
 * Why this matters (DEV-TRACK-01): the checkout pixel already forwarded
 * client_id, but a `purchase` sent with a client_id and NO session_id starts a
 * brand-new GA4 session whose source is unknown, i.e. `(direct)`. The revenue
 * then detaches from the campaign session that produced it in Traffic
 * Acquisition reporting. Forwarding session_id keeps the purchase inside the
 * same session as the `add_to_cart` that preceded it.
 */
export function sessionFromGaCookie(cookie: string): GaSession | null {
  if (!cookie) return null
  const parts = cookie.split('.')
  // Only 3 dot-segments are guaranteed: GS2 packs everything after the depth
  // into a single `$`-delimited segment, so a `< 4` guard here would reject
  // every GS2 cookie before it could be parsed.
  if (parts.length < 3) return null
  if (!/^GS\d+$/.test(parts[0])) return null

  // GS2 packs the fields into one `$`-delimited segment instead of using
  // positional dots: `GS2.1.s1700000000$o5$g1$t1700000060$j0$l0$h0`, where
  // `s` is the session id and `o` the session (ordinal) number. Detected by
  // shape rather than by the version prefix, since Google has shipped both
  // layouts and the prefix is not a reliable discriminator.
  if (parts[2].includes('$')) {
    const fields = new Map(
      parts[2].split('$').map((f) => [f[0], f.slice(1)] as const),
    )
    const sessionId = fields.get('s')
    const sessionNumber = fields.get('o')
    if (!sessionId || !/^\d+$/.test(sessionId)) return null
    return { sessionId, sessionNumber: sessionNumber && /^\d+$/.test(sessionNumber) ? sessionNumber : '1' }
  }

  // GS1: `GS1.<depth>.<sessionId>.<sessionNumber>.<engaged>.…`
  if (parts.length < 4) return null
  const [, , sessionId, sessionNumber] = parts
  if (!/^\d+$/.test(sessionId) || !/^\d+$/.test(sessionNumber)) return null
  return { sessionId, sessionNumber }
}

/** Name → value for every cookie in a `document.cookie` string. */
export function parseCookieHeader(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 1) continue
    const name = part.slice(0, eq).trim()
    if (!name) continue
    try {
      out[name] = decodeURIComponent(part.slice(eq + 1).trim())
    } catch {
      out[name] = part.slice(eq + 1).trim()
    }
  }
  return out
}

/**
 * Pulls GA4's client_id and session from a cookie jar.
 *
 * The session cookie's name embeds the GA4 measurement ID (`_ga_G-ABC123`),
 * which this repo does not know — the measurement ID lives in the GTM
 * container, outside Git. So the jar is scanned for any `_ga_*` key instead of
 * a name being constructed. With more than one GA4 property on the domain the
 * first parseable match wins; that is deliberate and documented rather than
 * guessed at, because there is no in-repo signal to choose between them.
 */
export function readGaIdentifiers(jar: Record<string, string>): {
  clientId: string | null
  session: GaSession | null
} {
  const clientId = jar['_ga'] ? clientIdFromGaCookie(jar['_ga']) : null
  let session: GaSession | null = null
  for (const [name, value] of Object.entries(jar)) {
    if (!name.startsWith('_ga_')) continue
    const parsed = sessionFromGaCookie(value)
    if (parsed) {
      session = parsed
      break
    }
  }
  return { clientId, session }
}
