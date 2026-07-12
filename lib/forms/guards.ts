import type { ZodError } from 'zod'

/**
 * Stateless request-hardening helpers shared by the form route handlers.
 *
 * The durable, per-IP rate limit lives at the Vercel WAF layer (see the DEV-21
 * design doc). These guards are cheap, in-process defense-in-depth: origin
 * pinning, a body-size cap, header-injection sanitization, and validation-error
 * flattening for the client.
 */

const DEFAULT_MAX_BYTES = 16_384 // 16 KB — generous for a contact form, hostile to abuse.

type Allowed = { ok: true } | { ok: false; status: 403 }

function hostOf(value: string | null): string | null {
  if (!value) return null
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

/**
 * Reject cross-origin POSTs. Compares the host of the `Origin` header (falling
 * back to `Referer`) against the request `Host` and, if set, the configured
 * site origin. A request with neither Origin nor Referer is rejected — modern
 * browsers always send at least one on a fetch POST.
 */
export function assertAllowedOrigin(req: Request): Allowed {
  const requestHost = req.headers.get('host')
  const siteHost = hostOf(process.env.NEXT_PUBLIC_SITE_URL ?? null)
  const allowedHosts = new Set([requestHost, siteHost].filter(Boolean) as string[])

  const claimedHost =
    hostOf(req.headers.get('origin')) ?? hostOf(req.headers.get('referer'))

  if (!claimedHost) return { ok: false, status: 403 }
  if (!allowedHosts.has(claimedHost)) return { ok: false, status: 403 }
  return { ok: true }
}

/**
 * Origin check for GET endpoints (predictive search). Browsers omit `Origin`
 * on same-origin GET fetches and may strip `Referer`, so — unlike
 * `assertAllowedOrigin` — absence is allowed; only a *present, foreign*
 * Origin/Referer is rejected. This blocks cross-site scripted abuse from
 * browsers while never breaking legitimate same-origin users.
 */
export function assertNoForeignOrigin(req: Request): Allowed {
  const requestHost = req.headers.get('host')
  const siteHost = hostOf(process.env.NEXT_PUBLIC_SITE_URL ?? null)
  const allowedHosts = new Set([requestHost, siteHost].filter(Boolean) as string[])

  const claimedHost =
    hostOf(req.headers.get('origin')) ?? hostOf(req.headers.get('referer'))

  if (claimedHost && !allowedHosts.has(claimedHost)) return { ok: false, status: 403 }
  return { ok: true }
}

type BoundedResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 413 | 400 }

/**
 * Read and JSON-parse a request body while enforcing a hard byte cap. Guards
 * against both an honest large `Content-Length` and a missing/lying one (the
 * cap is re-checked while streaming). Malformed JSON yields 400; oversize 413.
 */
export async function readJsonBounded(
  req: Request,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<BoundedResult> {
  const declared = req.headers.get('content-length')
  if (declared && Number(declared) > maxBytes) {
    return { ok: false, status: 413 }
  }

  const raw = await req.text()
  // Byte length, not string length — multibyte chars must count fully.
  if (new TextEncoder().encode(raw).length > maxBytes) {
    return { ok: false, status: 413 }
  }

  try {
    return { ok: true, data: JSON.parse(raw) }
  } catch {
    return { ok: false, status: 400 }
  }
}

/**
 * True when the hidden `website` honeypot was filled in — a strong bot signal.
 * Checked on the raw body before schema validation so the route can drop the
 * submission silently (return 200) instead of leaking a 400.
 */
export function isHoneypotFilled(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const website = (data as Record<string, unknown>).website
  return typeof website === 'string' && website.length > 0
}

/**
 * Strip CR/LF so user input interpolated into an email subject or `replyTo`
 * cannot inject additional headers.
 */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, '')
}

/**
 * Flatten a ZodError to the first message per top-level field, for the client
 * to render inline next to each input.
 */
export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in out)) {
      out[key] = issue.message
    }
  }
  return out
}
