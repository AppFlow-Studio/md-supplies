/**
 * Restrict a user-supplied redirect target to a same-origin absolute path.
 *
 * Concatenating an unvalidated `next` param onto the site origin is an open
 * redirect: `next=@evil.com` turns `https://site` into `https://site@evil.com`
 * (userinfo trick, host becomes evil.com), and `next=//evil.com` or
 * `next=/\evil.com` become protocol-relative URLs. Requiring exactly one
 * leading `/` — not followed by another `/` or `\` — rules out every
 * scheme/host-changing form.
 */
export function safeNextPath(next: string | null, fallback = '/account'): string {
  if (next && /^\/(?![/\\])/.test(next)) return next
  return fallback
}
