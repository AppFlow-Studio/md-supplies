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
